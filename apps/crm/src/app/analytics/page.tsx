import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Send, CheckCircle2, MailOpen, AlertCircle, MousePointerClick, MessageCircle, Mail, Smartphone } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // Fetch all communications with their parent campaign details
  const comms = await prisma.communication.findMany({
    include: {
      campaign: {
        select: { id: true, name: true, channel: true }
      }
    }
  });

  // Global Metrics
  const totalSent = comms.length;
  const delivered = comms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)).length;
  const opened = comms.filter(c => ['OPENED', 'CLICKED'].includes(c.status)).length;
  const clicked = comms.filter(c => c.status === 'CLICKED').length;
  const failed = comms.filter(c => c.status === 'FAILED').length;

  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
  const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

  // Group by Channel
  const channels = ['EMAIL', 'WHATSAPP', 'SMS'];
  const channelStats = channels.map(channel => {
    const channelComms = comms.filter(c => c.campaign.channel === channel);
    const cSent = channelComms.length;
    const cDelivered = channelComms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)).length;
    const cOpened = channelComms.filter(c => ['OPENED', 'CLICKED'].includes(c.status)).length;
    
    return {
      channel,
      sent: cSent,
      deliveryRate: cSent > 0 ? Math.round((cDelivered / cSent) * 100) : 0,
      openRate: cDelivered > 0 ? Math.round((cOpened / cDelivered) * 100) : 0,
    };
  });

  // Group by Campaign for Top Campaigns Table
  const campaignsMap: Record<string, any> = {};
  comms.forEach(c => {
    const id = c.campaign.id;
    if (!campaignsMap[id]) {
      campaignsMap[id] = { id, name: c.campaign.name, channel: c.campaign.channel, sent: 0, delivered: 0, opened: 0 };
    }
    campaignsMap[id].sent++;
    if (['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)) campaignsMap[id].delivered++;
    if (['OPENED', 'CLICKED'].includes(c.status)) campaignsMap[id].opened++;
  });

  const topCampaigns = Object.values(campaignsMap)
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 5);

  return (
    <AppShell>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-display font-display font-bold">Analytics</h2>
          <p className="text-body text-text-secondary mt-1">Deep dive into your communication performance.</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge variant="new">Last 30 Days</StatusBadge>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
        <StatCard label="Total Sent" value={totalSent.toLocaleString()} icon={Send} />
        <StatCard label="Delivery Rate" value={`${deliveryRate}%`} icon={CheckCircle2} />
        <StatCard label="Open Rate" value={`${openRate}%`} icon={MailOpen} />
        <StatCard label="Click-to-Open" value={`${clickRate}%`} icon={MousePointerClick} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Performance Funnel */}
        <div className="lg:col-span-2 bg-surface-card border border-border rounded-xl shadow-card p-6">
          <h3 className="text-h2 font-display font-semibold mb-6">Aggregate Engagement Funnel</h3>
          
          <div className="space-y-6">
            <FunnelBar label="Sent" count={totalSent} total={totalSent} color="bg-brand-blue" />
            <FunnelBar label="Delivered" count={delivered} total={totalSent} color="bg-brand-blue/80" />
            <FunnelBar label="Opened" count={opened} total={totalSent} color="bg-brand-coral" />
            <FunnelBar label="Clicked" count={clicked} total={totalSent} color="bg-brand-coral/80" />
            
            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-small">
              <div className="flex items-center gap-2 text-text-secondary">
                <AlertCircle size={16} className="text-status-error" />
                <span><strong className="text-text-primary">{failed.toLocaleString()}</strong> messages failed to deliver</span>
              </div>
            </div>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="bg-surface-card border border-border rounded-xl shadow-card p-6">
          <h3 className="text-h2 font-display font-semibold mb-6">Channel Performance</h3>
          <div className="space-y-4">
            {channelStats.map((stat) => (
              <div key={stat.channel} className="p-4 rounded-lg bg-surface-canvas border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  {stat.channel === 'EMAIL' && <Mail size={16} className="text-text-secondary" />}
                  {stat.channel === 'WHATSAPP' && <MessageCircle size={16} className="text-status-success" />}
                  {stat.channel === 'SMS' && <Smartphone size={16} className="text-text-secondary" />}
                  <span className="font-semibold text-small">{stat.channel}</span>
                </div>
                <div className="flex justify-between text-small mb-1">
                  <span className="text-text-muted">Volume</span>
                  <span className="font-medium text-text-primary">{stat.sent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-small mb-1">
                  <span className="text-text-muted">Delivery</span>
                  <span className="font-medium text-text-primary">{stat.deliveryRate}%</span>
                </div>
                <div className="flex justify-between text-small">
                  <span className="text-text-muted">Open Rate</span>
                  <span className="font-medium text-brand-blue">{stat.openRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Campaigns Table */}
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
              {topCampaigns.map((camp) => {
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

// Helper component for Funnel
function FunnelBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div>
      <div className="flex justify-between text-small mb-2">
        <span className="font-semibold text-text-primary uppercase tracking-wide">{label}</span>
        <span className="text-text-secondary">{count.toLocaleString()} <span className="text-text-muted">({percentage}%)</span></span>
      </div>
      <div className="h-3 w-full bg-surface-canvas rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
