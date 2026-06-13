import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { targetStatus, channel, messageTemplate } = await req.json();

    if (!targetStatus || !channel || !messageTemplate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch parent campaign and its communications
    const parentCampaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        communications: true,
      }
    });

    if (!parentCampaign) {
      return NextResponse.json({ error: "Parent campaign not found" }, { status: 404 });
    }

    // 2. Filter target customers based on their latest communication status for this campaign
    let targetComms = parentCampaign.communications;
    if (targetStatus !== "ALL") {
      targetComms = targetComms.filter(c => c.status === targetStatus);
    }

    if (targetComms.length === 0) {
      return NextResponse.json({ error: "No customers match the selected status" }, { status: 400 });
    }

    const customerIds = targetComms.map(c => c.customer_id);

    // 3. Create a static segment for these exact customers
    const followUpSegment = await prisma.segment.create({
      data: {
        name: `Follow-up to: ${parentCampaign.name} (${targetStatus})`,
        filter_json: { static_ids: customerIds },
        is_dynamic: false
      }
    });

    // 4. Fire the new campaign using the existing fire endpoint internally
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const fireUrl = `${protocol}://${host}/api/campaigns/fire`;

    const fireRes = await fetch(fireUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Follow-up: ${parentCampaign.name}`,
        segment_id: followUpSegment.id,
        channel,
        message_template: messageTemplate
      })
    });

    const fireData = await fireRes.json();

    if (!fireRes.ok) {
      throw new Error(fireData.error || "Failed to fire follow-up campaign");
    }

    return NextResponse.json({ 
      success: true, 
      campaign_id: fireData.campaign_id,
      recipient_count: fireData.recipient_count 
    });

  } catch (error: any) {
    console.error("Follow-up error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create follow-up campaign" },
      { status: 500 }
    );
  }
}
