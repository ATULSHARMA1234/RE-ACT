import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/auto-trigger
 *
 * Called by the channel-stub poller every 10 seconds.
 * Scans for recent CustomerEvents and matches them to active workflow triggers.
 * Creates WorkflowJobs for every match.
 *
 * Trigger condition → CustomerEvent.event_type mapping:
 *   "Order Placed"     → ORDER_PLACED
 *   "Added to Cart"    → ADDED_TO_CART
 *   "Removed from Cart"→ REMOVED_FROM_CART
 *   "Cart Abandoned"   → CART_ABANDONED
 *   "Checkout Started" → CHECKOUT_STARTED
 *   "Page Viewed"      → PAGE_VIEWED
 *   "Added to Wishlist"→ WISHLIST_ADDED
 *   "Order Cancelled"  → ORDER_CANCELLED
 *   "Review Submitted" → REVIEW_SUBMITTED
 *   "Coupon Applied"   → COUPON_APPLIED
 */

// Map workflow trigger labels → CustomerEvent.event_type values
const TRIGGER_MAP: Record<string, string> = {
  "Order Placed":      "ORDER_PLACED",
  "Added to Cart":     "ADDED_TO_CART",
  "Removed from Cart": "REMOVED_FROM_CART",
  "Cart Abandoned":    "CART_ABANDONED",
  "Checkout Started":  "CHECKOUT_STARTED",
  "Page Viewed":       "PAGE_VIEWED",
  "Added to Wishlist": "WISHLIST_ADDED",
  "Order Cancelled":   "ORDER_CANCELLED",
  "Review Submitted":  "REVIEW_SUBMITTED",
  "Coupon Applied":    "COUPON_APPLIED",
};

export async function POST() {
  try {
    const activeWorkflows = await prisma.workflow.findMany({
      where: { status: "ACTIVE" },
    });

    if (activeWorkflows.length === 0) {
      return NextResponse.json({ success: true, triggered: 0, message: "No active workflows" });
    }

    // Look at customer events from the last 2 minutes
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    const recentEvents = await prisma.customerEvent.findMany({
      where: { created_at: { gte: twoMinAgo } },
      include: { customer: true },
      orderBy: { created_at: "desc" },
    });

    if (recentEvents.length === 0) {
      return NextResponse.json({ success: true, triggered: 0, message: "No recent events" });
    }

    let triggered = 0;

    for (const workflow of activeWorkflows) {
      const nodesJson = workflow.nodes_json as any;
      if (!nodesJson?.nodes) continue;

      // Find the trigger node
      const triggerNode = nodesJson.nodes.find(
        (n: any) => n.data?.originalType === "trigger" || n.type === "triggerNode"
      );
      if (!triggerNode) continue;

      const triggerCondition = triggerNode.data?.config?.condition || "";
      const matchEventType = TRIGGER_MAP[triggerCondition];
      if (!matchEventType) continue; // Unknown trigger, skip

      // Find matching events
      const matchingEvents = recentEvents.filter(
        (e) => e.event_type === matchEventType
      );

      if (matchingEvents.length === 0) continue;

      // Find the message node for channel and content
      const messageNode = nodesJson.nodes.find(
        (n: any) => n.data?.originalType === "message" || n.type === "messageNode"
      );
      const channel = messageNode?.data?.config?.channel || "EMAIL";
      const messageTemplate = messageNode?.data?.config?.content || "Hi {{name}}, we noticed your activity!";

      // Find the delay node
      const delayNode = nodesJson.nodes.find(
        (n: any) => n.data?.originalType === "delay" || n.type === "delayNode"
      );
      const delayMs = parseDelay(delayNode?.data?.config?.time || "0 seconds");

      for (const event of matchingEvents) {
        // Deduplicate: check if a job already exists for this workflow + customer recently
        const existingJob = await prisma.workflowJob.findFirst({
          where: {
            workflow_id: workflow.id,
            customer_id: event.customer_id,
            created_at: { gte: twoMinAgo },
          },
        });

        if (existingJob) continue;

        // Extract metadata for personalization
        const meta = (event.metadata as any) || {};

        // Personalize message
        const message = messageTemplate
          .replace(/\{\{name\}\}/g, event.customer.name)
          .replace(/\{\{last_item\}\}/g, meta.product_name || "your item")
          .replace(/\{\{amount\}\}/g, String(meta.amount || ""))
          .replace(/\{\{coupon_code\}\}/g, meta.coupon_code || "")
          .replace(/\{\{rating\}\}/g, String(meta.rating || ""))
          .replace(/\{\{page\}\}/g, meta.page || "");

        await prisma.workflowJob.create({
          data: {
            workflow_id: workflow.id,
            customer_id: event.customer_id,
            channel,
            message,
            execute_at: new Date(Date.now() + delayMs),
            status: "PENDING",
          },
        });

        triggered++;
        console.log(
          `[Auto-Trigger] ⚡ ${triggerCondition} → ${workflow.name} → ${channel} to ${event.customer.name}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      triggered,
      message: triggered > 0
        ? `Auto-triggered ${triggered} workflow job(s)`
        : "No new events to trigger",
    });
  } catch (error: any) {
    console.error("[Auto-Trigger] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function parseDelay(timeStr: string): number {
  const match = timeStr.match(/^(\d+)\s*(second|minute|hour|day|week)/i);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "second": return value * 1000;
    case "minute": return value * 60 * 1000;
    case "hour":   return value * 60 * 60 * 1000;
    case "day":    return value * 24 * 60 * 60 * 1000;
    case "week":   return value * 7 * 24 * 60 * 60 * 1000;
    default:       return 0;
  }
}
