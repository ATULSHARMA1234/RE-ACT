import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWorkflowNodes, parseSegmentIntent, draftMessage } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();

    if (!action) {
      return NextResponse.json({ success: false, error: "Missing action" }, { status: 400 });
    }

    if (action === "UPDATE_SETTINGS") {
      const { field, value } = payload;

      const VALID_FIELDS = [
        "dormant_days", "at_risk_days",
        "high_value_min_spend", "high_value_min_orders",
        "mid_tier_min_spend", "mid_tier_min_orders"
      ];

      if (!field || !VALID_FIELDS.includes(field)) {
        return NextResponse.json({
          success: false,
          error: `Invalid settings field: "${field}". Valid fields: ${VALID_FIELDS.join(", ")}`
        }, { status: 400 });
      }

      await prisma.settings.update({
        where: { id: "singleton" },
        data: { [field]: Number(value) }
      });

      const label = field.replace(/_/g, " ");
      return NextResponse.json({
        success: true,
        message: `Updated ${label} to ${value}.`,
        route: "/settings"
      });
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
      
      // 2. Auto-create a segment for the target audience
      const filter_json = await parseSegmentIntent(target_audience || "All active customers");
      const segment = await prisma.segment.create({
        data: {
          name: `Segment: ${target_audience || "All Customers"}`,
          filter_json,
          is_dynamic: true
        }
      });

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

      // Use the agentic chat API internally for data queries
      // so the AI can call Prisma to get real, specific answers
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host");
      const chatUrl = `${protocol}://${host}/api/ai/chat`;

      const chatRes = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
        }),
      });

      const chatData = await chatRes.json();

      if (chatData.success) {
        return NextResponse.json({
          success: true,
          message: chatData.message,
          route: null,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: chatData.error || "Failed to query data",
        });
      }
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
