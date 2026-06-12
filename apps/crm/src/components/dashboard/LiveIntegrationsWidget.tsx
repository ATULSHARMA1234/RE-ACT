"use client";

import { ShoppingBag, RefreshCw, Box, CheckCircle2 } from "lucide-react";
import StatusBadge from "../StatusBadge";

export default function LiveIntegrationsWidget() {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 shadow-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="text-brand-green" size={20} />
          <h3 className="text-h2 font-display font-semibold">Live Sync</h3>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {/* Shopify Integration */}
        <div className="p-4 bg-surface-panel/30 rounded-lg border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#95BF47]/10 flex items-center justify-center text-[#95BF47]">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="font-medium text-body">Shopify Store</p>
              <p className="text-small text-text-muted flex items-center gap-1">
                <CheckCircle2 size={12} className="text-status-success" /> Synced 2m ago
              </p>
            </div>
          </div>
          <StatusBadge variant="sent">Active</StatusBadge>
        </div>

        {/* WooCommerce Integration */}
        <div className="p-4 bg-surface-panel/30 rounded-lg border border-border/50 flex items-center justify-between opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#96588A]/10 flex items-center justify-center text-[#96588A]">
              <Box size={20} />
            </div>
            <div>
              <p className="font-medium text-body">WooCommerce</p>
              <p className="text-small text-text-muted">Not configured</p>
            </div>
          </div>
          <StatusBadge variant="draft">Pending</StatusBadge>
        </div>
      </div>
    </div>
  );
}
