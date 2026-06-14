import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
const MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `You are Aura, an intelligent AI Marketing Assistant embedded in Radiance, a beauty brand CRM platform.
Your job is to help marketers plan, build, and launch campaigns through natural conversation.

You MUST use tools to answer data questions — NEVER make up numbers. If the user asks "how many customers", "show me", "find", etc., you MUST call execute_prisma_operation to get the real answer.

You can help with:
1. **Segment building**: Understand audience descriptions and create segments
2. **Campaign strategy**: Suggest channels, timing, and messaging approaches
3. **Message drafting**: Write compelling campaign copy for EMAIL, WHATSAPP, or SMS
4. **Analytics interpretation**: Query real data and explain what the numbers mean
5. **Workflow creation**: Automate marketing sequences
6. **Database operations**: Read or update ANY data using execute_prisma_operation

CRITICAL RULES:
- When the user asks to CHANGE, UPDATE, SET, or MODIFY something (e.g., "change dormant days to 60", "update settings", "set at-risk days to 30"), you MUST use execute_prisma_operation with operation "update". DO NOT use navigate. DO NOT just tell the user to go change it themselves.
- Only use the "navigate" tool if the user explicitly says "go to", "take me to", "open", or "show me the page".
- When the user asks a QUESTION about data, ALWAYS call execute_prisma_operation to get the real answer.
- After getting tool results, synthesize them into a clear, human-readable response.
- Be concise but insightful. Sound like a sharp senior growth marketer.

PRESENTATION RULES (VERY IMPORTANT):
- NEVER show raw JSON, code blocks, Prisma queries, or technical operation details to the user.
- NEVER use code blocks in your responses.
- When presenting data results, format them as clean bullet points, numbered lists, or brief summaries.
- For tabular data, use simple formatted text (e.g., "1. Emily Chen — $1,240 — AT_RISK") not code blocks or pipe tables.
- If a query returns results, summarize the key insights conversationally. Don't dump raw data.
- You are a polished assistant — your output should feel like talking to a knowledgeable colleague, not reading a terminal.

Database Schema (Prisma Models & Fields):
- Customer: id, name, email, phone, channel_pref (EMAIL|WHATSAPP|SMS), lifecycle_stage (NEW|ACTIVE|AT_RISK|DORMANT), rfm_score (HIGH_VALUE|MID_TIER|LOW_VALUE)
- Order: id, customer_id, amount, product_name, created_at
- Segment: id, name, filter_json (JSON), is_dynamic (Boolean)
- Campaign: id, name, segment_id, channel, message_template, status (DRAFT|SENDING|SENT), sent_at
- Communication: id, campaign_id, customer_id, status (PENDING|SENT|DELIVERED|OPENED|READ|CLICKED|FAILED), sent_at, delivered_at
- Settings: id (always "singleton"), high_value_min_spend, high_value_min_orders, mid_tier_min_spend, mid_tier_min_orders, at_risk_days, dormant_days
- Workflow: id, name, status, nodes_json

Prisma operation examples (use EXACTLY these patterns):
- Count: { model: "customer", operation: "count", args: "{\\"where\\":{\\"lifecycle_stage\\":\\"DORMANT\\"}}" }
- Find top 5 VIPs: { model: "customer", operation: "findMany", args: "{\\"where\\":{\\"rfm_score\\":\\"HIGH_VALUE\\"},\\"take\\":5,\\"select\\":{\\"name\\":true,\\"email\\":true}}" }
- TOP N HIGHEST-SPENDING CUSTOMERS (PREFERRED): { model: "customer", operation: "findMany", args: "{\\"include\\":{\\"orders\\":{\\"select\\":{\\"amount\\":true}}},\\"take\\":50}" } — then compute totalSpend = sum(orders.amount) for each customer, sort descending, pick top N. Present as "1. Name — $X total".
- Total revenue: { model: "order", operation: "aggregate", args: "{\\"_sum\\":{\\"amount\\":true}}" }
- GroupBy lifecycle: { model: "customer", operation: "groupBy", args: "{\\"by\\":[\\"lifecycle_stage\\"],\\"_count\\":true}" }
- GroupBy orders by customer: { model: "order", operation: "groupBy", args: "{\\"by\\":[\\"customer_id\\"],\\"_sum\\":{\\"amount\\":true},\\"orderBy\\":{\\"_sum\\":{\\"amount\\":\\"desc\\"}},\\"take\\":5}" } then use customer_id to look up the name.
- Update Settings: { model: "settings", operation: "update", args: "{\\"where\\":{\\"id\\":\\"singleton\\"},\\"data\\":{\\"dormant_days\\":60}}" }
- Create Segment: { model: "segment", operation: "create", args: "{\\"data\\":{\\"name\\":\\"VIP Win-back\\",\\"filter_json\\":{\\"rfm_score\\":[\\"HIGH_VALUE\\"],\\"lifecycle_stage\\":[\\"DORMANT\\"]},\\"is_dynamic\\":true}}" }

CRITICAL PRISMA RULES:
- aggregate() does NOT support groupBy. Use the separate "groupBy" operation instead.
- groupBy() uses "by" (array), NOT "_groupBy".
- NEVER invent Prisma arguments. Only use: where, select, include, take, skip, orderBy, by, _count, _sum, _avg, _min, _max, data, cursor.

CAMPAIGN CREATION WORKFLOW (CRITICAL — MUST FOLLOW):
When the user asks to create a campaign, you MUST do it in TWO steps:
Step 1: Create the segment FIRST using segment.create.
Step 2: Then create the campaign using campaign.create with the REAL segment_id from Step 1.
NEVER create a campaign with a made-up segment_id.`;

