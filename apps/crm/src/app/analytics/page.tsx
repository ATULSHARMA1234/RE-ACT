import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import {
  Send, CheckCircle2, MailOpen, MousePointerClick,
  Zap, Workflow, TrendingUp, DollarSign,
  ShoppingBag, ArrowUpRight, BarChart3, Target,
} from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // ─── Run ALL queries in parallel ───────────────────────────────────
  const [comms, workflows, allOrders] = await Promise.all([
    // Communications: only select fields needed for aggregation
    prisma.communication.findMany({
      select: {
        status: true,
        campaign: { select: { id: true, name: true, channel: true } },
        workflow: { select: { id: true, name: true } },
      },
    }),
    // Workflows: only select fields needed for stats
    prisma.workflow.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        updated_at: true,
        jobs: { select: { status: true } },
        communications: { select: { status: true, channel: true } },
      },
      orderBy: { updated_at: "desc" },
    }),
    // Orders: only select fields needed for revenue attribution
    prisma.order.findMany({
      select: {
        amount: true,
        attributed_campaign_id: true,
        attributed_campaign: { select: { id: true, name: true, channel: true } },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  // ─── Communications Aggregation ─────────────────────────────────
  const totalSent = comms.length;
  const delivered = comms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)).length;
  const opened = comms.filter(c => ['OPENED', 'CLICKED'].includes(c.status)).length;
  const clicked = comms.filter(c => c.status === 'CLICKED').length;

  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
  const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

  // ─── Workflow Performance ───────────────────────────────────────
  const workflowStats = workflows.map(wf => {
    const totalJobs = wf.jobs.length;
    const completed = wf.jobs.filter(j => j.status === "COMPLETED").length;
    const pending = wf.jobs.filter(j => j.status === "PENDING").length;
    const failed = wf.jobs.filter(j => j.status === "FAILED").length;
    const wfComms = wf.communications;
    const wfDelivered = wfComms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)).length;
    const wfOpened = wfComms.filter(c => ['OPENED', 'CLICKED'].includes(c.status)).length;
    const completionRate = totalJobs > 0 ? Math.round((completed / totalJobs) * 100) : 0;
    const wfDeliveryRate = wfComms.length > 0 ? Math.round((wfDelivered / wfComms.length) * 100) : 0;
    const wfOpenRate = wfDelivered > 0 ? Math.round((wfOpened / wfDelivered) * 100) : 0;

    return {
      id: wf.id, name: wf.name, status: wf.status,
      totalJobs, completed, pending, failed,
      messages: wfComms.length,
      deliveryRate: wfDeliveryRate, openRate: wfOpenRate, completionRate,
    };
  });

  const totalWorkflowJobs = workflowStats.reduce((s, w) => s + w.totalJobs, 0);
  const totalWorkflowMsgs = workflowStats.reduce((s, w) => s + w.messages, 0);
  const avgCompletionRate = workflowStats.length > 0
    ? Math.round(workflowStats.reduce((s, w) => s + w.completionRate, 0) / workflowStats.length)
    : 0;

  // ─── Revenue Attribution ────────────────────────────────────────
  const totalRevenue = allOrders.reduce((s, o) => s + o.amount, 0);
  const attributedOrders = allOrders.filter(o => o.attributed_campaign_id);
  const attributedRevenue = attributedOrders.reduce((s, o) => s + o.amount, 0);
  const organicRevenue = totalRevenue - attributedRevenue;
  const attributionRate = totalRevenue > 0 ? Math.round((attributedRevenue / totalRevenue) * 100) : 0;

  // Group attributed revenue by campaign
  const campaignRevMap: Record<string, { id: string; name: string; channel: string; revenue: number; orders: number }> = {};
  attributedOrders.forEach(o => {
    if (!o.attributed_campaign) return;
    const id = o.attributed_campaign.id;
    if (!campaignRevMap[id]) {
      campaignRevMap[id] = { id, name: o.attributed_campaign.name, channel: o.attributed_campaign.channel, revenue: 0, orders: 0 };
    }
    campaignRevMap[id].revenue += o.amount;
    campaignRevMap[id].orders++;
  });

  const topRevenueCampaigns = Object.values(campaignRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ─── Campaign Performance Table ───────────────────────────────────
  const campaignsMap: Record<string, any> = {};
  comms.forEach(c => {
    if (!c.campaign) return;
    const id = c.campaign.id;
    if (!campaignsMap[id]) {
      campaignsMap[id] = { id, name: c.campaign.name, channel: c.campaign.channel, sent: 0, delivered: 0, opened: 0 };
    }
    campaignsMap[id].sent++;
    if (['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)) campaignsMap[id].delivered++;
    if (['OPENED', 'CLICKED'].includes(c.status)) campaignsMap[id].opened++;
  });

  const topCampaigns = Object.values(campaignsMap)
    .sort((a: any, b: any) => b.sent - a.sent)
    .slice(0, 5);

  return (
    <AppShell>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-display font-display font-bold">Analytics</h2>
          <p className="text-body text-text-secondary mt-1">Campaign performance, workflow automation, and revenue insights.</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge variant="new">All Time</StatusBadge>
        </div>
      </div>

      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
        <StatCard label="Total Sent" value={totalSent.toLocaleString()} icon={Send} />
        <StatCard label="Delivery Rate" value={`${deliveryRate}%`} icon={CheckCircle2} />
        <StatCard label="Open Rate" value={`${openRate}%`} icon={MailOpen} />
        <StatCard label="Click-to-Open" value={`${clickRate}%`} icon={MousePointerClick} />
      </div>

      {/* ── Row 2: Workflow Performance + Revenue Attribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

        {/* Workflow Automation Performance */}
        <div className="bg-surface-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                <Zap size={16} className="text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className="text-h2 font-display font-semibold">Workflow Performance</h3>
                <p className="text-[11px] text-text-muted">Automation trigger & delivery metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-h2 font-display font-bold text-text-primary">{totalWorkflowJobs}</p>
                <p className="text-[10px] text-text-muted uppercase">Triggers</p>
              </div>
              <div className="text-right">
                <p className="text-h2 font-display font-bold text-[#8B5CF6]">{avgCompletionRate}%</p>
                <p className="text-[10px] text-text-muted uppercase">Avg Completion</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto">
            {workflowStats.length === 0 ? (
              <div className="py-10 text-center text-text-muted">
                <Workflow size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-body font-medium">No workflows yet</p>
                <p className="text-small mt-1">Create a workflow to see automation metrics here.</p>
              </div>
            ) : (
              workflowStats.map((wf) => (
                <Link key={wf.id} href={`/workflows/${wf.id}`} className="block">
                  <div className="p-4 rounded-xl bg-surface-canvas border border-border/50 hover:border-[#8B5CF6]/40 hover:shadow-card transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${wf.status === "ACTIVE" ? "bg-brand-green animate-pulse" : "bg-text-muted"}`} />
                        <span className="text-body font-semibold text-text-primary group-hover:text-[#8B5CF6] transition-colors truncate">{wf.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          wf.status === "ACTIVE" ? "bg-brand-green/10 text-brand-green" : "bg-surface-panel text-text-muted"
                        }`}>{wf.status}</span>
                      </div>
                      <ArrowUpRight size={14} className="text-text-muted group-hover:text-[#8B5CF6] transition-colors shrink-0" />
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-surface-panel rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] rounded-full transition-all duration-1000"
                        style={{ width: `${wf.completionRate}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <p className="text-h2 font-display font-bold text-text-primary">{wf.totalJobs}</p>
                        <p className="text-[10px] text-text-muted uppercase">Triggered</p>
                      </div>
                      <div>
                        <p className="text-h2 font-display font-bold text-brand-green">{wf.completed}</p>
                        <p className="text-[10px] text-text-muted uppercase">Completed</p>
                      </div>
                      <div>
                        <p className="text-h2 font-display font-bold text-text-primary">{wf.deliveryRate}%</p>
                        <p className="text-[10px] text-text-muted uppercase">Delivered</p>
                      </div>
                      <div>
                        <p className="text-h2 font-display font-bold text-brand-blue">{wf.openRate}%</p>
                        <p className="text-[10px] text-text-muted uppercase">Open Rate</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Revenue Attribution */}
        <div className="bg-surface-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                <DollarSign size={16} className="text-brand-green" />
              </div>
              <div>
                <h3 className="text-h2 font-display font-semibold">Revenue Attribution</h3>
                <p className="text-[11px] text-text-muted">Revenue influenced by campaigns & workflows</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-h2 font-display font-bold text-text-primary">₹{totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-text-muted uppercase">Total Revenue</p>
              </div>
              <div className="text-right">
                <p className="text-h2 font-display font-bold text-brand-green">{attributionRate}%</p>
                <p className="text-[10px] text-text-muted uppercase">Attributed</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto">
            {/* Attribution Overview Card */}
            <div className="p-4 rounded-xl bg-surface-canvas border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-brand-green" />
                  <span className="text-body font-semibold text-text-primary">Attribution Breakdown</span>
                </div>
                <span className="text-small font-medium text-text-muted">{allOrders.length} total orders</span>
              </div>

              {/* Attribution Progress Bar */}
              <div className="h-2 w-full bg-surface-panel rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-brand-green to-brand-green/70 rounded-full transition-all duration-1000"
                  style={{ width: `${attributionRate}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-h2 font-display font-bold text-brand-green">₹{attributedRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-text-muted uppercase">Attributed</p>
                </div>
                <div>
                  <p className="text-h2 font-display font-bold text-text-secondary">₹{organicRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-text-muted uppercase">Organic</p>
                </div>
                <div>
                  <p className="text-h2 font-display font-bold text-text-primary">{attributedOrders.length}</p>
                  <p className="text-[10px] text-text-muted uppercase">Linked Orders</p>
                </div>
              </div>
            </div>

            {/* Top Revenue Campaigns as workflow-style cards */}
            {topRevenueCampaigns.length === 0 ? (
              <div className="py-10 text-center text-text-muted">
                <Target size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-body font-medium">No attributed revenue yet</p>
                <p className="text-small mt-1">Orders linked to campaigns will appear here.</p>
              </div>
            ) : (
              topRevenueCampaigns.map((camp) => {
                const revenueShare = totalRevenue > 0 ? Math.round((camp.revenue / totalRevenue) * 100) : 0;
                return (
                  <Link key={camp.id} href={`/campaigns/${camp.id}`} className="block">
                    <div className="p-4 rounded-xl bg-surface-canvas border border-border/50 hover:border-brand-green/40 hover:shadow-card transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-brand-green" />
                          <span className="text-body font-semibold text-text-primary group-hover:text-brand-green transition-colors truncate">{camp.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-surface-panel text-text-muted">{camp.channel}</span>
                        </div>
                        <ArrowUpRight size={14} className="text-text-muted group-hover:text-brand-green transition-colors shrink-0" />
                      </div>

                      {/* Revenue Share Bar */}
                      <div className="h-2 w-full bg-surface-panel rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-gradient-to-r from-brand-green to-brand-green/70 rounded-full transition-all duration-1000"
                          style={{ width: `${revenueShare}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <p className="text-h2 font-display font-bold text-brand-green">₹{camp.revenue.toLocaleString()}</p>
                          <p className="text-[10px] text-text-muted uppercase">Revenue</p>
                        </div>
                        <div>
                          <p className="text-h2 font-display font-bold text-text-primary">{camp.orders}</p>
                          <p className="text-[10px] text-text-muted uppercase">Orders</p>
                        </div>
                        <div>
                          <p className="text-h2 font-display font-bold text-text-primary">₹{camp.orders > 0 ? Math.round(camp.revenue / camp.orders).toLocaleString() : 0}</p>
                          <p className="text-[10px] text-text-muted uppercase">AOV</p>
                        </div>
                        <div>
                          <p className="text-h2 font-display font-bold text-brand-blue">{revenueShare}%</p>
                          <p className="text-[10px] text-text-muted uppercase">Share</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Top Campaigns Table ── */}
      <div className="bg-surface-card border border-border rounded-xl shadow-card p-6">
        <h3 className="text-h2 font-display font-semibold mb-6">Top Campaigns by Volume</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-small font-semibold text-text-secondary py-3">Campaign Name</th>
                <th className="text-left text-small font-semibold text-text-secondary py-3">Channel</th>
                <th className="text-right text-small font-semibold text-text-secondary py-3">Sent</th>
                <th className="text-right text-small font-semibold text-text-secondary py-3">Open Rate</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted italic">No campaigns sent yet.</td>
                </tr>
              )}
              {topCampaigns.map((camp: any) => {
                const campOpenRate = camp.delivered > 0 ? Math.round((camp.opened / camp.delivered) * 100) : 0;
                return (
                  <tr key={camp.id} className="border-b border-border last:border-0 hover:bg-surface-panel/50 transition-colors">
                    <td className="py-4">
                      <Link href={`/campaigns/${camp.id}`} className="text-body font-medium text-text-primary hover:text-brand-blue transition-colors">
                        {camp.name}
                      </Link>
                    </td>
                    <td className="py-4">
                      <span className="text-[10px] px-2 py-1 bg-surface-panel rounded text-text-secondary font-semibold">
                        {camp.channel}
                      </span>
                    </td>
                    <td className="py-4 text-right text-body">{camp.sent.toLocaleString()}</td>
                    <td className="py-4 text-right text-body font-medium text-brand-blue">{campOpenRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
