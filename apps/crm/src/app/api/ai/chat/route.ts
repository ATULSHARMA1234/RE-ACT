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
5. **General marketing advice**: D2C best practices, retention strategies, etc.

When the user asks to build a segment or create a campaign, respond in a friendly conversational way AND also include structured action cards using this JSON format embedded in your response:

For segment suggestions, add this EXACTLY at the end of your text response:
ACTION:SEGMENT:{"lifecycle_stage":[],"rfm_score":[],"channel_pref":[],"min_orders":null,"max_days_since_purchase":null}

For campaign suggestions, add this EXACTLY at the end of your text response:
ACTION:CAMPAIGN:{"name":"","channel":"EMAIL","goal":""}

Rules:
- Be concise but insightful. No fluff.
- Always refer to the brand's customers as their most valuable asset.
- Use data-driven reasoning. If no data is mentioned, ask a clarifying question.
- Sound like a sharp, senior growth marketer, not a generic AI.
- Never break character.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, stats } = await req.json();

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
      temperature: 0.65,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || "";

    // Parse action cards from response
    let action = null;
    let cleanContent = content;

    const segmentMatch = content.match(/ACTION:SEGMENT:(\{.*?\})/s);
    const campaignMatch = content.match(/ACTION:CAMPAIGN:(\{.*?\})/s);

    if (segmentMatch) {
      try {
        action = { type: "SEGMENT", data: JSON.parse(segmentMatch[1]) };
        cleanContent = content.replace(/ACTION:SEGMENT:\{.*?\}/s, "").trim();
      } catch (_) {}
    } else if (campaignMatch) {
      try {
        action = { type: "CAMPAIGN", data: JSON.parse(campaignMatch[1]) };
        cleanContent = content.replace(/ACTION:CAMPAIGN:\{.*?\}/s, "").trim();
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: cleanContent,
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
