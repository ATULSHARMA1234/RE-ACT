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

    // 3. Fetch current communication to check state
    const communication = await prisma.communication.findUnique({
      where: { id: communication_id },
      select: { status: true }
    });

    if (!communication) {
      return NextResponse.json({ error: "Communication not found" }, { status: 404 });
    }

    const EVENT_WEIGHTS: Record<string, number> = {
      PENDING: 0,
      SENT: 1,
      DELIVERED: 2,
      OPENED: 3,
      READ: 4,
      CLICKED: 5,
      FAILED: 99
    };

    const currentWeight = EVENT_WEIGHTS[communication.status] || 0;
    const incomingWeight = EVENT_WEIGHTS[event_type] || 0;

    const updateData: any = {};
    
    // Only upgrade the status if the incoming event is further along the lifecycle
    if (incomingWeight > currentWeight) {
      updateData.status = event_type;
    }

    const eventDate = timestamp ? new Date(timestamp) : new Date();

    if (event_type === 'SENT') updateData.sent_at = eventDate;
    else if (event_type === 'DELIVERED') updateData.delivered_at = eventDate;
    else if (event_type === 'OPENED') updateData.opened_at = eventDate;
    else if (event_type === 'READ') { /* READ updates status but has no dedicated timestamp column */ }
    else if (event_type === 'CLICKED') updateData.clicked_at = eventDate;
    else if (event_type === 'FAILED') updateData.failed_at = eventDate;

    // Only hit the DB if there is actually data to update
    if (Object.keys(updateData).length > 0) {
      await prisma.communication.update({
        where: { id: communication_id },
        data: updateData
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Receipt processing error:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
}
