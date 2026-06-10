import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { created_at: "desc" }
    });
    return NextResponse.json({ segments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch segments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const segment = await prisma.segment.create({
      data: {
        name: body.name,
        filter_json: body.filter,
        is_dynamic: true
      }
    });
    return NextResponse.json({ success: true, segment });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create segment" }, { status: 500 });
  }
}
