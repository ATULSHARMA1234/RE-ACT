import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
const MODEL = "gemini-2.0-flash";

/**
 * Helper: call Gemini with a system prompt and user message, return text
 */
async function callGemini(systemPrompt: string, userMessage: string, config?: { temperature?: number; maxOutputTokens?: number; responseMimeType?: string }): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      temperature: config?.temperature ?? 0.5,
      maxOutputTokens: config?.maxOutputTokens ?? 800,
      responseMimeType: config?.responseMimeType,
    },
  });
  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return text;
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

  const content = await callGemini(systemPrompt, naturalLanguageQuery, {
    temperature: 0.1,
    maxOutputTokens: 500,
    responseMimeType: "application/json",
  });

  return JSON.parse(content);
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

  const content = await callGemini(
    systemPrompt,
    `Campaign goal: ${campaignGoal}\nTarget audience: ${audienceDescription}\nChannel: ${channel}`,
    { temperature: 0.7, maxOutputTokens: 500 }
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
2. reason: Why you are recommending this (refer to the stats provided, e.g., "We detected 24 high-value customers are in the DORMANT stage.")
3. channel: Recommended channel (must be exactly: "EMAIL", "WHATSAPP", or "SMS")
4. suggestedGoal: The instructions/goal to pass to the AI copywriter (e.g., "Win back dormant VIP customers with a special 20% loyalty discount code.")

Return ONLY a JSON object containing a "recommendations" array with exactly 3 items. Do not return markdown, explanation, or code blocks.`;

  const content = await callGemini(
    systemPrompt,
    `Here is the current state of our CRM:\n${statsSummary}`,
    { temperature: 0.7, maxOutputTokens: 800, responseMimeType: "application/json" }
  );

  return JSON.parse(content);
}

/**
 * AI Text-to-Workflow Generator
 */
export async function generateWorkflowNodes(prompt: string) {
  const systemPrompt = `You are Radiance CRM's Workflow AI Architect. Your job is to convert a natural language description of an automation campaign into a structured React Flow JSON object.

Valid Custom Node Types:
1. 'triggerNode' - Event Source (e.g., Cart Abandoned, Joined Segment). Config: { condition: string, value?: string }
2. 'delayNode' - Wait Time (e.g., 2 Hours). Config: { time: string }
3. 'splitNode' - Branch (e.g., A/B Test, Check Segment). Config: { split_type: string, percentage?: number, condition_segment_id?: string }
4. 'messageNode' - Communication (e.g., Email, SMS). Config: { channel: string, content: string }
5. 'actionNode' - Tag/Update Profile (e.g., VIP tag). Config: { tag_name: string }

Rules:
- The first node MUST be a 'triggerNode'.
- Each node must have a unique string 'id' (e.g., 'dndnode_1', 'dndnode_2').
- 'position' must be { x: number, y: number }. Space nodes out vertically (e.g. y = 50, 150, 250).
- 'data' must contain: { originalType: string, config: object }. The originalType is "trigger", "delay", "split", "message", or "action".
- Edges must connect nodes. An edge is { id: string, source: string, target: string }.
- Return ONLY a JSON object containing { "nodes": [], "edges": [] }. No markdown, no extra text.`;

  const content = await callGemini(
    systemPrompt,
    `Create a workflow for: ${prompt}`,
    { temperature: 0.2, maxOutputTokens: 1500, responseMimeType: "application/json" }
  );

  return JSON.parse(content);
}

/**
 * AI Voice Command Parser
 */
export async function parseVoiceCommand(transcript: string) {
  const systemPrompt = `You are the Radiance CRM Agentic Assistant (Aura). Your job is to parse a user's voice command and map it to a specific actionable intent.

Available Actions:
1. UPDATE_SETTINGS
   - user wants to change/update/set/modify any CRM setting (e.g. dormant days, at-risk days, min spend, min orders).
   - extract: 'field' (string: exact field name from Settings model, e.g. "dormant_days", "at_risk_days", "high_value_min_spend", "high_value_min_orders", "mid_tier_min_spend", "mid_tier_min_orders"), 'value' (number: the new value).
2. CREATE_WORKFLOW
   - user wants to build an AUTOMATED SEQUENCE triggered by an EVENT with DELAYS and CONDITIONS.
   - Keywords: "after", "when", "trigger", "delay", "wait", "hours later", "days later", "automated", "sequence", "workflow".
   - extract: 'name' (string), 'prompt' (string: full description with trigger event, delays, channels, and message intent).
3. CREATE_SEGMENT
   - user wants to create an audience segment/group.
   - extract: 'name' (string), 'description' (string: who is in this segment).
4. CREATE_CAMPAIGN
   - user wants to send a ONE-TIME blast or broadcast RIGHT NOW.
   - Keywords: "send to all", "blast", "broadcast", "campaign", "announce", "promote".
   - extract: 'name' (string), 'channel' (string: "EMAIL", "WHATSAPP", "SMS"), 'target_audience' (string), 'goal' (string).
5. PAUSE_CAMPAIGN
   - user wants to pause or stop a campaign.
   - extract: 'campaign_name' (string).
6. QUERY_DATA
   - user asks a question about their metrics or data.
   - extract: 'question' (string: the exact question asked).
7. NAVIGATE
   - user just wants to view a page.
   - extract: 'page' (string: "dashboard", "workflows", "campaigns", "customers", "settings").

CRITICAL: If the user mentions a TRIGGER EVENT or TIME DELAY, it is ALWAYS CREATE_WORKFLOW. A CAMPAIGN is a one-time send.
Return ONLY a JSON object containing { "action": "ACTION_NAME", "payload": { ... } }.`;

  const content = await callGemini(
    systemPrompt,
    `Voice transcript: "${transcript}"`,
    { temperature: 0.1, maxOutputTokens: 500, responseMimeType: "application/json" }
  );

  return JSON.parse(content);
}

/**
 * AI Data Analyst
 */
export async function queryDataAI(contextStr: string, question: string) {
  const systemPrompt = `You are the Radiance CRM Data Analyst (Aura). You are given a summary of the current database state as context.
Answer the user's question accurately using ONLY the provided context. 
Keep your answer short, conversational, and direct (1-2 sentences), because it will be spoken out loud via Text-to-Speech to the user.`;

  const content = await callGemini(
    systemPrompt,
    `Context:\n${contextStr}\n\nQuestion: ${question}`,
    { temperature: 0.1, maxOutputTokens: 150 }
  );

  return content.trim();
}

/**
 * AI Attribution Analyst
 */
export async function generateAttributionInsight(statsSummary: string) {
  const systemPrompt = `You are the Radiance CRM Chief Marketing Officer (Aura).
Analyze the provided Revenue Attribution metrics.
Write a 2-sentence actionable insight highlighting the best performing channel by ROI/Revenue and recommending a budget shift or strategy adjustment.
Keep it punchy, professional, and data-driven. Do not use markdown formatting.`;

  const content = await callGemini(
    systemPrompt,
    `Metrics:\n${statsSummary}`,
    { temperature: 0.4, maxOutputTokens: 150 }
  );

  return content.trim();
}

/**
 * AI Campaign Analyst
 */
export async function generateCampaignInsights(metricsSummary: string) {
  const systemPrompt = `You are the Radiance CRM AI Analyst (Aura).
Analyze the following campaign performance metrics. Provide exactly 2 concise, actionable recommendations for follow-up campaigns or actions that would bring in more customers or improve conversions.
Return ONLY a JSON object with an array "recommendations" containing strings. No markdown, no explanation.
Example: { "recommendations": ["Send a follow-up SMS to users who opened but didn't click.", "Create a 'Win Back' segment for those who failed delivery."] }`;

  const content = await callGemini(
    systemPrompt,
    `Metrics:\n${metricsSummary}`,
    { temperature: 0.5, maxOutputTokens: 300, responseMimeType: "application/json" }
  );

  return JSON.parse(content);
}
