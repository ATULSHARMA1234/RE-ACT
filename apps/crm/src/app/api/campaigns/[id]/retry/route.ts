import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/campaigns/[id]/retry
 * Retries delivery for all FAILED communications in a campaign.
 * Resets their status to PENDING and re-sends them to the channel stub.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const campaignId = params.id;

    // 1. Fetch the campaign and all its FAILED communications
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        communications: {
          where: { status: "FAILED" },
          include: {
            customer: { include: { orders: true } }
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const failedComms = campaign.communications;

    if (failedComms.length === 0) {
      return NextResponse.json({ success: true, message: "No failed communications to retry", retried: 0 });
    }

    // 2. Reset each failed communication to PENDING and clear failure timestamps
    await prisma.communication.updateMany({
      where: {
        campaign_id: campaignId,
        status: "FAILED"
      },
      data: {
        status: "PENDING",
        sent_at: null,
        delivered_at: null,
        opened_at: null,
        clicked_at: null,
        failed_at: null
      }
    });

    // 3. Delete old FAILED events for these communications so the idempotency check doesn't block new events
    await prisma.commEvent.deleteMany({
      where: {
        communication_id: { in: failedComms.map(c => c.id) }
      }
    });

    // 4. Build payload for the channel stub
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

    const payloadForStub = failedComms.map(comm => ({
      communication_id: comm.id,
      customer_id: comm.customer_id,
      campaign_id: campaignId,
      channel: campaign.channel,
      message: replaceTokens(campaign.message_template, comm.customer)
    }));

    // 5. Fire to channel stub
    const stubUrl = process.env.CHANNEL_STUB_URL || 'https://radiance-stub-atul.onrender.com';
    fetch(`${stubUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communications: payloadForStub })
    }).catch(err => console.error("Failed to call channel stub for retry:", err));

    return NextResponse.json({
      success: true,
      message: `Retrying ${failedComms.length} failed communications`,
      retried: failedComms.length
    });

  } catch (error: any) {
    console.error("Campaign retry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retry campaign" },
      { status: 500 }
    );
  }
}
