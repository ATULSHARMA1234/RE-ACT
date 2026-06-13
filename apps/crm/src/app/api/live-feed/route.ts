import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since");
    const workflowId = searchParams.get("workflow_id");
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60 * 60 * 1000);

    // All workflows for the selector
    const allWorkflows = await prisma.workflow.findMany({
      orderBy: { updated_at: "desc" },
      select: { id: true, name: true, status: true, nodes_json: true },
    });

    let selectedWorkflow = null;
    if (workflowId) {
      selectedWorkflow = allWorkflows.find((w) => w.id === workflowId) || null;
    } else {
      selectedWorkflow = allWorkflows.find((w) => w.status === "ACTIVE") || allWorkflows[0] || null;
    }

    // 1. Customer Events (all types — cart, browse, checkout, etc.)
    const customerEvents = await prisma.customerEvent.findMany({
      where: { created_at: { gte: since } },
      include: { customer: { select: { id: true, name: true, email: true } } },
      orderBy: { created_at: "desc" },
      take: 80,
    });

    // 2. Orders
    const orders = await prisma.order.findMany({
      where: { created_at: { gte: since } },
      include: { customer: { select: { id: true, name: true, email: true } } },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    // 3. Workflow Jobs
    const jobWhere: any = { created_at: { gte: since } };
    if (selectedWorkflow) jobWhere.workflow_id = selectedWorkflow.id;

    const workflowJobs = await prisma.workflowJob.findMany({
      where: jobWhere,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    // 4. Communications
    const commWhere: any = { updated_at: { gte: since } };
    if (selectedWorkflow) commWhere.workflow_id = selectedWorkflow.id;

    const comms = await prisma.communication.findMany({
      where: commWhere,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 50,
    });

    // Merge into unified timeline
    // Track order IDs that came from CustomerEvent so we don't duplicate
    const orderPlacedCustomerIds = new Set(
      customerEvents
        .filter((e) => e.event_type === "ORDER_PLACED")
        .map((e) => e.customer_id + "-" + e.created_at.toISOString().slice(0, 16))
    );

    const events = [
      // Customer Events (primary activity feed)
      ...customerEvents.map((e) => ({
        id: e.id,
        type: "CUSTOMER_EVENT" as const,
        timestamp: e.created_at.toISOString(),
        customer: e.customer,
        details: {
          event_type: e.event_type,
          ...(e.metadata as any || {}),
        },
      })),
      // Orders (only ones NOT already represented by a CUSTOMER_EVENT)
      ...orders
        .filter((o) => !orderPlacedCustomerIds.has(o.customer_id + "-" + o.created_at.toISOString().slice(0, 16)))
        .map((o) => ({
          id: o.id,
          type: "ORDER" as const,
          timestamp: o.created_at.toISOString(),
          customer: o.customer,
          details: { product_name: o.product_name, amount: o.amount },
        })),
      // Workflow Jobs
      ...workflowJobs.map((j) => ({
        id: j.id,
        type: "WORKFLOW_JOB" as const,
        timestamp: j.created_at.toISOString(),
        customer: j.customer,
        details: {
          workflow_name: j.workflow.name,
          workflow_id: j.workflow.id,
          channel: j.channel,
          status: j.status,
          execute_at: j.execute_at.toISOString(),
        },
      })),
      // Communications
      ...comms.map((c) => ({
        id: c.id,
        type: "COMMUNICATION" as const,
        timestamp: c.updated_at.toISOString(),
        customer: c.customer,
        details: {
          status: c.status,
          channel: c.channel,
          source: c.workflow_id
            ? `Workflow: ${c.workflow?.name || "Unknown"}`
            : `Campaign: ${c.campaign?.name || "Unknown"}`,
          workflow_id: c.workflow_id,
          campaign_id: c.campaign_id,
        },
      })),
    ];

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Build workflow activity stats
    let workflowActivity = null;
    if (selectedWorkflow) {
      const wfComms = await prisma.communication.findMany({
        where: { workflow_id: selectedWorkflow.id },
        select: { status: true },
      });
      const wfJobs = await prisma.workflowJob.findMany({
        where: { workflow_id: selectedWorkflow.id },
        select: { status: true },
      });

      const triggerEvents = customerEvents.filter(
        (e) => e.event_type === "ORDER_PLACED" || e.event_type === "CART_ABANDONED"
      ).length;

      workflowActivity = {
        triggerCount: Math.max(triggerEvents, orders.length),
        jobsPending: wfJobs.filter((j) => j.status === "PENDING").length,
        jobsCompleted: wfJobs.filter((j) => j.status === "COMPLETED").length,
        totalMessages: wfComms.length,
        sent: wfComms.filter((c) => c.status !== "PENDING").length,
        delivered: wfComms.filter((c) => ["DELIVERED", "OPENED", "READ", "CLICKED"].includes(c.status)).length,
        opened: wfComms.filter((c) => ["OPENED", "READ", "CLICKED"].includes(c.status)).length,
        failed: wfComms.filter((c) => c.status === "FAILED").length,
        lastActivity: null as string | null,
      };
    }

    return NextResponse.json({
      success: true,
      events: events.slice(0, 150),
      allWorkflows: allWorkflows.map((w) => ({ id: w.id, name: w.name, status: w.status })),
      selectedWorkflow: selectedWorkflow
        ? { id: selectedWorkflow.id, name: selectedWorkflow.name, status: selectedWorkflow.status, nodes_json: selectedWorkflow.nodes_json }
        : null,
      workflowActivity,
    });
  } catch (error: any) {
    console.error("[Live Feed API] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
