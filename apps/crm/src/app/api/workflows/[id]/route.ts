import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to fetch workflow:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const workflow = await prisma.workflow.update({
      where: { id: params.id },
      data: {
        name: body.name,
        nodes_json: body.nodes_json,
        status: body.status,
      },
    });
    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.workflow.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
