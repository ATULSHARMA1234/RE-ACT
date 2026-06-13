import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Use database-level counts instead of fetching all records
    const [
      totalComms,
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      failedCount,
      commsWithTimes,
    ] = await Promise.all([
      prisma.communication.count(),
      prisma.communication.count({ where: { status: { not: "PENDING" } } }),
      prisma.communication.count({
        where: { status: { in: ["DELIVERED", "OPENED", "READ", "CLICKED"] } },
      }),
      prisma.communication.count({
        where: { status: { in: ["OPENED", "READ", "CLICKED"] } },
      }),
      prisma.communication.count({ where: { status: "CLICKED" } }),
      prisma.communication.count({ where: { status: "FAILED" } }),
      // Only fetch timestamps for heatmap (minimal data)
      prisma.communication.findMany({
        where: { sent_at: { not: null } },
        select: { sent_at: true },
      }),
    ]);

    // ── Conversion Funnel ──
    const funnel = [
      { stage: "Sent", count: sentCount },
      { stage: "Delivered", count: deliveredCount },
      { stage: "Opened", count: openedCount },
      { stage: "Clicked", count: clickedCount },
    ];

    // ── Channel Performance (use grouped counts) ──
    const channelComms = await prisma.communication.findMany({
      where: { campaign: { isNot: null } },
      select: {
        status: true,
        campaign: { select: { channel: true } },
      },
    });

    const channels = ["EMAIL", "WHATSAPP", "SMS"];
    const channelPerformance = channels.map((channel) => {
      const chComms = channelComms.filter((c) =>
        c.campaign?.channel?.toUpperCase().includes(channel)
      );
      const chSent = chComms.filter((c) => c.status !== "PENDING").length;
      const chDelivered = chComms.filter((c) =>
        ["DELIVERED", "OPENED", "READ", "CLICKED"].includes(c.status)
      ).length;
      const chOpened = chComms.filter((c) =>
        ["OPENED", "READ", "CLICKED"].includes(c.status)
      ).length;

      return {
        channel,
        volume: chSent,
        delivery:
          chSent > 0 ? `${Math.round((chDelivered / chSent) * 100)}%` : "0%",
        openRate:
          chDelivered > 0
            ? `${Math.round((chOpened / chDelivered) * 100)}%`
            : "0%",
      };
    });

    // ── Engagement Heatmap ──
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const heatmapCounts: number[][] = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ];

    commsWithTimes.forEach((c) => {
      if (!c.sent_at) return;
      const d = new Date(c.sent_at);
      const dayIndex = d.getDay();
      const hour = d.getHours();
      let slotIndex = 0;
      if (hour >= 12 && hour < 18) slotIndex = 1;
      else if (hour >= 18) slotIndex = 2;
      heatmapCounts[slotIndex][dayIndex]++;
    });

    const maxCount = Math.max(...heatmapCounts.flat(), 1);
    const heatmap = heatmapCounts.map((row) =>
      row.map((count) => parseFloat((count / maxCount).toFixed(2)))
    );
    const reorderedHeatmap = heatmap.map((row) => [...row.slice(1), row[0]]);

    return NextResponse.json({
      funnel,
      channelPerformance,
      heatmap: reorderedHeatmap,
      meta: { totalCommunications: totalComms, failed: failedCount },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
