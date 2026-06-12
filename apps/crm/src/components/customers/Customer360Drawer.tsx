"use client";

import { X, Sparkles, ShoppingBag, Mail, Phone, MapPin, Activity } from "lucide-react";
import StatusBadge from "../StatusBadge";
import { useState, useEffect } from "react";

interface Customer360DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
}

export default function Customer360Drawer({ isOpen, onClose, customerId }: Customer360DrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      fetch(`/api/customers/${customerId}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            setData(res.data);
          } else {
            setData(null);
          }
        })
        .catch(err => {
          console.error(err);
          setData(null);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-surface-card border-l border-border shadow-drawer z-[70] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface-panel/50">
          <h2 className="text-h2 font-display font-semibold">Customer 360</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition-colors text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-4 py-20">
              <Activity className="animate-pulse" size={32} />
              <p>Loading Profile...</p>
            </div>
          ) : data ? (
            <>
              {/* Identity Profile */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue text-xl font-display font-bold">
                  {data.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-display font-bold text-lg mb-1">{data.name}</h1>
                  <div className="flex flex-col gap-1 text-small text-text-secondary">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} /> {data.city}, {data.state}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Persona Summary */}
              <div className="bg-brand-coral/5 border border-brand-coral/20 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-coral/10 rounded-full blur-xl" />
                <div className="flex items-center gap-2 mb-2 text-brand-coral">
                  <Sparkles size={16} />
                  <h3 className="font-semibold text-small uppercase tracking-wider">AI Persona</h3>
                </div>
                <p className="text-body text-text-primary">
                  {data.rfm_score === "HIGH_VALUE" ? "High-value shopper." : data.rfm_score === "MID_TIER" ? "Consistent buyer." : "Occasional shopper."} 
                  Prefers {data.channel_pref} communications. 
                  Currently in {data.lifecycle_stage} lifecycle stage.
                </p>
              </div>

              {/* Value Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-panel/30 rounded-lg border border-border/50">
                  <p className="text-small text-text-secondary mb-1">Lifetime Value</p>
                  <p className="text-h2 font-display font-bold text-brand-green">
                    ${data.lifetimeValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                  </p>
                </div>
                <div className="p-4 bg-surface-panel/30 rounded-lg border border-border/50">
                  <p className="text-small text-text-secondary mb-1">Total Orders</p>
                  <p className="text-h2 font-display font-bold">{data.totalOrders || 0}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-small font-semibold text-text-secondary uppercase tracking-wider">Contact Details</h4>
                <div className="flex items-center gap-3 text-body">
                  <Mail size={16} className="text-text-muted" />
                  <span>{data.email}</span>
                  <StatusBadge variant="sent">Verified</StatusBadge>
                </div>
                {data.phone && (
                  <div className="flex items-center gap-3 text-body">
                    <Phone size={16} className="text-text-muted" />
                    <span>{data.phone}</span>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="space-y-4">
                <h4 className="text-small font-semibold text-text-secondary uppercase tracking-wider">Recent Activity</h4>
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  <div className="relative pl-4 border-l-2 border-border/50 space-y-6">
                    {data.recentActivity.map((act: any, i: number) => {
                      // Calculate relative time (naive)
                      const diffDays = Math.floor((new Date().getTime() - new Date(act.date).getTime()) / (1000 * 3600 * 24));
                      const timeStr = diffDays === 0 ? "Today" : diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;

                      return (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-${act.color} ring-4 ring-surface-card`} />
                          <p className="text-small text-text-muted mb-1">{timeStr}</p>
                          <div className="flex items-center gap-2">
                            {act.type === "ORDER" ? (
                              <ShoppingBag size={14} className="text-text-secondary" />
                            ) : (
                              <Mail size={14} className="text-text-secondary" />
                            )}
                            <p className="text-body font-medium">{act.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-small text-text-muted italic">No recent activity.</p>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-text-muted">
              Failed to load profile.
            </div>
          )}
          
        </div>
      </div>
    </>
  );
}
