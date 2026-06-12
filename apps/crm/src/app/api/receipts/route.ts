import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { communication_id, event_type, timestamp } = payload;

    if (!communication_id || !event_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Check if event already exists (idempotency check)
    const existingEvent = await prisma.commEvent.findUnique({
      where: {
        communication_id_event_type: {
          communication_id,
          event_type
        }
      }
    });

    if (existingEvent) {
      // Event already recorded, acknowledge idempotently
      return NextResponse.json({ success: true, message: "Event already recorded" }, { status: 200 });
    }

    // 2. Create the event
    await prisma.commEvent.create({
      data: {
        communication_id,
        event_type,
        received_at: timestamp ? new Date(timestamp) : new Date()
      }
    });

    // 3. Update the parent Communication record's status and timestamp
    const updateData: any = {
      status: event_type // PENDING -> DELIVERED -> OPENED -> CLICKED (or FAILED)
    };

    const eventDate = timestamp ? new Date(timestamp) : new Date();

    if (event_type === 'SENT') updateData.sent_at = eventDate;
    else if (event_type === 'DELIVERED') updateData.delivered_at = eventDate;
    else if (event_type === 'OPENED') updateData.opened_at = eventDate;
    else if (event_type === 'READ') { /* READ updates status but has no dedicated timestamp column */ }
    else if (event_type === 'CLICKED') updateData.clicked_at = eventDate;
    else if (event_type === 'FAILED') updateData.failed_at = eventDate;

    await prisma.communication.update({
      where: { id: communication_id },
      data: updateData
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Receipt processing error:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
}
