import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Attribution logic: For each campaign, find orders placed by recipients
    // within 7 days after the campaign was sent (last-touch attribution window).
    const campaigns = await prisma.campaign.findMany({
      where: { status: { in: ["SENT", "SENDING"] } },
      include: {
        communications: {
          where: { status: { in: ["DELIVERED", "OPENED", "READ", "CLICKED"] } },
          select: {
            customer_id: true,
            delivered_at: true,
          }
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
      const channel = campaign.channel.toUpperCase().split(",")[0].trim();
      if (!metrics[channel]) continue;

      metrics[channel].sent += campaign.communications.length;

      // For each delivered communication, check if the customer placed orders
      // within a 7-day attribution window after delivery
      const customerIds = campaign.communications
        .filter(c => c.delivered_at)
        .map(c => c.customer_id);

      if (customerIds.length === 0) continue;

      // Get the campaign's send time as the attribution window start
      const windowStart = campaign.sent_at || campaign.created_at;
      const windowEnd = new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const attributedOrders = await prisma.order.findMany({
        where: {
          customer_id: { in: customerIds },
          created_at: {
            gte: windowStart,
            lte: windowEnd,
          }
        },
        select: { amount: true }
      });

      const campaignRevenue = attributedOrders.reduce((sum, o) => sum + o.amount, 0);
      metrics[channel].revenue += campaignRevenue;
      metrics[channel].orders += attributedOrders.length;
      totalRevenue += campaignRevenue;
    }

    // If no attributed revenue yet, fall back to aggregating real order data by
    // customer channel preference to still show meaningful numbers
    if (totalRevenue === 0) {
      const customers = await prisma.customer.findMany({
        select: {
          channel_pref: true,
          orders: { select: { amount: true } }
        }
      });

      for (const cust of customers) {
        const ch = cust.channel_pref.toUpperCase();
        if (!metrics[ch]) continue;
        const custRevenue = cust.orders.reduce((sum, o) => sum + o.amount, 0);
        metrics[ch].revenue += custRevenue;
        metrics[ch].orders += cust.orders.length;
        totalRevenue += custRevenue;
      }

      // Count total communications sent per channel
      const comms = await prisma.communication.findMany({
        select: { campaign: { select: { channel: true } } }
      });
      for (const c of comms) {
        const ch = c.campaign.channel.toUpperCase().split(",")[0].trim();
        if (metrics[ch]) metrics[ch].sent++;
      }
    }

    const metricsArray = Object.values(metrics).map(m => ({
      ...m,
      conversionRate: m.sent > 0 ? (m.orders / m.sent) * 100 : 0
    }));

    // Generate proactive suggestions based on the data
    const suggestions: string[] = [];
    if (metricsArray.length > 0) {
      const highestConv = [...metricsArray].sort((a, b) => b.conversionRate - a.conversionRate)[0];
      const highestRev = [...metricsArray].sort((a, b) => b.revenue - a.revenue)[0];
      const lowestConv = [...metricsArray].sort((a, b) => a.conversionRate - b.conversionRate).find(m => m.sent > 0);

      if (highestConv && highestConv.conversionRate > 0) {
        suggestions.push(`**${highestConv.channel}** is driving the highest conversion rate (${highestConv.conversionRate.toFixed(1)}%). Consider allocating more budget here.`);
      }
      
      if (highestRev && highestRev.revenue > 0 && highestRev.channel !== highestConv?.channel) {
        suggestions.push(`**${highestRev.channel}** is generating the most total revenue, despite a lower conversion rate. Optimize these templates to boost ROI further.`);
      }

      if (lowestConv && lowestConv.conversionRate > 0 && lowestConv.channel !== highestConv?.channel) {
        suggestions.push(`**${lowestConv.channel}** has the lowest conversion rate (${lowestConv.conversionRate.toFixed(1)}%). We recommend A/B testing your messaging or migrating these users to ${highestConv?.channel}.`);
      }

      if (suggestions.length === 0 && totalRevenue > 0) {
        suggestions.push("All channels are performing steadily. Keep up the good work!");
      }
    }

    return NextResponse.json({
      success: true,
      data: metricsArray,
      totalRevenue,
      suggestions,
    });

  } catch (error) {
    console.error("Analytics Attribution Error:", error);
    return NextResponse.json({ error: "Failed to fetch attribution data" }, { status: 500 });
  }
}
