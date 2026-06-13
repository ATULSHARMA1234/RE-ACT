"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, Loader2 } from "lucide-react";

interface AtRiskCustomer {
  id: string;
  name: string;
  email: string;
  lifecycle_stage: string;
  rfm_score: string | null;
  totalSpend: number;
  daysSinceLastOrder: number;
}

export default function SentimentAnalysisFeed() {
  const [customers, setCustomers] = useState<AtRiskCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/churn-risk")
      .then(r => r.json())
      .then(res => {
        if (res.customers) setCustomers(res.customers);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 shadow-card flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-status-error" size={20} />
          <h3 className="text-h2 font-display font-semibold">Churn Risk</h3>
        </div>
        <span className="text-small font-medium bg-status-error/10 text-status-error px-2 py-1 rounded-full">
          {customers.length} at risk
        </span>
      </div>

      <p className="text-small text-text-secondary mb-4">
        High-value customers who haven&apos;t ordered recently.
      </p>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-text-muted" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <AlertTriangle size={32} className="opacity-20 mb-2" />
            <p className="text-small">No at-risk customers found.</p>
          </div>
        ) : (
          customers.map((cust) => (
            <div key={cust.id} className="flex items-center justify-between p-3 bg-surface-panel/30 rounded-lg border border-border/50">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-body truncate">{cust.name}</p>
                <p className="text-small text-text-muted flex items-center gap-1">
                  LTV: ₹{cust.totalSpend.toLocaleString()} <TrendingDown size={12} className="text-status-error" />
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-status-error font-bold text-body">{cust.daysSinceLastOrder}d</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">inactive</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
