import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are REACH, an intelligent AI Marketing Co-Pilot embedded in a D2C CRM platform.
Your job is to help marketers plan, build, and launch campaigns through natural conversation.

You can help with:
1. **Segment building**: Understand the marketer's audience description and convert it into filters
2. **Campaign strategy**: Suggest channels, timing, and messaging approaches
3. **Message drafting**: Write compelling campaign copy for EMAIL, WHATSAPP, or SMS
4. **Analytics interpretation**: Explain what the numbers mean and what to do next
5. **Workflow creation**: Automate marketing sequences
6. **Executing arbitrary database commands**: Using the execute_prisma_operation tool, you can read or update ANY data the user asks you to modify.

If the user asks you to perform an action, DO NOT just describe how to do it. ACTUALLY call the appropriate tool.
The available tools are:
- navigate: For navigating to a different page.
- execute_prisma_operation: For doing EVERYTHING ELSE (reading/writing to the database, e.g., creating a campaign, pausing a campaign, fetching specific users).

Rules:
- Be concise but insightful. No fluff.
- Always refer to the brand's customers as their most valuable asset.
- Use data-driven reasoning. If no data is mentioned, ask a clarifying question.
- Sound like a sharp, senior growth marketer, not a generic AI.
- Never break character.

Database Schema Reference (Prisma Models & Fields):
- Customer: id, name, email, phone, channel_pref, lifecycle_stage, rfm_score
- Order: id, customer_id, amount, product_name
- Segment: id, name, filter_json, is_dynamic
- Campaign: id, name, segment_id, channel, message_template, status, sent_at
- Settings: id (always "singleton"), high_value_min_spend, high_value_min_orders, mid_tier_min_spend, mid_tier_min_orders, at_risk_days, dormant_days
- Workflow: id, name, status, nodes_json

When updating Settings, the ID is always "singleton". Example args: {"where":{"id":"singleton"},"data":{"dormant_days":180}}`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Navigate the user to a specific page in the CRM dashboard.",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", description: "The page to navigate to. Allowed values: dashboard, workflows, campaigns, customers, settings, segments" }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_prisma_operation",
      description: "Execute ANY arbitrary query or mutation on the database using Prisma. This gives you god-mode to do EVERYTHING the user asks. For example, creating a Campaign, creating a Segment, pausing a Campaign, fetching VIP customers, updating settings.",
      parameters: {
        type: "object",
        properties: {
          model: { type: "string", description: "The Prisma model to operate on (e.g., 'customer', 'campaign', 'segment', 'workflow', 'settings')" },
          operation: { type: "string", description: "The Prisma operation to call (e.g., 'findMany', 'create', 'update', 'delete', 'updateMany')" },
          args: { type: "string", description: "A JSON stringified object representing the arguments to pass to the Prisma operation. (e.g., '{\"where\": {\"status\": \"ACTIVE\"}, \"data\": {\"status\": \"PAUSED\"}}')" }
        },
        required: ["model", "operation", "args"]
      }
    }
  }
];

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Fetch live stats for context
    const [customerCount, dormantCount, atRiskCount, highValueCount] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { lifecycle_stage: "DORMANT" } }),
      prisma.customer.count({ where: { lifecycle_stage: "AT_RISK" } }),
      prisma.customer.count({ where: { rfm_score: "HIGH_VALUE" } }),
    ]);

    const contextNote = `\n\n[LIVE CRM DATA — use this to give data-grounded advice]:
Total customers: ${customerCount}
Dormant customers: ${dormantCount}
At-risk customers: ${atRiskCount}
High-value customers: ${highValueCount}`;

    const systemWithContext = SYSTEM_PROMPT + contextNote;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemWithContext },
        ...messages,
      ],
      tools: TOOLS as any,
      tool_choice: "auto",
      temperature: 0.65,
      max_tokens: 800,
    });

    const choice = completion.choices[0];
    const message = choice?.message;
    
    let content = message?.content || "";
    let action = null;

    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      try {
        action = {
          type: "TOOL_CALL",
          tool_name: toolCall.function.name,
          data: JSON.parse(toolCall.function.arguments)
        };
        // If the LLM leaked the JSON payload into the content, strip it out
        content = content.replace(/```(?:json)?[\s\S]*?```/g, "").trim();

        // If there's no content left but a tool was called, output a placeholder
        if (!content) {
          content = `I have drafted the operation. Please review the details below and confirm.`;
        }
      } catch (e) {
        console.error("Failed to parse tool arguments:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: content,
      action,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
