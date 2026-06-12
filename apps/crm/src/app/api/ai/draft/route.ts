import { NextResponse } from "next/server";
import { draftMessage } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { campaignGoal, audienceDescription, channel } = await req.json();

    if (!campaignGoal || !channel) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const message = await draftMessage(campaignGoal, audienceDescription || "All customers", channel);

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error("AI Draft Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate message" },
      { status: 500 }
    );
  }
}
