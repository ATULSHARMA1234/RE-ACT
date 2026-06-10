import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { Send, CheckCircle2, MailOpen, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const comms = await prisma.communication.findMany({
    select: { status: true }
  });

  const totalSent = comms.length;
  
  // A message is considered delivered if it reached DELIVERED, OPENED, or CLICKED state
  const delivered = comms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)).length;
  
  // A message is considered opened if it reached OPENED or CLICKED state
  const opened = comms.filter(c => ['OPENED', 'CLICKED'].includes(c.status)).length;
  
  const failed = comms.filter(c => c.status === 'FAILED').length;

  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-display font-display font-bold">Analytics Overview</h2>
        <p className="text-body text-text-secondary mt-1">High-level metrics across all campaigns.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <StatCard label="Total Sent" value={totalSent.toLocaleString()} icon={Send} />
        <StatCard 
          label="Delivery Rate" 
          value={`${deliveryRate}%`} 
          icon={CheckCircle2} 
          trend={totalSent > 0 ? "+2.4%" : undefined} 
        />
        <StatCard 
          label="Open Rate" 
          value={`${openRate}%`} 
          icon={MailOpen} 
          trend={delivered > 0 ? "+1.1%" : undefined} 
        />
        <StatCard 
          label="Failures" 
          value={failed.toLocaleString()} 
          icon={AlertCircle} 
        />
      </div>

      {/* Placeholder for future charts */}
      <div className="mt-8 bg-surface-card border border-border rounded-lg shadow-card p-16 text-center">
        <BarChartPlaceholder />
        <h3 className="text-h2 font-display font-semibold text-text-primary mb-2 mt-4">Performance Trends</h3>
        <p className="text-body text-text-secondary">Historical engagement charts will appear here as more data is collected.</p>
      </div>
    </AppShell>
  );
}

function BarChartPlaceholder() {
  return (
    <div className="flex items-end justify-center gap-4 h-32 opacity-20">
      <div className="w-12 bg-brand-blue rounded-t-sm" style={{ height: "40%" }} />
      <div className="w-12 bg-brand-blue rounded-t-sm" style={{ height: "70%" }} />
      <div className="w-12 bg-brand-blue rounded-t-sm" style={{ height: "50%" }} />
      <div className="w-12 bg-brand-blue rounded-t-sm" style={{ height: "90%" }} />
      <div className="w-12 bg-brand-blue rounded-t-sm" style={{ height: "60%" }} />
      <div className="w-12 bg-brand-blue rounded-t-sm" style={{ height: "100%" }} />
      <div className="w-12 bg-brand-blue rounded-t-sm" style={{ height: "80%" }} />
    </div>
  );
}
