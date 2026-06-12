import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Link from "next/link";
import { Plus, Megaphone, ArrowRight } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { created_at: "desc" },
    include: {
      segment: { select: { name: true } },
      _count: { select: { communications: true } },
      communications: {
        select: { status: true }
      }
    }
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-display font-display font-bold">Campaigns</h2>
          <p className="text-body text-text-secondary mt-1">Manage and track your outbound campaigns.</p>
        </div>
        <Link href="/campaigns/new">
          <Button icon={<Plus size={16} />}>New Campaign</Button>
        </Link>
      </div>

      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-16 text-center text-text-secondary">
            <Megaphone size={48} strokeWidth={1} className="mx-auto mb-4 text-text-muted" />
            <h3 className="text-h2 font-display font-semibold text-text-primary mb-2">No campaigns yet</h3>
            <p className="text-body mb-6">Create your first outbound campaign to engage your audience.</p>
            <Link href="/campaigns/new">
              <Button>Create Campaign</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-panel/50">
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Campaign Name</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Segment</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Channel</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Sent At</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Sent</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Delivered</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Opened</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Status</th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(camp => {
                  const sent = camp._count.communications;
                  const delivered = camp.communications.filter(c => !['PENDING', 'SENT', 'FAILED'].includes(c.status)).length;
                  const opened = camp.communications.filter(c => ['OPENED', 'READ', 'CLICKED'].includes(c.status)).length;
                  const deliveredPct = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
                  const openedPct = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
                  
                  return (
                    <tr key={camp.id} className="border-b border-border last:border-0 hover:bg-surface-panel/30 transition-colors">
                      <td className="px-6 py-4 text-body font-medium">{camp.name}</td>
                      <td className="px-6 py-4 text-body text-text-secondary">{camp.segment.name}</td>
                      <td className="px-6 py-4">
                        <StatusBadge variant="new">{camp.channel}</StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-body text-text-secondary" suppressHydrationWarning>
                        {camp.sent_at ? new Date(camp.sent_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-body text-text-secondary">{sent.toLocaleString()}</td>
                      <td className="px-6 py-4 text-body">
                        <span className="font-medium">{delivered.toLocaleString()}</span>
                        <span className="text-text-muted text-small ml-2">({deliveredPct}%)</span>
                      </td>
                      <td className="px-6 py-4 text-body">
                        <span className="font-medium">{opened.toLocaleString()}</span>
                        <span className="text-text-muted text-small ml-2">({openedPct}%)</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={camp.status.toLowerCase() as any}>{camp.status}</StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/campaigns/${camp.id}`} className="text-brand-blue hover:underline text-small font-semibold inline-flex items-center gap-1">
                          Report <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
