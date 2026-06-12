import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

/**
 * AI Intent Parser — translates natural language into a structured segment filter JSON.
 * Example output:
 * {
 *   "lifecycle_stage": ["ACTIVE", "AT_RISK"],
 *   "rfm_score": ["HIGH_VALUE"],
 *   "channel_pref": ["WHATSAPP"],
 *   "min_orders": 2,
 *   "max_days_since_purchase": 90,
 *   "min_spend": 500
 * }
 */
export async function parseSegmentIntent(naturalLanguageQuery: string) {
  const systemPrompt = `You are REACH CRM's AI segmentation engine. Given a marketer's natural language description of their target audience, convert it into a structured JSON filter.

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

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: naturalLanguageQuery },
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return JSON.parse(content);
}

/**
 * AI Message Drafter — generates personalized campaign copy.
 * Accepts audience context and returns copy with template tokens.
 */
export async function draftMessage(
  campaignGoal: string,
  audienceDescription: string,
  channel: string
) {
  const systemPrompt = `You are REACH CRM's AI message copywriter. Generate a personalized campaign message for a D2C brand.

Rules:
1. Use these template tokens: {{first_name}}, {{last_product}}, {{days_since_purchase}}
2. Keep the tone warm, professional, and brand-friendly.
3. Channel is: ${channel}. Adjust length accordingly:
   - EMAIL: can be longer (3-5 sentences), include a subject line on the first line prefixed with "Subject: "
   - WHATSAPP: short and conversational (2-3 sentences), use emojis sparingly
   - SMS: very short (1-2 sentences, under 160 chars), direct CTA
4. Include a clear call-to-action.
5. Return ONLY the message text, no extra formatting or explanation.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Campaign goal: ${campaignGoal}\nTarget audience: ${audienceDescription}\nChannel: ${channel}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return content.trim();
}

/**
 * Proactive AI Advisor — generates campaign recommendations based on database stats.
 * Returns an array of campaign recommendation objects.
 */
export async function generateProactiveCampaigns(statsSummary: string) {
  const systemPrompt = `You are REACH CRM's Proactive AI Marketing Advisor (Co-Pilot).
Your task is to analyze the brand's current customer stats and recommend exactly 3 highly actionable, targeted marketing campaign ideas.

For each idea, specify:
1. title: A catchy name for the campaign (e.g., "Win Back Lapsed VIPs")
2. reason: Why you are recommending this (refer to the stats provided, e.g., "We detected 24 high-value customers are in the DORMANT stage.")
3. channel: Recommended channel (must be exactly: "EMAIL", "WHATSAPP", or "SMS")
4. suggestedGoal: The instructions/goal to pass to the AI copywriter (e.g., "Win back dormant VIP customers with a special 20% loyalty discount code.")

Return ONLY a JSON object containing a "recommendations" array with exactly 3 items. Do not return markdown, explanation, or code blocks.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the current state of our CRM:\n${statsSummary}` },
    ],
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return JSON.parse(content);
}

/**
 * AI Text-to-Workflow Generator
 * Generates structured React Flow nodes and edges from a natural language prompt.
 */
export async function generateWorkflowNodes(prompt: string) {
  const systemPrompt = `You are REACH CRM's Workflow AI Architect. Your job is to convert a natural language description of an automation campaign into a structured React Flow JSON object.

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

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create a workflow for: ${prompt}` },
    ],
    temperature: 0.2,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return JSON.parse(content);
}

/**
 * AI Voice Command Parser
 * Takes a natural language transcript and maps it to a strict Action Schema.
 */
export async function parseVoiceCommand(transcript: string) {
  const systemPrompt = `You are the REACH CRM Agentic Copilot. Your job is to parse a user's voice command and map it to a specific actionable intent.

Available Actions:
1. CREATE_WORKFLOW
   - user wants to build/create an automated sequence/workflow.
   - extract: 'name' (string), 'prompt' (string: detailed description of what it should do).
2. CREATE_SEGMENT
   - user wants to create an audience segment.
   - extract: 'name' (string), 'description' (string: who is in this segment).
3. CREATE_CAMPAIGN
   - user wants to draft/create a marketing campaign.
   - extract: 'name' (string), 'channel' (string: e.g. "EMAIL", "WHATSAPP", "SMS", or multiple comma-separated like "EMAIL, SMS"), 'target_audience' (string: who should receive it), 'goal' (string: what the message should say).
4. PAUSE_CAMPAIGN
   - user wants to pause or stop a campaign.
   - extract: 'campaign_name' (string: the name or a fuzzy description of the campaign to pause).
5. QUERY_DATA
   - user asks a question about their metrics or data (e.g. "how many VIP customers do we have?").
   - extract: 'question' (string: the exact question asked).
6. NAVIGATE
   - user just wants to view a page (e.g. "go to dashboard", "show customers").
   - extract: 'page' (string: "dashboard", "workflows", "campaigns", "customers", "settings").

Rules:
- Return ONLY a JSON object containing { "action": "ACTION_NAME", "payload": { ... } }.
- If the user says "build a workflow that sends a message to inactive members", map to CREATE_WORKFLOW with prompt="sends a message to inactive members".
- Do not add markdown or explanation.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Voice transcript: "${transcript}"` },
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return JSON.parse(content);
}

/**
 * AI Data Analyst
 * Takes a context string (database summary) and a user's question, and returns a natural language answer.
 */
export async function queryDataAI(contextStr: string, question: string) {
  const systemPrompt = `You are the REACH CRM Data Analyst. You are given a summary of the current database state as context.
Answer the user's question accurately using ONLY the provided context. 
Keep your answer short, conversational, and direct (1-2 sentences), because it will be spoken out loud via Text-to-Speech to the user.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Context:\n${contextStr}\n\nQuestion: ${question}` },
    ],
    temperature: 0.1,
    max_tokens: 150,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return content.trim();
}

/**
 * AI Attribution Analyst
 * Takes aggregated campaign revenue metrics and generates a 2-sentence actionable insight.
 */
export async function generateAttributionInsight(statsSummary: string) {
  const systemPrompt = `You are the REACH CRM Chief Marketing Officer (AI).
Analyze the provided Revenue Attribution metrics.
Write a 2-sentence actionable insight highlighting the best performing channel by ROI/Revenue and recommending a budget shift or strategy adjustment.
Keep it punchy, professional, and data-driven. Do not use markdown formatting.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Metrics:\n${statsSummary}` },
    ],
    temperature: 0.4,
    max_tokens: 150,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");

  return content.trim();
}
