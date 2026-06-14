"use client";

import { useEffect, useState } from "react";
import { DollarSign, Activity, Sparkles } from "lucide-react";

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
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/attribution")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
          setTotalRevenue(res.totalRevenue);
          setSuggestions(res.suggestions || []);
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

  const formatSuggestion = (text: string) => {
    // Basic markdown bold replacement for **text**
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => 
      i % 2 === 1 ? <strong key={i} className="text-text-primary">{part}</strong> : part
    );
  };

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
            ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {data.map((item) => (
          <div key={item.channel} className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="font-semibold text-body capitalize">{item.channel.toLowerCase()}</span>
              <div className="text-right">
                <span className="font-bold text-body">₹{item.revenue.toLocaleString()}</span>
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

      {suggestions.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h4 className="flex items-center gap-2 text-[12px] font-semibold text-brand-coral uppercase tracking-wider mb-3">
            <Sparkles size={14} />
            AI Insights
          </h4>
          <ul className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-small text-text-secondary leading-relaxed flex items-start gap-2">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-coral/50 flex-shrink-0" />
                <span>{formatSuggestion(suggestion)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
