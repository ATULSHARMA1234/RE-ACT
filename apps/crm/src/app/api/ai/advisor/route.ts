import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateProactiveCampaigns } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch aggregate metrics
    const [
      totalCustomers,
      totalCampaigns,
      stageCounts,
      rfmCounts,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.campaign.count(),
      prisma.customer.groupBy({
        by: ["lifecycle_stage"],
        _count: true,
      }),
      prisma.customer.groupBy({
        by: ["rfm_score"],
        _count: true,
      }),
    ]);

    // 2. Format a summary string for the LLM
    const stagesSummary = stageCounts
      .map((sc) => `${sc.lifecycle_stage}: ${sc._count}`)
      .join(", ");
    
    const rfmSummary = rfmCounts
      .map((rc) => `${rc.rfm_score || "Unscored"}: ${rc._count}`)
      .join(", ");

    const statsSummary = `
- Total Customers: ${totalCustomers}
- Total Campaigns Executed: ${totalCampaigns}
- Customer Distribution by Lifecycle Stage: ${stagesSummary || "None"}
- Customer Distribution by RFM Score: ${rfmSummary || "None"}
    `.trim();

    // 3. Call Groq
    const result = await generateProactiveCampaigns(statsSummary);

    return NextResponse.json({
      success: true,
      recommendations: result.recommendations || [],
    });
  } catch (error: any) {
    console.error("AI Advisor Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
