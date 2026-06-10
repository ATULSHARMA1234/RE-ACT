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
