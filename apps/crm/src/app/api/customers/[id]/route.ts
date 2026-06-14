import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    let customerId = params.id;

    // For mock testing, if the ID is "mock", fetch any random customer
    if (customerId === "mock") {
      const randomCustomer = await prisma.customer.findFirst({
        orderBy: { created_at: "desc" },
      });
      if (randomCustomer) {
        customerId = randomCustomer.id;
      } else {
        return NextResponse.json({ error: "No customers found" }, { status: 404 });
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { created_at: "desc" },
          take: 5
        },
        communications: {
          include: {
            campaign: { select: { name: true } },
            events: true,
          },
          orderBy: { created_at: "desc" },
          take: 5
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculate aggregated metrics
    const allOrders = await prisma.order.findMany({
      where: { customer_id: customerId },
      select: { amount: true }
    });
    
    const lifetimeValue = allOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = allOrders.length;

    // Format recent activity
    const activity = [];
    for (const order of customer.orders) {
      activity.push({
        type: "ORDER",
        date: order.created_at,
        description: `Purchased ${order.product_name} (₹${order.amount.toFixed(2)})`,
        color: "brand-green"
      });
    }

    for (const comm of customer.communications) {
      activity.push({
        type: "COMMUNICATION",
        date: comm.created_at,
        description: `Received "${comm.campaign.name}" via ${customer.channel_pref}`,
        color: "brand-blue"
      });
      
      // Look for opens/clicks
      if (comm.events && comm.events.length > 0) {
        const opened = comm.events.find(e => e.event_type === "OPENED");
        if (opened) {
          activity.push({
            type: "EVENT",
            date: opened.received_at,
            description: `Opened "${comm.campaign.name}"`,
            color: "brand-blue"
          });
        }
      }
    }

    // Sort activity by date descending
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        lifetimeValue,
        totalOrders,
        recentActivity: activity.slice(0, 10)
      }
    });

  } catch (error) {
    console.error("Fetch Customer Error:", error);
    return NextResponse.json({ error: "Failed to fetch customer profile" }, { status: 500 });
  }
}
