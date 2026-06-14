import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenAI, Type } from "@google/genai";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash";

// Parse XML-style tool calls from Groq's failed_generation
function parseXmlToolCall(failedGen: string): { name: string; arguments: string } | null {
  const match = failedGen.match(/<function=(\w+)(.*?)<\/function>/s);
  if (!match) return null;
  const name = match[1];
  const argsStr = match[2].trim();
  try { JSON.parse(argsStr); return { name, arguments: argsStr }; } catch { return null; }
}

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
- When the user asks to CHANGE, UPDATE, SET, or MODIFY something, you MUST use execute_prisma_operation with operation "update". DO NOT use navigate.
- Only use "navigate" if the user explicitly says "go to", "take me to", "open", or "show me the page".
- When the user asks a QUESTION about data, ALWAYS call execute_prisma_operation.
- After getting tool results, synthesize them into a clear, human-readable response.
- Be concise but insightful. Sound like a sharp senior growth marketer.

PRESENTATION RULES (VERY IMPORTANT):
- NEVER show raw JSON, code blocks, Prisma queries, or technical operation details.
- Format data as clean bullet points, numbered lists, or brief summaries.
- For tabular data: "1. Emily Chen — $1,240 — AT_RISK"
- You are a polished assistant — output should feel like talking to a knowledgeable colleague.

Database Schema:
- Customer: id, name, email, phone, channel_pref (EMAIL|WHATSAPP|SMS), lifecycle_stage (NEW|ACTIVE|AT_RISK|DORMANT), rfm_score (HIGH_VALUE|MID_TIER|LOW_VALUE)
- Order: id, customer_id, amount, product_name, created_at
- Segment: id, name, filter_json (JSON), is_dynamic (Boolean)
- Campaign: id, name, segment_id, channel, message_template, status (DRAFT|SENDING|SENT), sent_at
- Communication: id, campaign_id, customer_id, status (PENDING|SENT|DELIVERED|OPENED|READ|CLICKED|FAILED), sent_at, delivered_at
- Settings: id (always "singleton"), high_value_min_spend, high_value_min_orders, mid_tier_min_spend, mid_tier_min_orders, at_risk_days, dormant_days
- Workflow: id, name, status, nodes_json

Prisma operation examples:
- Count: { model: "customer", operation: "count", args: "{\\"where\\":{\\"lifecycle_stage\\":\\"DORMANT\\"}}" }
- Find top 5 VIPs: { model: "customer", operation: "findMany", args: "{\\"where\\":{\\"rfm_score\\":\\"HIGH_VALUE\\"},\\"take\\":5,\\"select\\":{\\"name\\":true,\\"email\\":true}}" }
- TOP N SPENDERS (PREFERRED): { model: "customer", operation: "findMany", args: "{\\"include\\":{\\"orders\\":{\\"select\\":{\\"amount\\":true}}},\\"take\\":50}" } — then compute totalSpend = sum(orders.amount) per customer, sort descending, pick top N.
- Total revenue: { model: "order", operation: "aggregate", args: "{\\"_sum\\":{\\"amount\\":true}}" }
- GroupBy lifecycle: { model: "customer", operation: "groupBy", args: "{\\"by\\":[\\"lifecycle_stage\\"],\\"_count\\":true}" }
- Update Settings: { model: "settings", operation: "update", args: "{\\"where\\":{\\"id\\":\\"singleton\\"},\\"data\\":{\\"dormant_days\\":60}}" }
- Create Segment: { model: "segment", operation: "create", args: "{\\"data\\":{\\"name\\":\\"VIP Win-back\\",\\"filter_json\\":{\\"rfm_score\\":[\\"HIGH_VALUE\\"],\\"lifecycle_stage\\":[\\"DORMANT\\"]},\\"is_dynamic\\":true}}" }

CRITICAL PRISMA RULES:
- aggregate() does NOT support groupBy. Use "groupBy" operation instead.
- groupBy() uses "by" (array), NOT "_groupBy".
- NEVER invent Prisma arguments. Only use: where, select, include, take, skip, orderBy, by, _count, _sum, _avg, _min, _max, data, cursor.

