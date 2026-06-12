import { NextResponse } from "next/server";
import { generateWorkflowNodes } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Missing required prompt" }, { status: 400 });
    }

    const workflowData = await generateWorkflowNodes(prompt);

    return NextResponse.json({
      success: true,
      workflow: workflowData,
    });
  } catch (error: any) {
    console.error("AI Workflow Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate workflow" },
      { status: 500 }
    );
  }
}
