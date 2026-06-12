import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch all communications with campaign channel info
    const comms = await prisma.communication.findMany({
      select: {
        id: true,
        status: true,
        sent_at: true,
        campaign: {
          select: { channel: true }
        }
      }
    });

    // ── Conversion Funnel ──
    const totalSent = comms.filter(c => c.status !== "PENDING").length;
    const delivered = comms.filter(c => ["DELIVERED", "OPENED", "READ", "CLICKED"].includes(c.status)).length;
    const opened = comms.filter(c => ["OPENED", "READ", "CLICKED"].includes(c.status)).length;
    const clicked = comms.filter(c => c.status === "CLICKED").length;
    const failed = comms.filter(c => c.status === "FAILED").length;

    const funnel = [
      { stage: "Sent", count: totalSent },
      { stage: "Delivered", count: delivered },
      { stage: "Opened", count: opened },
      { stage: "Clicked", count: clicked },
    ];

    // ── Channel Performance ──
    const channels = ["EMAIL", "WHATSAPP", "SMS"];
    const channelPerformance = channels.map(channel => {
      const chComms = comms.filter(c => c.campaign.channel === channel);
      const chSent = chComms.filter(c => c.status !== "PENDING").length;
      const chDelivered = chComms.filter(c => ["DELIVERED", "OPENED", "READ", "CLICKED"].includes(c.status)).length;
      const chOpened = chComms.filter(c => ["OPENED", "READ", "CLICKED"].includes(c.status)).length;

      return {
        channel,
        volume: chSent,
        delivery: chSent > 0 ? `${Math.round((chDelivered / chSent) * 100)}%` : "0%",
        openRate: chDelivered > 0 ? `${Math.round((chOpened / chDelivered) * 100)}%` : "0%",
      };
    });

    // ── Engagement Heatmap ──
    // Group sent_at timestamps by day-of-week and time-of-day
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const timeSlots = ["Morning", "Afternoon", "Evening"]; // 6-12, 12-18, 18-24
    const heatmapCounts: number[][] = [
      [0, 0, 0, 0, 0, 0, 0], // Morning
      [0, 0, 0, 0, 0, 0, 0], // Afternoon
      [0, 0, 0, 0, 0, 0, 0], // Evening
    ];

    comms.forEach(c => {
      if (!c.sent_at) return;
      const d = new Date(c.sent_at);
      const dayIndex = d.getDay(); // 0=Sun
      const hour = d.getHours();
      let slotIndex = 0;
      if (hour >= 12 && hour < 18) slotIndex = 1;
      else if (hour >= 18) slotIndex = 2;
      heatmapCounts[slotIndex][dayIndex]++;
    });

    // Normalize to 0-1 scale
    const maxCount = Math.max(...heatmapCounts.flat(), 1);
    const heatmap = heatmapCounts.map(row =>
      row.map(count => parseFloat((count / maxCount).toFixed(2)))
    );

    // Reorder so Mon is first (shift Sun to end)
    const reorderedHeatmap = heatmap.map(row => [...row.slice(1), row[0]]);

    return NextResponse.json({
      funnel,
      channelPerformance,
      heatmap: reorderedHeatmap,
      meta: { totalCommunications: comms.length, failed },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
