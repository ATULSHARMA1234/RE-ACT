import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const segments = await prisma.segment.findMany({
      where: {
        name: {
          not: {
            startsWith: "Follow-up"
          }
        }
      },
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

    let filterJson = body.filter;

    // If naturalLanguage is provided, use AI to generate the filter
    if (body.naturalLanguage && !filterJson) {
      const { parseSegmentIntent } = await import("@/lib/ai");
      filterJson = await parseSegmentIntent(body.naturalLanguage);
    }

    if (!filterJson) {
      return NextResponse.json({ error: "Either 'filter' or 'naturalLanguage' is required" }, { status: 400 });
    }

    const segment = await prisma.segment.create({
      data: {
        name: body.name || "AI Segment",
        filter_json: filterJson,
        is_dynamic: true
      }
    });
    return NextResponse.json({ success: true, id: segment.id, name: segment.name, segment });
  } catch (error: any) {
    console.error("Segment creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to create segment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Segment ID is required" }, { status: 400 });
    }

    // Check if segment is used in campaigns
    const count = await prisma.campaign.count({ where: { segment_id: id } });
    if (count > 0) {
      return NextResponse.json({ error: "Cannot delete segment because it is used by existing campaigns." }, { status: 400 });
    }

    await prisma.segment.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete segment" }, { status: 500 });
  }
}
