import { NextResponse } from "next/server";
import { parseVoiceCommand } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json({ success: false, error: "Missing transcript" }, { status: 400 });
    }

    const proposal = await parseVoiceCommand(transcript);

    return NextResponse.json({
      success: true,
      proposal, // e.g. { action: "CREATE_WORKFLOW", payload: { name: "...", prompt: "..." } }
    });
  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to parse command" },
      { status: 500 }
    );
  }
}