const TOOLS = [
  {
    name: "navigate",
    description: "ONLY use when the user explicitly asks to GO TO or OPEN a page.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.STRING, description: "The page to navigate to. Allowed values: dashboard, workflows, campaigns, customers, settings, segments" }
      },
      required: ["page"],
    },
  },
  {
    name: "execute_prisma_operation",
    description: "Execute ANY query or mutation on the database using Prisma. Use this to answer data questions, create records, update records, aggregate data, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        model: { type: Type.STRING, description: "The Prisma model (e.g., 'customer', 'campaign', 'segment', 'order', 'communication', 'workflow', 'settings')" },
        operation: { type: Type.STRING, description: "The Prisma operation (e.g., 'findMany', 'findFirst', 'count', 'create', 'update', 'delete', 'updateMany', 'aggregate', 'groupBy')" },
        args: { type: Type.STRING, description: "JSON stringified Prisma arguments" },
      },
      required: ["model", "operation", "args"],
    },
  },
];

function sanitizeResponse(text: string): string {
  if (!text) return text;
  let cleaned = text;
  cleaned = cleaned.replace(/```(?:json|prisma|javascript|typescript|sql|html)?/gi, "");
  cleaned = cleaned.replace(/```/g, "");
  cleaned = cleaned.replace(/\{[\s\S]*?"model"\s*:\s*"[^"]+"\s*,\s*"operation"\s*:\s*"[^"]+"[\s\S]*?\}/g, "").trim();
  cleaned = cleaned.replace(/^.*(?:Executing|executing)\s+(?:Prisma|prisma|tool|function)\s+.*$/gim, "").trim();
  cleaned = cleaned.replace(/^\|[-\s|]+\|$/gm, "").trim();
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned || cleaned.length < 5) return "Let me look that up for you...";
  return cleaned;
}

