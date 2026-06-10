import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import CampaignLiveTracker from "./CampaignLiveTracker";

export const dynamic = "force-dynamic";

export default async function CampaignDrilldownPage({ params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      segment: true,
      communications: {
        include: {
          customer: { select: { name: true, email: true } }
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
        </div>
      </div>

      <CampaignLiveTracker initialCampaign={campaign} />

    </AppShell>
  );
}