CAMPAIGN CREATION: You MUST create the segment FIRST, then create the campaign with the real segment_id.`;

// Groq tool format
const GROQ_TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description: "ONLY use when the user explicitly asks to GO TO or OPEN a page.",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", description: "Allowed: dashboard, workflows, campaigns, customers, settings, segments" }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_prisma_operation",
      description: "Execute ANY Prisma query or mutation on the database.",
      parameters: {
        type: "object",
        properties: {
          model: { type: "string", description: "Prisma model name" },
          operation: { type: "string", description: "Prisma operation" },
          args: { type: "string", description: "JSON stringified Prisma arguments" },
        },
        required: ["model", "operation", "args"]
      }
    }
  }
];

// Gemini tool format
const GEMINI_TOOLS = [
  {
    name: "navigate",
    description: "ONLY use when the user explicitly asks to GO TO or OPEN a page.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.STRING, description: "Allowed: dashboard, workflows, campaigns, customers, settings, segments" }
      },
      required: ["page"],
    },
  },
  {
    name: "execute_prisma_operation",
    description: "Execute ANY Prisma query or mutation on the database.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        model: { type: Type.STRING, description: "Prisma model name" },
        operation: { type: Type.STRING, description: "Prisma operation" },
        args: { type: Type.STRING, description: "JSON stringified Prisma arguments" },
      },
      required: ["model", "operation", "args"],
    },
  },
];

function sanitizeResponse(text: string): string {
  if (!text) return text;
  let cleaned = text;
  cleaned = cleaned.replace(/<function[^>]*>[\s\S]*?<\/function>/gi, "").trim();
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
          parsedArgs = JSON.parse(prismaArgsStr.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
        } catch {
          try { parsedArgs = new Function("return " + prismaArgsStr.trim())(); } catch {
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
      return { success: true, result: resultStr.length > 3000 ? resultStr.slice(0, 3000) + `... (truncated)` : resultStr };
    } catch (e: any) {
      return { success: false, result: `Prisma error: ${e.message?.slice(0, 500)}` };
    }
  }

  return { success: false, result: "Unknown tool" };
}

// ============ GROQ AGENTIC LOOP ============
async function runGroqChat(systemWithContext: string, messages: any[]): Promise<NextResponse> {
  const conversationMessages: any[] = [
    { role: "system", content: systemWithContext },
    ...messages,
  ];

  let route: string | undefined;
  let pendingAction: any = null;
  const WRITE_OPS = ["create", "update", "updateMany", "delete", "deleteMany", "upsert"];

  for (let round = 0; round < 5; round++) {
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: conversationMessages,
        tools: GROQ_TOOLS as any,
        tool_choice: "auto",
        temperature: 0.5,
        max_tokens: 800,
      });
    } catch (groqError: any) {
      // Try to recover XML tool calls
      const failedGen = groqError?.error?.failed_generation || '';
      const parsed = failedGen ? parseXmlToolCall(failedGen) : null;

      if (parsed) {
        let args; try { args = JSON.parse(parsed.arguments); } catch { args = {}; }
        const toolResult = await executeTool(parsed.name, args);
        if (toolResult.route) route = toolResult.route;

        conversationMessages.push({ role: "assistant", content: `I used ${parsed.name} and got: ${JSON.stringify(toolResult.result).slice(0, 2000)}` });
        const followUp = await groq.chat.completions.create({ model: GROQ_MODEL, messages: conversationMessages, temperature: 0.5, max_tokens: 800 });
        return NextResponse.json({ success: true, message: sanitizeResponse(followUp.choices[0]?.message?.content || "Done!"), route });
      }

      // Groq completely failed — throw to trigger Gemini fallback
      throw groqError;
    }

    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage?.tool_calls || assistantMessage.tool_calls.length === 0) {
      return NextResponse.json({
        success: true,
        message: sanitizeResponse(assistantMessage?.content || "I'm not sure how to help with that."),
        route, action: pendingAction,
      });
    }

    // Check for write ops
    let hasWriteOp = false;
    for (const tc of assistantMessage.tool_calls) {
      let args; try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
      if (tc.function.name === "execute_prisma_operation" && WRITE_OPS.includes(args.operation)) {
        hasWriteOp = true;
        pendingAction = { type: "TOOL_CALL", tool_name: tc.function.name, data: args };
      }
    }

    if (hasWriteOp) {
      return NextResponse.json({ success: true, message: sanitizeResponse(assistantMessage.content || "Please review and confirm."), action: pendingAction, route });
    }

    // Execute read tools and feed results back
    conversationMessages.push({ role: "assistant", content: assistantMessage.content || null, tool_calls: assistantMessage.tool_calls });

    for (const tc of assistantMessage.tool_calls) {
      let args; try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
      const toolResult = await executeTool(tc.function.name, args);
      if (toolResult.route) route = toolResult.route;
      conversationMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult.result) });
    }
  }

  const final = await groq.chat.completions.create({ model: GROQ_MODEL, messages: conversationMessages, temperature: 0.5, max_tokens: 500 });
  return NextResponse.json({ success: true, message: sanitizeResponse(final.choices[0]?.message?.content || "Done!"), route });
}

// ============ GEMINI AGENTIC LOOP (FALLBACK) ============
async function runGeminiChat(systemWithContext: string, messages: any[]): Promise<NextResponse> {
  const geminiHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const msg of messages) {
    geminiHistory.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.content }] });
  }

  let route: string | undefined;
  let pendingAction: any = null;
  const WRITE_OPS = ["create", "update", "updateMany", "delete", "deleteMany", "upsert"];

  const chat = ai_geminiChat(systemWithContext, geminiHistory);
  const lastMessage = geminiHistory[geminiHistory.length - 1];
  let response = await (await chat).sendMessage({ message: lastMessage.parts[0].text });

  for (let round = 0; round < 5; round++) {
    const parts = response.candidates?.[0]?.content?.parts || [];
    const functionCalls = parts.filter((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      const text = parts.map((p: any) => p.text || "").join("");
      return NextResponse.json({ success: true, message: sanitizeResponse(text || "Could you rephrase?"), route, action: pendingAction });
    }

    const functionResponses: any[] = [];
    let hasWriteOp = false;

    for (const part of functionCalls) {
      const fc = (part as any).functionCall;
      if (fc.name === "execute_prisma_operation" && WRITE_OPS.includes(fc.args?.operation)) {
        hasWriteOp = true;
        pendingAction = { type: "TOOL_CALL", tool_name: fc.name, data: fc.args };
      }
      if (!hasWriteOp) {
        const toolResult = await executeTool(fc.name, fc.args || {});
        if (toolResult.route) route = toolResult.route;
        functionResponses.push({ name: fc.name, response: { result: toolResult.result } });
      }
    }

    if (hasWriteOp) {
      const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join("") || "Please review and confirm.";
      return NextResponse.json({ success: true, message: sanitizeResponse(text), action: pendingAction, route });
    }

    response = await (await chat).sendMessage({ message: functionResponses.map(fr => ({ functionResponse: fr })) });
  }

  const finalText = response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "Done!";
  return NextResponse.json({ success: true, message: sanitizeResponse(finalText), route });
}

function ai_geminiChat(systemWithContext: string, history: any[]) {
  return gemini.chats.create({
    model: GEMINI_MODEL,
    config: {
      systemInstruction: systemWithContext,
      tools: [{ functionDeclarations: GEMINI_TOOLS }],
      temperature: 0.5,
      maxOutputTokens: 800,
    },
    history: history.slice(0, -1),
  });
}

// ============ MAIN HANDLER ============
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const [customerCount, dormantCount, atRiskCount, highValueCount, campaignCount] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { lifecycle_stage: "DORMANT" } }),
      prisma.customer.count({ where: { lifecycle_stage: "AT_RISK" } }),
      prisma.customer.count({ where: { rfm_score: "HIGH_VALUE" } }),
      prisma.campaign.count(),
    ]);

    const contextNote = `\n\n[LIVE CRM SNAPSHOT]: Total: ${customerCount} | Dormant: ${dormantCount} | At-risk: ${atRiskCount} | High-value: ${highValueCount} | Campaigns: ${campaignCount}`;
    const systemWithContext = SYSTEM_PROMPT + contextNote;

    // Try Groq first, fall back to Gemini
    try {
      return await runGroqChat(systemWithContext, messages);
    } catch (groqError: any) {
      console.warn(`Groq chat failed (${groqError?.status || groqError?.message}), falling back to Gemini...`);
      try {
        return await runGeminiChat(systemWithContext, messages);
      } catch (geminiError: any) {
        console.error("Both providers failed:", geminiError?.message);
        return NextResponse.json({ success: false, error: "Both AI providers are temporarily unavailable. Please try again shortly." }, { status: 503 });
      }
    }

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