async function executeTool(toolName: string, args: any): Promise<{ success: boolean; result: any; route?: string }> {
  if (toolName === "navigate") {
    const page = args.page || "dashboard";
    const route = `/${page === "dashboard" ? "dashboard" : page}`;
    return { success: true, result: `Navigated to ${page}`, route };
  }

  if (toolName === "execute_prisma_operation") {
    const { model, operation, args: prismaArgsStr } = args;
    
    const prismaModel = (prisma as any)[model];
    if (!prismaModel || typeof prismaModel[operation] !== "function") {
      return { success: false, result: `Invalid: prisma.${model}.${operation}` };
    }

    let parsedArgs = {};
    if (prismaArgsStr) {
      if (typeof prismaArgsStr === "string") {
        try {
          let cleanArgs = prismaArgsStr.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
          parsedArgs = JSON.parse(cleanArgs);
        } catch (e) {
          try {
            let cleanArgs = prismaArgsStr.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
            parsedArgs = new Function("return " + cleanArgs)();
          } catch {
            return { success: false, result: "Invalid JSON in args." };
          }
        }
      } else if (typeof prismaArgsStr === "object") {
        parsedArgs = prismaArgsStr;
      }
    }

    try {
      const data = await prismaModel[operation](parsedArgs);
      const resultStr = JSON.stringify(data);
      const truncated = resultStr.length > 3000 
        ? resultStr.slice(0, 3000) + `... (truncated, ${Array.isArray(data) ? data.length : 1} total records)`
        : resultStr;
      return { success: true, result: truncated };
    } catch (prismaError: any) {
      return { success: false, result: `Prisma error: ${prismaError.message?.slice(0, 500)}. Please fix the query arguments and try again.` };
    }
  }

  return { success: false, result: "Unknown tool" };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Inject live stats
    const [customerCount, dormantCount, atRiskCount, highValueCount, campaignCount] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { lifecycle_stage: "DORMANT" } }),
      prisma.customer.count({ where: { lifecycle_stage: "AT_RISK" } }),
      prisma.customer.count({ where: { rfm_score: "HIGH_VALUE" } }),
      prisma.campaign.count(),
    ]);

    const contextNote = `\n\n[LIVE CRM SNAPSHOT — reference only, ALWAYS use tools for precise answers]:
Total customers: ${customerCount} | Dormant: ${dormantCount} | At-risk: ${atRiskCount} | High-value: ${highValueCount} | Campaigns run: ${campaignCount}`;

    const systemWithContext = SYSTEM_PROMPT + contextNote;

    // Convert messages to Gemini format
    const geminiHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const msg of messages) {
      geminiHistory.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    let route: string | undefined;
    let pendingAction: any = null;
    const MAX_TOOL_ROUNDS = 5;
    const WRITE_OPS = ["create", "update", "updateMany", "delete", "deleteMany", "upsert"];

    // Use Gemini's chat with function calling
    const chat = ai.chats.create({
      model: MODEL,
      config: {
        systemInstruction: systemWithContext,
        tools: [{ functionDeclarations: TOOLS }],
        temperature: 0.5,
        maxOutputTokens: 800,
      },
      history: geminiHistory.slice(0, -1), // All but the last message
    });

    // Send the last user message
    const lastMessage = geminiHistory[geminiHistory.length - 1];
    let response = await (await chat).sendMessage({ message: lastMessage.parts[0].text });

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      
      // Check for function calls
      const functionCalls = parts.filter((p: any) => p.functionCall);
      
      if (functionCalls.length === 0) {
        // No function calls — return text
        const text = parts.map((p: any) => p.text || "").join("");
        return NextResponse.json({
          success: true,
          message: sanitizeResponse(text || "I'm not sure how to help with that. Could you rephrase?"),
          route,
          action: pendingAction,
        });
      }

      // Process function calls
      const functionResponses: any[] = [];
      let hasWriteOp = false;

      for (const part of functionCalls) {
        const fc = (part as any).functionCall;
        const toolName = fc.name;
        const toolArgs = fc.args || {};

        // Check for write operations
        if (toolName === "execute_prisma_operation" && WRITE_OPS.includes(toolArgs.operation)) {
          hasWriteOp = true;
          pendingAction = {
            type: "TOOL_CALL",
            tool_name: toolName,
            data: toolArgs,
          };
        }

        if (!hasWriteOp) {
          const toolResult = await executeTool(toolName, toolArgs);
          if (toolResult.route) route = toolResult.route;

          functionResponses.push({
            name: toolName,
            response: { result: toolResult.result },
          });
        }
      }

      if (hasWriteOp) {
        // Return confirmation prompt for write operations
        const textParts = parts.filter((p: any) => p.text);
        const text = textParts.map((p: any) => p.text).join("") || "I've drafted the operation below. Please review and confirm.";
        return NextResponse.json({
          success: true,
          message: sanitizeResponse(text),
          action: pendingAction,
          route,
        });
      }

      // Send function results back to Gemini
      response = await (await chat).sendMessage({
        message: functionResponses.map(fr => ({
          functionResponse: fr,
        })),
      });
    }

    // Exhausted rounds — return whatever we have
    const finalText = response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "Done!";
    return NextResponse.json({
      success: true,
      message: sanitizeResponse(finalText),
      route,
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
