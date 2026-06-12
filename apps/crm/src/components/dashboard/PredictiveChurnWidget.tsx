"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";
import Button from "../Button";
import Link from "next/link";

const mockRisks = [
  { id: 1, name: "Emma Thompson", score: 89, ltv: "$1,240" },
  { id: 2, name: "David Chen", score: 82, ltv: "$890" },
  { id: 3, name: "Sarah Jenkins", score: 76, ltv: "$2,100" },
];

export default function PredictiveChurnWidget() {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 shadow-card flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-status-danger" size={20} />
          <h3 className="text-h2 font-display font-semibold">Churn Risk</h3>
        </div>
        <span className="text-small font-medium bg-status-danger-bg text-status-danger px-2 py-1 rounded-full">
          AI Prediction
        </span>
      </div>
      
      <p className="text-small text-text-secondary mb-4">
        These high-LTV customers haven&apos;t engaged in 30+ days.
      </p>

      <div className="flex-1 space-y-4">
        {mockRisks.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 bg-surface-panel/50 rounded-lg border border-border/50">
            <div>
              <p className="font-medium text-body">{user.name}</p>
              <p className="text-small text-text-muted flex items-center gap-1">
                LTV: {user.ltv} <TrendingDown size={12} className="text-status-danger" />
              </p>
            </div>
            <div className="text-right">
              <p className="text-status-danger font-bold text-body">{user.score}%</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Risk Score</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link href="/campaigns/new">
          <Button variant="outline" className="w-full justify-center">
            Generate Win-back Campaign
          </Button>
        </Link>
      </div>
    </div>
  );
}
