import { NextResponse } from "next/server";
import { draftMessage } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { campaignGoal, audienceDescription, channel } = await req.json();

    if (!campaignGoal || !audienceDescription || !channel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const messageDraft = await draftMessage(campaignGoal, audienceDescription, channel);

    return NextResponse.json({ success: true, draft: messageDraft });
  } catch (error) {
    console.error("Drafting error:", error);
    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status: 500 }
    );
  }
}
