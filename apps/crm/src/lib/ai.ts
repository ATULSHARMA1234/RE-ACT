import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

// Dual providers
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const gemini = new GoogleGenAI({ apiKey: (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)! });

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GROQ_TIMEOUT_MS = 8000; // Fail fast to Gemini if Groq is slow

/**
 * Safely parse JSON from AI responses that may contain markdown fences or extra text.
 */
function safeParseJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Extract first JSON object from the text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {}
  }

  throw new Error(`Failed to parse JSON from AI response: ${text.substring(0, 200)}`);
}

/**
 * Dual-provider AI call: tries Groq first, falls back to Gemini on any error.
 */
async function callAI(systemPrompt: string, userMessage: string, config?: { temperature?: number; maxTokens?: number; json?: boolean }): Promise<string> {
  // --- Attempt 1: Groq (with timeout) ---
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: config?.temperature ?? 0.5,
      max_tokens: config?.maxTokens ?? 800,
      ...(config?.json ? { response_format: { type: "json_object" } } : {}),
    }, { signal: controller.signal } as any);
    clearTimeout(timeout);
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty Groq response");
    return content;
  } catch (groqError: any) {
    console.warn(`Groq failed (${groqError?.name === 'AbortError' ? 'timeout' : groqError?.status || groqError?.message}), falling back to Gemini...`);
  }

  // --- Attempt 2: Gemini fallback ---
  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: config?.temperature ?? 0.5,
        maxOutputTokens: config?.maxTokens ?? 800,
        ...(config?.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    const text = response.text;
    if (!text) throw new Error("Empty Gemini response");
    return text;
  } catch (geminiError: any) {
    console.error("Both Groq and Gemini failed:", geminiError?.message);
    throw new Error("All AI providers failed. Please try again in a moment.");
  }
}

/**
 * AI Intent Parser — translates natural language into a structured segment filter JSON.
 */
export async function parseSegmentIntent(naturalLanguageQuery: string) {
  const systemPrompt = `You are Radiance CRM's AI segmentation engine. Given a marketer's natural language description of their target audience, convert it into a structured JSON filter.

Available filter fields:
- lifecycle_stage: array of ["NEW", "ACTIVE", "AT_RISK", "DORMANT"]
- rfm_score: array of ["HIGH_VALUE", "MID_TIER", "LOW_VALUE"]
- channel_pref: array of ["EMAIL", "WHATSAPP", "SMS"]
- min_orders: minimum number of orders (integer)
- max_orders: maximum number of orders (integer)
- min_spend: minimum total spend amount (number)
- max_spend: maximum total spend amount (number)
- max_days_since_purchase: maximum days since last purchase (integer)
- min_days_since_purchase: minimum days since last purchase (integer)

Rules:
1. Only include fields that are mentioned or implied in the query.
2. Return ONLY valid JSON, no markdown, no explanation.
3. Use arrays for enum fields even if there's only one value.
4. If the user mentions "high value" or "VIP" or "best customers", map to rfm_score: ["HIGH_VALUE"].
5. If the user mentions "inactive" or "haven't purchased" or "lapsed", map to lifecycle_stage: ["AT_RISK", "DORMANT"] and/or max_days_since_purchase.
6. If the user mentions "repeat" or "loyal" or "bought multiple times", use min_orders >= 2.`;

  const content = await callAI(systemPrompt, naturalLanguageQuery, {
    temperature: 0.1,
    maxTokens: 500,
    json: true,
  });

  return safeParseJSON(content);
}

/**
 * AI Message Drafter — generates personalized campaign copy.
 */
export async function draftMessage(
  campaignGoal: string,
  audienceDescription: string,
  channel: string
) {
  const systemPrompt = `You are Radiance CRM's AI message copywriter. Generate a personalized campaign message for a D2C brand.

Rules:
1. Use these template tokens: {{first_name}}, {{last_product}}, {{days_since_purchase}}
2. Keep the tone warm, professional, and brand-friendly.
3. Channel is: ${channel}. Adjust length accordingly:
   - EMAIL: can be longer (3-5 sentences), include a subject line on the first line prefixed with "Subject: "
   - WHATSAPP: short and conversational (2-3 sentences), use emojis sparingly
   - SMS: very short (1-2 sentences, under 160 chars), direct CTA
4. Include a clear call-to-action.
5. Return ONLY the message text, no extra formatting or explanation.`;

  const content = await callAI(
    systemPrompt,
    `Campaign goal: ${campaignGoal}\nTarget audience: ${audienceDescription}\nChannel: ${channel}`,
    { temperature: 0.7, maxTokens: 500 }
  );

  return content.trim();
}

/**
 * Proactive AI Advisor — generates campaign recommendations based on database stats.
 */
