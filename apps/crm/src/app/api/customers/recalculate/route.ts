import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" }
    });

    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 400 });
    }

    // We must process in batches to prevent Out Of Memory crashes at high volumes (e.g. 500k)
    const BATCH_SIZE = 5000;
    let updatedCount = 0;
    let skip = 0;
    let hasMore = true;

    console.log("Starting massive RFM/Lifecycle recalculation engine...");

    while (hasMore) {
      const customers = await prisma.customer.findMany({
        take: BATCH_SIZE,
        skip: skip,
        include: {
          orders: true
        }
      });

      if (customers.length === 0) {
        hasMore = false;
        break;
      }

      const updates = [];

      for (const customer of customers) {
        const totalSpend = customer.orders.reduce((sum, order) => sum + order.amount, 0);
        const totalOrders = customer.orders.length;

        let newRfmScore = "LOW_VALUE";

        if (totalSpend >= settings.high_value_min_spend || totalOrders >= settings.high_value_min_orders) {
          newRfmScore = "HIGH_VALUE";
        } else if (totalSpend >= settings.mid_tier_min_spend || totalOrders >= settings.mid_tier_min_orders) {
          newRfmScore = "MID_TIER";
        }

        let newLifecycleStage = "NEW";
        if (totalOrders === 0) {
          newLifecycleStage = "NEW";
        } else {
          const mostRecentOrder = customer.orders.reduce((latest, current) => 
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          );
          const daysSinceLastPurchase = Math.floor((new Date().getTime() - new Date(mostRecentOrder.created_at).getTime()) / (1000 * 3600 * 24));

          if (daysSinceLastPurchase >= settings.dormant_days) {
            newLifecycleStage = "DORMANT";
          } else if (daysSinceLastPurchase >= settings.at_risk_days) {
            newLifecycleStage = "AT_RISK";
          } else if (totalOrders <= 1 && daysSinceLastPurchase < 14) {
            newLifecycleStage = "NEW";
          } else {
            newLifecycleStage = "ACTIVE";
          }
        }

        updates.push(
          prisma.customer.update({
            where: { id: customer.id },
            data: { 
              rfm_score: newRfmScore,
              lifecycle_stage: newLifecycleStage
            }
          })
        );
      }

      await prisma.$transaction(updates);
      updatedCount += customers.length;
      skip += BATCH_SIZE;
      
      console.log(`Recalculated ${updatedCount} customers...`);
    }

    console.log("Recalculation complete.");
    return NextResponse.json({ 
      success: true, 
      message: `Successfully recalculated RFM scores for ${updatedCount.toLocaleString()} customers.` 
    });

  } catch (error: any) {
    console.error("RFM Recalculation Error:", error);
    return NextResponse.json({ error: "Failed to recalculate RFM scores" }, { status: 500 });
  }
}
