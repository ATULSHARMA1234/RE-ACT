import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    // Delete in correct relational order (children first, then parents)
    await prisma.commEvent.deleteMany({});
    await prisma.communication.deleteMany({});
    await prisma.workflowJob.deleteMany({});
    await prisma.customerEvent.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.segment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.workflow.deleteMany({});
    await prisma.customer.deleteMany({});

    return NextResponse.json({ success: true, message: "CRM database has been completely reset." });
  } catch (error: any) {
    console.error("Database Reset Error:", error);
    return NextResponse.json({ error: "Failed to reset database" }, { status: 500 });
  }
}
