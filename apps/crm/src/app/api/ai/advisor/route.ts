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

    // Build lookup maps
    const stageMap: Record<string, number> = {};
    stageCounts.forEach(sc => { stageMap[sc.lifecycle_stage] = sc._count; });

    const rfmMap: Record<string, number> = {};
    rfmCounts.forEach(rc => { rfmMap[rc.rfm_score || "Unscored"] = rc._count; });

    // 2. Try AI first, fall back to rule-based if rate-limited
    let recommendations;

    try {
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

      const result = await generateProactiveCampaigns(statsSummary);
      recommendations = result.recommendations || [];
    } catch (aiError: any) {
      console.warn("AI advisor failed, using rule-based fallback:", aiError.message);
      recommendations = generateRuleBasedRecommendations(stageMap, rfmMap, totalCustomers, totalCampaigns);
    }

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    console.error("AI Advisor Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

/**
 * Rule-based fallback recommendations generated from real DB stats.
 * Used when Groq rate limit is hit or API is unavailable.
 */
function generateRuleBasedRecommendations(
  stageMap: Record<string, number>,
  rfmMap: Record<string, number>,
  totalCustomers: number,
  totalCampaigns: number
) {
  const recommendations = [];

  const dormant = stageMap["DORMANT"] || 0;
  const atRisk = stageMap["AT_RISK"] || 0;
  const active = stageMap["ACTIVE"] || 0;
  const newCust = stageMap["NEW"] || 0;
  const highValue = rfmMap["HIGH_VALUE"] || 0;
  const midTier = rfmMap["MID_TIER"] || 0;
  const lowValue = rfmMap["LOW_VALUE"] || 0;

  // Recommendation 1: Always target the biggest opportunity
  if (dormant > 0 || atRisk > 0) {
    recommendations.push({
      title: "Win Back Lapsed Customers",
      reason: `${dormant + atRisk} customers are at risk or dormant. A targeted win-back campaign with an exclusive offer could re-engage them before they churn permanently.`,
      channel: "EMAIL" as const,
      suggestedGoal: "Win back dormant and at-risk customers with a special 15% comeback discount code. Create urgency with a 48-hour expiry.",
    });
  } else {
    recommendations.push({
      title: "Welcome New Customers",
      reason: `You have ${newCust} new customers. A warm welcome campaign sets the tone for long-term engagement.`,
      channel: "EMAIL" as const,
      suggestedGoal: "Welcome new customers with a personalized onboarding message, highlight best-sellers, and offer 10% off their next purchase.",
    });
  }

  // Recommendation 2: Upsell high-value customers
  if (highValue > 0) {
    recommendations.push({
      title: "VIP Exclusive Drop",
      reason: `${highValue} high-value customers are your core revenue drivers. An exclusive early-access or VIP-only offer rewards loyalty and drives repeat purchases.`,
      channel: "WHATSAPP" as const,
      suggestedGoal: "Send high-value VIP customers an exclusive early access preview of new arrivals or a VIP-only bundle deal via WhatsApp.",
    });
  } else if (midTier > 0) {
    recommendations.push({
      title: "Upgrade Mid-Tier Shoppers",
      reason: `${midTier} mid-tier customers are close to becoming VIPs. A targeted push with a loyalty incentive could move them up.`,
      channel: "WHATSAPP" as const,
      suggestedGoal: "Encourage mid-tier customers to unlock VIP status with a spend-threshold reward. Highlight how close they are to the next tier.",
    });
  } else {
    recommendations.push({
      title: "First Purchase Nudge",
      reason: `Most customers haven't placed enough orders yet. A gentle nudge with social proof can drive first conversions.`,
      channel: "WHATSAPP" as const,
      suggestedGoal: "Send customers a curated 'Top 5 Best Sellers' message with customer reviews and a limited-time free shipping offer.",
    });
  }

  // Recommendation 3: Channel exploration or seasonal push
  if (totalCampaigns < 3) {
    recommendations.push({
      title: "Launch Your SMS Channel",
      reason: `You've only run ${totalCampaigns} campaign${totalCampaigns === 1 ? "" : "s"} so far. SMS has 98% open rates — perfect for flash sales and time-sensitive offers.`,
      channel: "SMS" as const,
      suggestedGoal: "Run a flash sale campaign via SMS with a bold, short message: limited-time 20% off everything, valid for 24 hours only.",
    });
  } else if (active > 0) {
    recommendations.push({
      title: "Re-engage Active Buyers",
      reason: `${active} active customers are engaged right now. Cross-sell complementary products while they're hot to increase average order value.`,
      channel: "SMS" as const,
      suggestedGoal: "Send active customers a personalized cross-sell SMS based on their last purchase category with a bundle discount.",
    });
  } else {
    recommendations.push({
      title: "Weekend Flash Sale",
      reason: `With ${totalCustomers.toLocaleString()} customers in your database, a well-timed flash sale can generate significant revenue in a short burst.`,
      channel: "SMS" as const,
      suggestedGoal: "Announce a weekend-only flash sale via SMS. 25% off sitewide, 48 hours only. Create FOMO with a countdown.",
    });
  }

  return recommendations;
}
