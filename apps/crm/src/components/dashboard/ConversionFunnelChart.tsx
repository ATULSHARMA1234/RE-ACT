"use client";

import { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Filter, Loader2 } from "lucide-react";

interface FunnelDataPoint {
  stage: string;
  count: number;
}

export default function ConversionFunnelChart() {
  const [data, setData] = useState<FunnelDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(res => {
        if (res.funnel) setData(res.funnel);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 shadow-card h-[400px] flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="text-brand-blue" size={20} />
        <h3 className="text-h2 font-display font-semibold">Conversion Funnel</h3>
      </div>
      <div className="flex-1 w-full min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-text-muted" />
          </div>
        ) : data.every(d => d.count === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Filter size={32} className="opacity-20 mb-2" />
            <p className="text-small">No campaign data yet. Fire a campaign to see the funnel.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} dy={10} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} dx={-10} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#1A73E8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
