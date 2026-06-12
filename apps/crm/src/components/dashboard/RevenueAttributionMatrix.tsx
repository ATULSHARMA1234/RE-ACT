"use client";

import { useEffect, useState } from "react";
import { DollarSign, Zap, Activity } from "lucide-react";

interface AttributionData {
  channel: string;
  revenue: number;
  orders: number;
  sent: number;
  conversionRate: number;
}

export default function RevenueAttributionMatrix() {
  const [data, setData] = useState<AttributionData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/attribution")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
          setTotalRevenue(res.totalRevenue);
          setInsight(res.insight);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-6 h-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Activity className="animate-pulse" />
          <span className="text-small">Calculating Revenue Attribution...</span>
        </div>
      </div>
    );
  }

  // Find max revenue for progress bar scaling
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="bg-surface-card border border-border rounded-xl p-6 h-full flex flex-col shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-h2 font-display font-semibold flex items-center gap-2">
            <DollarSign size={18} className="text-brand-green" />
            Revenue Attribution Matrix
          </h3>
          <p className="text-small text-text-secondary mt-1">Orders & Revenue directly driven by campaigns</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">Total Driven</p>
          <p className="text-h2 font-display font-bold text-brand-green">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {data.map((item) => (
          <div key={item.channel} className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="font-semibold text-body capitalize">{item.channel.toLowerCase()}</span>
              <div className="text-right">
                <span className="font-bold text-body">${item.revenue.toLocaleString()}</span>
                <span className="text-[11px] text-text-secondary ml-2">({item.orders} orders)</span>
              </div>
            </div>
            
            <div className="h-2 w-full bg-surface-canvas rounded-full overflow-hidden flex">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  item.channel === 'WHATSAPP' ? 'bg-brand-green' : 
                  item.channel === 'EMAIL' ? 'bg-brand-blue' : 'bg-brand-coral'
                }`}
                style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[11px] text-text-secondary font-medium">
              <span>{item.sent.toLocaleString()} msgs sent</span>
              <span>{item.conversionRate.toFixed(2)}% conv. rate</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-4 flex gap-3">
          <div className="shrink-0 mt-0.5">
            <Zap size={16} className="text-brand-blue" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue mb-1 block">AI Insight</span>
            <p className="text-small text-text-primary leading-relaxed font-medium">
              {insight}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
