import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-70b-versatile";

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
- NEVER use \`\`\`json or \`\`\`code blocks in your responses.
- NEVER show the internal tool arguments, model names, or operation types.
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
- GroupBy orders by customer (alternative for top spenders): { model: "order", operation: "groupBy", args: "{\\"by\\":[\\"customer_id\\"],\\"_sum\\":{\\"amount\\":true},\\"orderBy\\":{\\"_sum\\":{\\"amount\\":\\"desc\\"}},\\"take\\":5}" } then use customer_id to look up the name with a second findFirst call.
- Find customer by ID: { model: "customer", operation: "findFirst", args: "{\\"where\\":{\\"id\\":\\"<id>\\"}}" }
- Update Settings: { model: "settings", operation: "update", args: "{\\"where\\":{\\"id\\":\\"singleton\\"},\\"data\\":{\\"dormant_days\\":60}}" }
- Create Segment: { model: "segment", operation: "create", args: "{\\"data\\":{\\"name\\":\\"VIP Win-back\\",\\"filter_json\\":{\\"rfm_score\\":[\\"HIGH_VALUE\\"],\\"lifecycle_stage\\":[\\"DORMANT\\"]},\\"is_dynamic\\":true}}" }

CRITICAL PRISMA RULES:
- aggregate() does NOT support groupBy. Use the separate "groupBy" operation instead.
- groupBy() uses "by" (array), NOT "_groupBy".
- To find top customers by spend: use order.groupBy with by:["customer_id"], _sum:{amount:true}, orderBy:{_sum:{amount:"desc"}}, take:N. Then look up each customer_id with customer.findFirst.
- If you need to create or update a record linked to a user (like creating an order for an email address), FIRST do a "findFirst" (READ) to look up the user by email to get their ID. DO NOT call the "create" tool in the same turn. Wait for the tool result in the next turn, and THEN execute the "create" (WRITE) operation with the real ID. DO NOT try to guess the ID or use placeholders like "{id}".
- NEVER invent Prisma arguments. Only use: where, select, include, take, skip, orderBy, by, _count, _sum, _avg, _min, _max, data, cursor.

CAMPAIGN CREATION WORKFLOW (CRITICAL — MUST FOLLOW):
When the user asks to create a campaign, you MUST do it in TWO steps:
Step 1 (READ): Create the segment FIRST using segment.create with the appropriate filter_json matching the audience criteria (e.g., {lifecycle_stage: ["DORMANT"]} for dormant users). This is a WRITE so it will be shown for confirmation.
Step 2 (after segment is created): Then create the campaign using campaign.create with the REAL segment_id from Step 1.
NEVER create a campaign with a made-up segment_id. ALWAYS create the segment first.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description: "ONLY use when the user explicitly asks to GO TO or OPEN a page (e.g., 'take me to settings', 'open campaigns'). Do NOT use for changing data — use execute_prisma_operation for that.",
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
      description: "Execute ANY query or mutation on the database using Prisma. Use this to answer data questions, create records, update records, aggregate data, etc.",
      parameters: {
        type: "object",
        properties: {
          model: { type: "string", description: "The Prisma model (e.g., 'customer', 'campaign', 'segment', 'order', 'communication', 'workflow', 'settings')" },
          operation: { type: "string", description: "The Prisma operation (e.g., 'findMany', 'findFirst', 'count', 'create', 'update', 'delete', 'updateMany', 'aggregate', 'groupBy')" },
          args: { type: "string", description: "JSON stringified Prisma arguments" }
        },
        required: ["model", "operation", "args"]
      }
    }
  }
];

// Execute a tool call and return the result
/**
 * Strip any raw function XML, code blocks, or Prisma operation text from AI responses.
 * Sometimes the model leaks internal tool XML as text content.
 */
function sanitizeResponse(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // Remove <function=...>...</function> XML blocks
  cleaned = cleaned.replace(/<function[^>]*>[\s\S]*?<\/function>/gi, "").trim();

  // Instead of destroying code blocks, unwrap them so data is preserved
  cleaned = cleaned.replace(/```(?:json|prisma|javascript|typescript|sql|html)?/gi, "");
  cleaned = cleaned.replace(/```/g, "");

  // Remove lines that look like raw Prisma operations: {"model":"customer",...}
  cleaned = cleaned.replace(/\{[\s\S]*?"model"\s*:\s*"[^"]+"\s*,\s*"operation"\s*:\s*"[^"]+"[\s\S]*?\}/g, "").trim();

  // Remove "Executing Prisma operation..." and similar technical lines
  cleaned = cleaned.replace(/^.*(?:Executing|executing)\s+(?:Prisma|prisma|tool|function)\s+.*$/gim, "").trim();

  // Remove leftover "Result:" standalone lines
  cleaned = cleaned.replace(/^Result:\s*$/gim, "").trim();

  // Remove pipe-table style output  |---|---|
  cleaned = cleaned.replace(/^\|[-\s|]+\|$/gm, "").trim();

  // Collapse multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  // If everything was stripped, return a fallback
  if (!cleaned || cleaned.length < 5) {
    return "Let me look that up for you...";
  }

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
          // Strip markdown formatting if AI added it
          let cleanArgs = prismaArgsStr.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
          parsedArgs = JSON.parse(cleanArgs);
        } catch (e) {
          try {
            // Fallback evaluation for malformed JSON
            let cleanArgs = prismaArgsStr.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
            parsedArgs = new Function("return " + cleanArgs)();
          } catch (fallbackError) {
            return { success: false, result: "Invalid JSON in args. Provide a pure JSON string without markdown." };
          }
        }
      } else if (typeof prismaArgsStr === "object") {
        parsedArgs = prismaArgsStr;
      }
    }

    try {
      const data = await prismaModel[operation](parsedArgs);
      
      // Truncate large results to avoid token overflow
      const resultStr = JSON.stringify(data);
      const truncated = resultStr.length > 3000 
        ? resultStr.slice(0, 3000) + `... (truncated, ${Array.isArray(data) ? data.length : 1} total records)`
        : resultStr;
      
      return { success: true, result: truncated };
    } catch (prismaError: any) {
      // Return the error message to the AI so it can self-correct
      return { success: false, result: `Prisma error: ${prismaError.message?.slice(0, 500)}. Please fix the query arguments and try again.` };
    }
  }

  return { success: false, result: "Unknown tool" };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Inject live stats into system prompt
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

    // Build the conversation for the agentic loop
    const conversationMessages: any[] = [
      { role: "system", content: systemWithContext },
      ...messages,
    ];

    let route: string | undefined;
    let pendingAction: any = null;
    const MAX_TOOL_ROUNDS = 5;
    const WRITE_OPS = ["create", "update", "updateMany", "delete", "deleteMany", "upsert"];

    // Agentic loop: AI can call tools, get results, and respond
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let completion;
      try {
        completion = await groq.chat.completions.create({
          model: MODEL,
          messages: conversationMessages,
          tools: TOOLS as any,
          tool_choice: "auto",
          temperature: 0.5,
          max_tokens: 800,
        });
      } catch (groqError: any) {
        // If Groq fails with tool_use_failed, retry without tools
        if (groqError?.status === 400 || groqError?.error?.code === 'tool_use_failed') {
          console.warn("Tool use failed, retrying without tools...");
          const fallback = await groq.chat.completions.create({
            model: MODEL,
            messages: conversationMessages,
            temperature: 0.5,
            max_tokens: 800,
          });
          return NextResponse.json({
            success: true,
            message: sanitizeResponse(fallback.choices[0]?.message?.content || "I had trouble processing that. Could you rephrase?"),
            route,
          });
        }
        throw groqError;
      }

      const choice = completion.choices[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage?.tool_calls || assistantMessage.tool_calls.length === 0) {
        // No tool calls — AI is done, return the final text response
        return NextResponse.json({
          success: true,
          message: sanitizeResponse(assistantMessage?.content || "I'm not sure how to help with that. Could you rephrase?"),
          route,
          action: pendingAction,
        });
      }

      // Check if any tool call is a WRITE operation — if so, pause for user confirmation
      let hasWriteOp = false;
      for (const toolCall of assistantMessage.tool_calls) {
        let args;
        try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }

        if (toolCall.function.name === "execute_prisma_operation" && WRITE_OPS.includes(args.operation)) {
          hasWriteOp = true;
          pendingAction = {
            type: "TOOL_CALL",
            tool_name: toolCall.function.name,
            data: args,
          };
        }
      }

      if (hasWriteOp) {
        // Don't auto-execute writes — return the AI's message with the pending action
        const content = assistantMessage.content || "I've drafted the operation below. Please review and confirm.";
        return NextResponse.json({
          success: true,
          message: sanitizeResponse(content),
          action: pendingAction,
          route,
        });
      }

      // READ operations — auto-execute and feed results back
      conversationMessages.push({
        role: "assistant",
        content: assistantMessage.content || null,
        tool_calls: assistantMessage.tool_calls,
      });

      for (const toolCall of assistantMessage.tool_calls) {
        let args;
        try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }

        const toolResult = await executeTool(toolCall.function.name, args);
        if (toolResult.route) route = toolResult.route;

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult.result),
        });
      }
      // Loop continues — AI will now see the tool results and either call more tools or respond
    }

    // If we exhausted the loop, do one final call without tools to get a text response
    const finalCompletion = await groq.chat.completions.create({
      model: MODEL,
      messages: conversationMessages,
      temperature: 0.5,
      max_tokens: 500,
    });

    return NextResponse.json({
      success: true,
      message: sanitizeResponse(finalCompletion.choices[0]?.message?.content || "Done!"),
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
