import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";
import { ArrowLeft, FileBarChart } from "lucide-react";
import prisma from "@/lib/prisma";
import { generateCampaignInsights } from "@/lib/ai";
import CampaignLiveTracker from "./CampaignLiveTracker";
import CampaignReport from "./CampaignReport";
import LaunchCampaignButton from "./LaunchCampaignButton";

export const dynamic = "force-dynamic";

export default async function CampaignDrilldownPage({ params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      segment: true,
      communications: {
        include: {
          customer: { select: { name: true, email: true, channel_pref: true } }
        },
        orderBy: { updated_at: "desc" }
      }
    }
  });

  if (!campaign) {
    return (
      <AppShell>
        <div className="p-8">Campaign not found</div>
      </AppShell>
    );
  }

  // Compute report data server-side
  const comms = campaign.communications;
  const total = comms.length;
  const sent = comms.filter(c => c.status !== "PENDING").length;
  const delivered = comms.filter(c => ["DELIVERED", "OPENED", "READ", "CLICKED"].includes(c.status)).length;
  const failed = comms.filter(c => c.status === "FAILED").length;
  const opened = comms.filter(c => ["OPENED", "READ", "CLICKED"].includes(c.status)).length;
  const read = comms.filter(c => ["READ", "CLICKED"].includes(c.status)).length;
  const clicked = comms.filter(c => c.status === "CLICKED").length;
  const pending = comms.filter(c => c.status === "PENDING").length;

  // Status distribution
  const statusDist: Record<string, number> = {};
  comms.forEach(c => { statusDist[c.status] = (statusDist[c.status] || 0) + 1; });

  // Channel distribution
  const channelDist: Record<string, number> = {};
  comms.forEach(c => {
    const ch = c.customer?.channel_pref || "UNKNOWN";
    channelDist[ch] = (channelDist[ch] || 0) + 1;
  });

  // Generate AI Insights
  let aiInsights: string[] = [];
  try {
    if (total > 0) {
      const summary = `Total Recipients: ${total}, Sent: ${sent}, Delivered: ${delivered}, Opened: ${opened}, Read: ${read}, Clicked: ${clicked}, Failed: ${failed}. Channel: ${campaign.channel}`;
      const res = await generateCampaignInsights(summary);
      if (res.recommendations) {
        aiInsights = res.recommendations;
      }
    }
  } catch (e) {
    console.error("AI Insights failed:", e);
  }

  const reportData = {
    campaignId: campaign.id,
    campaignName: campaign.name,
    segmentName: campaign.segment.name,
    channel: campaign.channel,
    status: campaign.status,
    sentAt: campaign.sent_at?.toISOString() || null,
    createdAt: campaign.created_at.toISOString(),
    messageTemplate: campaign.message_template || "",
    metrics: { total, sent, delivered, failed, opened, read, clicked, pending },
    rates: {
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
      readRate: opened > 0 ? Math.round((read / opened) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      failureRate: sent > 0 ? Math.round((failed / sent) * 100) : 0,
    },
    statusDistribution: statusDist,
    channelDistribution: channelDist,
    aiInsights,
  };

  return (
    <AppShell>
      <div className="mb-8">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-small font-medium text-text-secondary hover:text-text-primary mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Campaigns
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-display font-display font-bold">{campaign.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge variant={campaign.status.toLowerCase() as any}>{campaign.status}</StatusBadge>
              <span className="text-small text-text-muted">•</span>
              <span className="text-small text-text-secondary">Segment: {campaign.segment.name}</span>
              <span className="text-small text-text-muted">•</span>
              <span className="text-small text-text-secondary">Channel: {campaign.channel}</span>
            </div>
          </div>
          {campaign.status === "DRAFT" && (
            <LaunchCampaignButton
              campaignId={campaign.id}
              name={campaign.name}
              segmentId={campaign.segment_id}
              channel={campaign.channel}
              messageTemplate={campaign.message_template || ""}
            />
          )}
        </div>
      </div>

      {/* Campaign Report */}
      <CampaignReport data={reportData} />

      <div className="mt-8">
        <CampaignLiveTracker initialCampaign={campaign} />
      </div>

    </AppShell>
  );
}
