import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Link from "next/link";
import {
  Users,
  Megaphone,
  Send,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import prisma from "@/lib/prisma";
import ProactiveAdvisor from "@/components/ProactiveAdvisor";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const [customerCount, campaignCount, commCount, deliveredCount] =
    await Promise.all([
      prisma.customer.count(),
      prisma.campaign.count(),
      prisma.communication.count(),
      prisma.communication.count({ where: { status: "DELIVERED" } }),
    ]);

  const deliveryRate =
    commCount > 0 ? ((deliveredCount / commCount) * 100).toFixed(1) : "0";

  return { customerCount, campaignCount, commCount, deliveryRate };
}

async function getRecentCampaigns() {
  return prisma.campaign.findMany({
    take: 5,
    orderBy: { created_at: "desc" },
    include: {
      segment: { select: { name: true } },
      _count: { select: { communications: true } },
    },
  });
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const recentCampaigns = await getRecentCampaigns();

  return (
    <AppShell>
      {/* Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Customers"
          value={stats.customerCount.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Campaigns"
          value={stats.campaignCount}
          icon={Megaphone}
        />
        <StatCard
          label="Messages Sent"
          value={stats.commCount.toLocaleString()}
          icon={Send}
        />
        <StatCard
          label="Delivery Rate"
          value={`${stats.deliveryRate}%`}
          icon={TrendingUp}
        />
      </div>

      {/* AI Advisor / Co-Pilot */}
      <ProactiveAdvisor />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link
          href="/campaigns/new"
          className="bg-surface-card border border-border rounded-lg p-6 shadow-card hover:shadow-card-hover transition-all duration-150 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-coral/10 flex items-center justify-center text-brand-coral group-hover:bg-brand-coral group-hover:text-white transition-colors">
              <Plus size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-h2 font-display font-semibold">
                New Campaign
              </h3>
              <p className="text-small text-text-secondary">
                Create and launch a targeted campaign
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/segments"
          className="bg-surface-card border border-border rounded-lg p-6 shadow-card hover:shadow-card-hover transition-all duration-150 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
              <Users size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-h2 font-display font-semibold">
                Build Segment
              </h3>
              <p className="text-small text-text-secondary">
                AI or manual audience builder
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/customers"
          className="bg-surface-card border border-border rounded-lg p-6 shadow-card hover:shadow-card-hover transition-all duration-150 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
              <TrendingUp size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-h2 font-display font-semibold">
                View Customers
              </h3>
              <p className="text-small text-text-secondary">
                Browse and search your audience
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Campaigns Table */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-h2 font-display font-semibold">
            Recent Campaigns
          </h2>
          <Link
            href="/campaigns"
            className="text-body text-brand-blue hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recentCampaigns.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <Megaphone size={48} strokeWidth={1} className="mx-auto mb-4 text-text-muted" />
            <p className="text-body">No campaigns yet</p>
            <p className="text-small text-text-muted mt-1">
              Create your first campaign to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                    Campaign
                  </th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                    Segment
                  </th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                    Channel
                  </th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                    Recipients
                  </th>
                  <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-border last:border-0 hover:bg-surface-panel/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-body font-medium">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {campaign.segment.name}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant="new">{campaign.channel}</StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {campaign._count.communications}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        variant={
                          campaign.status.toLowerCase() as
                            | "draft"
                            | "sending"
                            | "sent"
                            | "failed"
                        }
                      >
                        {campaign.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
