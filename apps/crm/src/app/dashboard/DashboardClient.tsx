"use client";

import { useState } from "react";
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
import ProactiveAdvisor from "@/components/ProactiveAdvisor";
import ConversionFunnelChart from "@/components/dashboard/ConversionFunnelChart";
import CampaignHeatmap from "@/components/dashboard/CampaignHeatmap";
import RevenueAttributionMatrix from "@/components/dashboard/RevenueAttributionMatrix";
import SentimentAnalysisFeed from "@/components/dashboard/SentimentAnalysisFeed";
import ChannelPerformanceWidget from "@/components/dashboard/ChannelPerformanceWidget";

interface DashboardClientProps {
  stats: {
    customerCount: number;
    campaignCount: number;
    commCount: number;
    deliveryRate: string;
  };
  recentCampaigns: any[];
}

export default function DashboardClient({ stats, recentCampaigns }: DashboardClientProps) {
  return (
    <AppShell>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display font-display font-bold text-text-primary tracking-tight">
            Dashboard
          </h1>
          <p className="text-body text-text-secondary mt-1">
            Welcome back to your neural command center.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/campaigns/new">
            <Button className="flex items-center gap-2">
              <Plus size={16} /> New Campaign
            </Button>
          </Link>
        </div>
      </div>

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
      <div className="mb-8">
        <ProactiveAdvisor />
      </div>

      {/* Data Visualization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ConversionFunnelChart />
        <CampaignHeatmap />
      </div>

      {/* AI & Predictive Integrations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 h-[400px]">
          <RevenueAttributionMatrix />
        </div>
        <div className="lg:col-span-1 h-[400px]">
          <SentimentAnalysisFeed />
        </div>
        <div className="lg:col-span-1 h-[400px]">
          <ChannelPerformanceWidget />
        </div>
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
                    className="border-b border-border last:border-0 hover:bg-surface-panel/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-body font-medium">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {campaign.segment?.name || "All"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant="new">{campaign.channel}</StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {campaign._count?.communications || 0}
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
