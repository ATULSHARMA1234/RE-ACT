import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function replaceTokens(template: string, customer: any) {
  let msg = template.replace(/{{first_name}}/g, customer.name.split(' ')[0]);
  
  if (customer.orders && customer.orders.length > 0) {
    const lastOrder = customer.orders.sort((a: any, b: any) => b.created_at.getTime() - a.created_at.getTime())[0];
    msg = msg.replace(/{{last_product}}/g, lastOrder.product_name);
    
    const daysSince = Math.floor((new Date().getTime() - lastOrder.created_at.getTime()) / (1000 * 60 * 60 * 24));
    msg = msg.replace(/{{days_since_purchase}}/g, daysSince.toString());
  } else {
    msg = msg.replace(/{{last_product}}/g, "your last purchase");
    msg = msg.replace(/{{days_since_purchase}}/g, "awhile");
  }

  return msg;
}

export async function POST(req: Request) {
  try {
    const { name, segment_id, channel, message_template } = await req.json();

    if (!name || !segment_id || !channel || !message_template) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Segment and evaluate filter to get matching customers
    const segment = await prisma.segment.findUnique({ where: { id: segment_id } });
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    const filter: any = segment.filter_json;
    const where: any = {};
    if (filter.static_ids && filter.static_ids.length > 0) {
      where.id = { in: filter.static_ids };
    } else {
      if (filter.lifecycle_stage && filter.lifecycle_stage.length > 0) where.lifecycle_stage = { in: filter.lifecycle_stage };
      if (filter.rfm_score && filter.rfm_score.length > 0) where.rfm_score = { in: filter.rfm_score };
      if (filter.channel_pref && filter.channel_pref.length > 0) where.channel_pref = { in: filter.channel_pref };
    }
    // Simplified for MVP: rely on just these fields for DB filtering, use memory filtering for order aggregates
    
    const allCustomers = await prisma.customer.findMany({
      where,
      include: { orders: true }
    });

    const customers = allCustomers.filter(c => {
      let pass = true;
      const orderCount = c.orders.length;
      const totalSpend = c.orders.reduce((sum, o) => sum + o.amount, 0);
      const lastOrder = c.orders.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      const daysSince = lastOrder ? Math.floor((new Date().getTime() - lastOrder.created_at.getTime()) / (1000 * 60 * 60 * 24)) : null;

      if (filter.min_orders !== undefined && orderCount < filter.min_orders) pass = false;
      if (filter.max_orders !== undefined && orderCount > filter.max_orders) pass = false;
      if (filter.min_spend !== undefined && totalSpend < filter.min_spend) pass = false;
      if (filter.max_spend !== undefined && totalSpend > filter.max_spend) pass = false;
      if (filter.min_days_since_purchase !== undefined && (daysSince === null || daysSince < filter.min_days_since_purchase)) pass = false;
      if (filter.max_days_since_purchase !== undefined && (daysSince === null || daysSince > filter.max_days_since_purchase)) pass = false;

      return pass;
    });

    if (customers.length === 0) {
      return NextResponse.json({ error: "No customers match this segment" }, { status: 400 });
    }

    // 2. Create the Campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        segment_id,
        channel,
        message_template,
        status: "SENDING",
        sent_at: new Date(),
      }
    });

    // 3. Create Communication records for each matching customer
    const commRecords = await Promise.all(
      customers.map(c => 
        prisma.communication.create({
          data: {
            campaign_id: campaign.id,
            customer_id: c.id,
            status: "PENDING"
          }
        })
      )
    );

    // 4. Construct payload for channel-stub
    const payloadForStub = commRecords.map((comm, index) => {
      const customer = customers[index];
      return {
        communication_id: comm.id,
        customer_id: customer.id,
        campaign_id: campaign.id,
        channel,
        message: replaceTokens(message_template, customer)
      };
    });

    // 5. Fire async request to channel stub
    const stubUrl = process.env.CHANNEL_STUB_URL || 'https://radiance-stub-atul.onrender.com';
    
    try {
      const stubRes = await fetch(`${stubUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communications: payloadForStub })
      });

      if (stubRes.ok) {
        // Stub accepted the batch — mark campaign as SENT
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "SENT" }
        });
      } else {
        // Stub rejected or errored — keep as SENDING so it can be retried
        console.error(`Channel stub responded with ${stubRes.status}`);
      }
    } catch (err) {
      // Stub is unreachable — keep as SENDING 
      console.error("Failed to call channel stub:", err);
    }

    return NextResponse.json({ success: true, campaign_id: campaign.id, recipient_count: customers.length });

  } catch (error) {
    console.error("Campaign fire error:", error);
    return NextResponse.json(
      { error: "Failed to fire campaign" },
      { status: 500 }
    );
  }
}
