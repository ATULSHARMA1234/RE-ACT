import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CHANNEL_STUB_URL = process.env.CHANNEL_STUB_URL || "http://localhost:3001";

/**
 * Process pending workflow jobs that are due for execution.
 * Called by the channel-stub poller every 30 seconds.
 */
export async function POST() {
  try {
    // Find all pending jobs where execute_at <= now
    const dueJobs = await prisma.workflowJob.findMany({
      where: {
        status: "PENDING",
        execute_at: { lte: new Date() },
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        workflow: { select: { id: true, name: true } },
      },
      take: 50, // Process in batches of 50
    });

    if (dueJobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    console.log(`[Job Processor] Found ${dueJobs.length} due workflow jobs`);

    let processed = 0;
    let failed = 0;

    for (const job of dueJobs) {
      try {
        // Create a Communication record for tracking
        const communication = await prisma.communication.create({
          data: {
            customer_id: job.customer_id,
            workflow_id: job.workflow_id,
            channel: job.channel,
            message_content: job.message,
            status: "PENDING",
          },
        });

        // Send via channel stub
        const sendRes = await fetch(`${CHANNEL_STUB_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            communications: [
              {
                communication_id: communication.id,
                customer_id: job.customer_id,
                campaign_id: `workflow_${job.workflow_id}`,
                channel: job.channel,
                message: job.message,
              },
            ],
          }),
        });

        if (sendRes.ok) {
          await prisma.workflowJob.update({
            where: { id: job.id },
            data: { status: "COMPLETED" },
          });
          processed++;
          console.log(
            `[Job Processor] ✅ Sent ${job.channel} to ${job.customer.name} (workflow: ${job.workflow.name})`
          );
        } else {
          throw new Error(`Channel stub returned ${sendRes.status}`);
        }
      } catch (jobErr: any) {
        console.error(`[Job Processor] ❌ Failed job ${job.id}:`, jobErr.message);
        await prisma.workflowJob.update({
          where: { id: job.id },
          data: { status: "FAILED" },
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      message: `Processed ${processed} jobs, ${failed} failed`,
    });
  } catch (error: any) {
    console.error("[Job Processor] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