export async function generateProactiveCampaigns(statsSummary: string) {
  const systemPrompt = `You are Radiance CRM's Proactive AI Marketing Advisor (Aura).
Your task is to analyze the brand's current customer stats and recommend exactly 3 highly actionable, targeted marketing campaign ideas.

For each idea, specify:
1. title: A catchy name for the campaign (e.g., "Win Back Lapsed VIPs")
2. reason: Why you are recommending this (refer to the stats provided)
3. channel: Recommended channel (must be exactly: "EMAIL", "WHATSAPP", or "SMS")
4. suggestedGoal: The instructions/goal to pass to the AI copywriter

Return ONLY a JSON object containing a "recommendations" array with exactly 3 items.`;

  const content = await callAI(
    systemPrompt,
    `Here is the current state of our CRM:\n${statsSummary}`,
    { temperature: 0.9, maxTokens: 800, json: true }
  );

  return safeParseJSON(content);
}

/**
 * AI Text-to-Workflow Generator
 */
export async function generateWorkflowNodes(prompt: string) {
  const systemPrompt = `You are Radiance CRM's Workflow AI Architect. Your job is to convert a natural language description of an automation campaign into a structured React Flow JSON object.

Valid Custom Node Types:
1. 'triggerNode' - Event Source. Config: { condition: string, value?: string }
2. 'delayNode' - Wait Time. Config: { time: string }
3. 'splitNode' - Branch. Config: { split_type: string, percentage?: number, condition_segment_id?: string }
4. 'messageNode' - Communication. Config: { channel: string, content: string }
5. 'actionNode' - Tag/Update Profile. Config: { tag_name: string }

Rules:
- The first node MUST be a 'triggerNode'.
- Each node must have a unique string 'id' (e.g., 'dndnode_1', 'dndnode_2').
- 'position' must be { x: number, y: number }. Space nodes vertically.
- 'data' must contain: { originalType: string, config: object }.
- Edges: { id: string, source: string, target: string }.
- Return ONLY a JSON object containing { "nodes": [], "edges": [] }.`;

  const content = await callAI(
    systemPrompt,
    `Create a workflow for: ${prompt}`,
    { temperature: 0.2, maxTokens: 1500, json: true }
  );

  return safeParseJSON(content);
}

/**
 * AI Voice Command Parser
 */
export async function parseVoiceCommand(transcript: string) {
  const systemPrompt = `You are the Radiance CRM Agentic Assistant (Aura). Parse a user's voice command into a specific action.

Available Actions:
1. UPDATE_SETTINGS - extract: 'field' (string), 'value' (number).
2. CREATE_WORKFLOW - extract: 'name' (string), 'prompt' (string describing the workflow steps).
3. CREATE_SEGMENT - extract: 'name' (string), 'description' (string describing the audience).
4. CREATE_CAMPAIGN - extract: 'name' (string), 'channel' ("EMAIL"|"WHATSAPP"|"SMS"), 'target_audience' (string), 'goal' (string).
5. PAUSE_CAMPAIGN - extract: 'campaign_name' (string).
6. QUERY_DATA - extract: 'question' (string). Use this for any data questions like "how many customers", "total revenue", "show stats", etc.
7. NAVIGATE - extract: 'page' ("dashboard"|"workflows"|"campaigns"|"customers"|"settings"|"segments"|"live-feed"|"analytics"). Use this when user says "go to", "open", "show me", "take me to".

IMPORTANT RULES:
- If the transcript is unclear or general (like "hello", "hi", "help"), treat it as QUERY_DATA with question set to the transcript.
- If user mentions trigger events or time delays, use CREATE_WORKFLOW.
- Always pick the BEST matching action. Never return an error or empty response.
- Return ONLY a valid JSON object: { "action": "ACTION_NAME", "payload": { ... } }
- Do NOT wrap in markdown code fences. Return raw JSON only.`;

  const content = await callAI(
    systemPrompt,
    `Voice transcript: "${transcript}"`,
    { temperature: 0.1, maxTokens: 200, json: true }
  );

  return safeParseJSON(content);
}

/**
 * AI Data Analyst
 */
export async function queryDataAI(contextStr: string, question: string) {
  const systemPrompt = `You are the Radiance CRM Data Analyst (Aura). Answer using ONLY the provided context. Keep it short (1-2 sentences) for TTS. Always use Indian Rupees (₹) for monetary values.`;

  const content = await callAI(
    systemPrompt,
    `Context:\n${contextStr}\n\nQuestion: ${question}`,
    { temperature: 0.1, maxTokens: 150 }
  );

  return content.trim();
}

/**
 * AI Attribution Analyst
 */
export async function generateAttributionInsight(statsSummary: string) {
  const systemPrompt = `You are the Radiance CRM CMO (Aura). Analyze Revenue Attribution metrics. Write a 2-sentence actionable insight highlighting the best performing channel and recommending a strategy adjustment. No markdown.`;

  const content = await callAI(
    systemPrompt,
    `Metrics:\n${statsSummary}`,
    { temperature: 0.4, maxTokens: 150 }
  );

  return content.trim();
}

/**
 * AI Campaign Analyst
 */
export async function generateCampaignInsights(metricsSummary: string) {
  const systemPrompt = `You are the Radiance CRM AI Analyst (Aura). Provide exactly 2 concise, actionable recommendations for follow-up campaigns.
Return ONLY a JSON object: { "recommendations": ["...", "..."] }`;

  const content = await callAI(
    systemPrompt,
    `Metrics:\n${metricsSummary}`,
    { temperature: 0.5, maxTokens: 300, json: true }
  );

  return safeParseJSON(content);
}
