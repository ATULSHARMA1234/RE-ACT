import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Find AT_RISK or DORMANT customers who are HIGH_VALUE or MID_TIER
    // These are the most important customers to re-engage
    const atRiskCustomers = await prisma.customer.findMany({
      where: {
        lifecycle_stage: { in: ["AT_RISK", "DORMANT"] },
        rfm_score: { in: ["HIGH_VALUE", "MID_TIER"] },
      },
      include: {
        orders: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: { created_at: true, amount: true },
        },
      },
      take: 10,
      orderBy: { updated_at: "desc" },
    });

    const now = new Date();

    const customers = atRiskCustomers.map(c => {
      const lastOrder = c.orders[0];
      const daysSinceLastOrder = lastOrder
        ? Math.floor((now.getTime() - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        lifecycle_stage: c.lifecycle_stage,
        rfm_score: c.rfm_score,
        totalSpend: 0, // will be calculated below
        daysSinceLastOrder,
      };
    });

    // Get total spend for each customer
    for (const cust of customers) {
      const result = await prisma.order.aggregate({
        where: { customer_id: cust.id },
        _sum: { amount: true },
      });
      cust.totalSpend = result._sum.amount || 0;
    }

    // Sort by totalSpend descending (highest LTV first)
    customers.sort((a, b) => b.totalSpend - a.totalSpend);

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Churn risk error:", error);
    return NextResponse.json({ customers: [] });
  }
}
