import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { updated_at: "desc" },
    });
    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const workflow = await prisma.workflow.create({
      data: {
        name: body.name || "Untitled Workflow",
        nodes_json: body.nodes_json || [],
        status: body.status || "DRAFT",
      },
    });
    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
