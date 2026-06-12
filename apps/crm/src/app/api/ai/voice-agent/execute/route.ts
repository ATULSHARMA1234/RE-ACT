import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWorkflowNodes, parseSegmentIntent, draftMessage, queryDataAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();

    if (!action) {
      return NextResponse.json({ success: false, error: "Missing action" }, { status: 400 });
    }

    if (action === "CREATE_WORKFLOW") {
      const { name, prompt } = payload;
      
      // 1. Generate nodes using the AI
      const workflowData = await generateWorkflowNodes(prompt || "Empty workflow");
      
      // 2. Save to database
      const newWorkflow = await prisma.workflow.create({
        data: {
          name: name || "AI Generated Workflow",
          status: "DRAFT",
          nodes_json: workflowData,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Created workflow: ${newWorkflow.name}`,
        route: `/workflows/${newWorkflow.id}`
      });
    }

    if (action === "CREATE_SEGMENT") {
      const { name, description } = payload;
      
      const filter_json = await parseSegmentIntent(description || "All active customers");
      
      const newSegment = await prisma.segment.create({
        data: {
          name: name || "AI Generated Segment",
          filter_json,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Created segment: ${newSegment.name}`,
        route: `/customers`
      });
    }

    if (action === "CREATE_CAMPAIGN") {
      const { name, channel, target_audience, goal } = payload;
      
      // 1. Draft the message
      const message_template = await draftMessage(goal || "Say hello", target_audience || "Customers", channel || "EMAIL");
      
      // 2. Try to find a segment, or just use the first one
      const segment = await prisma.segment.findFirst();
      if (!segment) throw new Error("No segments found in database to attach campaign to.");

      // Call the fire endpoint to actually deliver the campaign
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host");
      const fireUrl = `${protocol}://${host}/api/campaigns/fire`;

      const fireRes = await fetch(fireUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "AI Drafted Campaign",
          channel: channel || "EMAIL",
          segment_id: segment.id,
          message_template
        })
      });

      if (!fireRes.ok) {
        throw new Error("Failed to fire campaign via internal API");
      }

      return NextResponse.json({
        success: true,
        message: `Started campaign: ${name || "AI Drafted Campaign"}`,
        route: `/campaigns`
      });
    }

    if (action === "PAUSE_CAMPAIGN") {
      const { campaign_name } = payload;
      
      // Attempt to find campaign (fuzzy matching usually done via ILIKE or vector search, here we'll just try to find by name or just grab first active)
      // For simplicity in this demo, let's just find the first campaign that matches loosely, or pause all if "all"
      
      let updatedCount = 0;
      if (campaign_name && campaign_name.toLowerCase() === "all") {
        const result = await prisma.campaign.updateMany({
          where: { status: { in: ["DRAFT", "SENDING"] } },
          data: { status: "PAUSED" }
        });
        updatedCount = result.count;
      } else {
        // Just find the most recent campaign and pause it for demo
        const latestCampaign = await prisma.campaign.findFirst({
          orderBy: { created_at: "desc" }
        });
        if (latestCampaign) {
          await prisma.campaign.update({
            where: { id: latestCampaign.id },
            data: { status: "PAUSED" }
          });
          updatedCount = 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Paused ${updatedCount} campaign(s).`,
        route: `/campaigns`
      });
    }

    if (action === "NAVIGATE") {
      const { page } = payload;
      let route = "/dashboard";
      if (page === "workflows") route = "/workflows";
      if (page === "campaigns") route = "/campaigns";
      if (page === "customers") route = "/customers";
      if (page === "settings") route = "/settings";

      return NextResponse.json({
        success: true,
        message: `Navigating to ${page}`,
        route
      });
    }

    if (action === "QUERY_DATA") {
      const { question } = payload;
      
      // Fetch a fast summary of the database metrics to pass as context
      const totalCustomers = await prisma.customer.count();
      const newCustomers = await prisma.customer.count({ where: { lifecycle_stage: "NEW" } });
      const activeCustomers = await prisma.customer.count({ where: { lifecycle_stage: "ACTIVE" } });
      const atRiskCustomers = await prisma.customer.count({ where: { lifecycle_stage: "AT_RISK" } });
      const dormantCustomers = await prisma.customer.count({ where: { lifecycle_stage: "DORMANT" } });
      
      const vipCustomers = await prisma.customer.count({ where: { rfm_score: "HIGH_VALUE" } });
      const lowValueCustomers = await prisma.customer.count({ where: { rfm_score: "LOW_VALUE" } });
      
      const activeCampaigns = await prisma.campaign.count({ where: { status: "SENDING" } });
      const draftedCampaigns = await prisma.campaign.count({ where: { status: "DRAFT" } });
      
      const contextStr = `
Total Customers: ${totalCustomers}
- NEW: ${newCustomers}
- ACTIVE: ${activeCustomers}
- AT RISK: ${atRiskCustomers}
- DORMANT: ${dormantCustomers}

RFM Tiers:
- VIP (HIGH VALUE): ${vipCustomers}
- LOW VALUE: ${lowValueCustomers}

Campaigns:
- Active/Sending: ${activeCampaigns}
- Drafted: ${draftedCampaigns}
`;

      const answer = await queryDataAI(contextStr, question || "What are our metrics?");

      return NextResponse.json({
        success: true,
        message: answer,
        route: null
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });

  } catch (error: any) {
    console.error("AI Execute Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute action" },
      { status: 500 }
    );
  }
}
