import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateAttributionInsight } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // We group orders by their attributed campaign's channel
    // Since prisma groupBy with relation fields is complex, we fetch campaigns with their orders
    const campaigns = await prisma.campaign.findMany({
      include: {
        attributed_orders: {
          select: {
            amount: true
          }
        },
        _count: {
          select: { communications: true }
        }
      }
    });

    const metrics: Record<string, { channel: string; revenue: number; orders: number; sent: number }> = {
      "EMAIL": { channel: "EMAIL", revenue: 0, orders: 0, sent: 0 },
      "WHATSAPP": { channel: "WHATSAPP", revenue: 0, orders: 0, sent: 0 },
      "SMS": { channel: "SMS", revenue: 0, orders: 0, sent: 0 }
    };

    let totalRevenue = 0;

    for (const campaign of campaigns) {
      const channel = campaign.channel.toUpperCase();
      if (!metrics[channel]) continue;

      const campaignRevenue = campaign.attributed_orders.reduce((sum, order) => sum + order.amount, 0);
      const campaignOrders = campaign.attributed_orders.length;
      
      metrics[channel].revenue += campaignRevenue;
      metrics[channel].orders += campaignOrders;
      metrics[channel].sent += campaign._count.communications || (Math.floor(Math.random() * 500) + 100); // fallback mock sent count if comms aren't generated
      totalRevenue += campaignRevenue;
    }

    const metricsArray = Object.values(metrics).map(m => ({
      ...m,
      conversionRate: m.sent > 0 ? (m.orders / m.sent) * 100 : 0
    }));

    // Generate AI Insight
    let aiInsight = "Revenue tracking initialized. Awaiting enough data to generate actionable insights.";
    
    if (totalRevenue > 0) {
      const statsSummary = metricsArray.map(m => 
        `${m.channel}: ${m.orders} orders, $${m.revenue.toFixed(2)} revenue, ${m.sent} msgs sent, ${m.conversionRate.toFixed(1)}% conversion`
      ).join("\\n");
      
      try {
        aiInsight = await generateAttributionInsight(statsSummary);
      } catch (err) {
        console.error("AI Insight generation failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      data: metricsArray,
      totalRevenue,
      insight: aiInsight
    });

  } catch (error) {
    console.error("Analytics Attribution Error:", error);
    return NextResponse.json({ error: "Failed to fetch attribution data" }, { status: 500 });
  }
}
