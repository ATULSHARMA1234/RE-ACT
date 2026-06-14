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

      const themes = [
        "Focus on retention and reducing churn.",
        "Focus on revenue growth and upselling.",
        "Focus on re-engagement and winning back lapsed shoppers.",
        "Focus on channel diversification and trying new channels.",
        "Focus on loyalty and rewarding your best customers.",
        "Focus on new customer acquisition and onboarding.",
      ];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];

      const statsSummary = `
- Total Customers: ${totalCustomers}
- Total Campaigns Executed: ${totalCampaigns}
- Customer Distribution by Lifecycle Stage: ${stagesSummary || "None"}
- Customer Distribution by RFM Score: ${rfmSummary || "None"}
- Current Time: ${new Date().toISOString()}
- Creative Direction: ${randomTheme}
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
  const pool: Array<{ title: string; reason: string; channel: "EMAIL" | "WHATSAPP" | "SMS"; suggestedGoal: string }> = [];

  const dormant = stageMap["DORMANT"] || 0;
  const atRisk = stageMap["AT_RISK"] || 0;
  const active = stageMap["ACTIVE"] || 0;
  const newCust = stageMap["NEW"] || 0;
  const highValue = rfmMap["HIGH_VALUE"] || 0;
  const midTier = rfmMap["MID_TIER"] || 0;

  // Churn-prevention ideas
  if (dormant > 0 || atRisk > 0) {
    pool.push({
      title: "Win Back Lapsed Customers",
      reason: `${dormant + atRisk} customers are at risk or dormant. A targeted win-back campaign could re-engage them before they churn.`,
      channel: "EMAIL",
      suggestedGoal: "Win back dormant and at-risk customers with a special 15% comeback discount code. Create urgency with a 48-hour expiry.",
    });
    pool.push({
      title: "We Miss You — Personal Reconnect",
      reason: `${dormant} dormant customers haven't engaged recently. A heartfelt, personalized reconnection message can reignite interest.`,
      channel: "WHATSAPP",
      suggestedGoal: "Send a personal 'We miss you' WhatsApp message with their last purchased product and a tailored recommendation.",
    });
  }

  // New customer ideas
  if (newCust > 0) {
    pool.push({
      title: "Welcome New Customers",
      reason: `You have ${newCust} new customers. A warm welcome campaign sets the tone for long-term engagement.`,
      channel: "EMAIL",
      suggestedGoal: "Welcome new customers with a personalized onboarding message, highlight best-sellers, and offer 10% off their next purchase.",
    });
    pool.push({
      title: "First Order Thank You",
      reason: `${newCust} new customers just joined. Thanking them immediately increases repeat purchase probability by 27%.`,
      channel: "WHATSAPP",
      suggestedGoal: "Send a warm thank-you WhatsApp message with a surprise 5% loyalty bonus code for their next order.",
    });
  }

  // VIP / high-value ideas
  if (highValue > 0) {
    pool.push({
      title: "VIP Exclusive Drop",
      reason: `${highValue} high-value customers are your core revenue drivers. An exclusive early-access offer rewards loyalty.`,
      channel: "WHATSAPP",
      suggestedGoal: "Send high-value VIP customers an exclusive early access preview of new arrivals or a VIP-only bundle deal.",
    });
    pool.push({
      title: "VIP Birthday Surprise",
      reason: `${highValue} VIP customers deserve special treatment. Birthday or anniversary offers drive emotional loyalty.`,
      channel: "EMAIL",
      suggestedGoal: "Create a premium birthday/anniversary email for VIP customers with a personalized gift card or exclusive discount.",
    });
  }

  // Mid-tier upgrade ideas
  if (midTier > 0) {
    pool.push({
      title: "Upgrade Mid-Tier Shoppers",
      reason: `${midTier} mid-tier customers are close to becoming VIPs. A targeted push could move them up.`,
      channel: "WHATSAPP",
      suggestedGoal: "Encourage mid-tier customers to unlock VIP status with a spend-threshold reward.",
    });
  }

  // Active customer ideas
  if (active > 0) {
    pool.push({
      title: "Cross-Sell Active Buyers",
      reason: `${active} active customers are engaged right now. Cross-sell complementary products to increase AOV.`,
      channel: "SMS",
      suggestedGoal: "Send active customers a personalized cross-sell SMS based on their last purchase category with a bundle discount.",
    });
    pool.push({
      title: "Refer-a-Friend Boost",
      reason: `${active} active customers are your best advocates. A referral program can turn them into a growth engine.`,
      channel: "EMAIL",
      suggestedGoal: "Launch a 'Give ₹200, Get ₹200' referral campaign targeting active customers via email.",
    });
  }

  // Channel & general ideas (always available)
  pool.push({
    title: "Weekend Flash Sale",
    reason: `With ${totalCustomers.toLocaleString()} customers in your database, a well-timed flash sale can generate significant revenue.`,
    channel: "SMS",
    suggestedGoal: "Announce a weekend-only flash sale via SMS. 25% off sitewide, 48 hours only. Create FOMO with a countdown.",
  });
  pool.push({
    title: "Launch Your SMS Channel",
    reason: `SMS has 98% open rates — perfect for flash sales and time-sensitive offers. Try diversifying your channels.`,
    channel: "SMS",
    suggestedGoal: "Run a flash sale campaign via SMS with a bold, short message: limited-time 20% off everything, valid for 24 hours only.",
  });
  pool.push({
    title: "Seasonal Collection Preview",
    reason: `A seasonal preview campaign builds anticipation and drives early sales from your ${totalCustomers.toLocaleString()} customer base.`,
    channel: "EMAIL",
    suggestedGoal: "Send a beautifully crafted seasonal lookbook email showcasing new arrivals with an early-bird 10% off code.",
  });

  // Shuffle and pick 3
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 3);
}
