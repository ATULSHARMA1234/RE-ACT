import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseSegmentIntent } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let filter = body.filter;

    // If a natural language query is provided instead of a structured filter
    if (body.query) {
      filter = await parseSegmentIntent(body.query);
    }

    if (!filter) {
      return NextResponse.json({ error: "No filter or query provided" }, { status: 400 });
    }

    const where: any = {};

    if (filter.lifecycle_stage && filter.lifecycle_stage.length > 0) {
      where.lifecycle_stage = { in: filter.lifecycle_stage };
    }
    if (filter.rfm_score && filter.rfm_score.length > 0) {
      where.rfm_score = { in: filter.rfm_score };
    }
    if (filter.channel_pref && filter.channel_pref.length > 0) {
      where.channel_pref = { in: filter.channel_pref };
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        orders: true,
      }
    });

    // In-memory filtering for aggregate constraints (since Prisma's support for complex aggregate filtering can be tricky)
    const filteredCustomers = customers.filter(c => {
      let pass = true;
      const orderCount = c.orders.length;
      const totalSpend = c.orders.reduce((sum, o) => sum + o.amount, 0);
      
      const lastOrder = c.orders.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      const daysSinceLastPurchase = lastOrder 
        ? Math.floor((new Date().getTime() - lastOrder.created_at.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      if (filter.min_orders !== undefined && orderCount < filter.min_orders) pass = false;
      if (filter.max_orders !== undefined && orderCount > filter.max_orders) pass = false;
      if (filter.min_spend !== undefined && totalSpend < filter.min_spend) pass = false;
      if (filter.max_spend !== undefined && totalSpend > filter.max_spend) pass = false;
      if (filter.min_days_since_purchase !== undefined) {
        if (daysSinceLastPurchase === null || daysSinceLastPurchase < filter.min_days_since_purchase) pass = false;
      }
      if (filter.max_days_since_purchase !== undefined) {
        if (daysSinceLastPurchase === null || daysSinceLastPurchase > filter.max_days_since_purchase) pass = false;
      }

      return pass;
    });

    return NextResponse.json({
      success: true,
      count: filteredCustomers.length,
      preview: filteredCustomers.slice(0, 10), // Return top 10 for preview
      appliedFilter: filter
    });

  } catch (error) {
    console.error("Segment evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate segment" },
      { status: 500 }
    );
  }
}
