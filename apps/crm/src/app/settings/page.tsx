"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle, CheckCircle2, Sliders, Database, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'scoring' | 'data'>('scoring');

  const [formData, setFormData] = useState({
    high_value_min_spend: 10000,
    high_value_min_orders: 5,
    mid_tier_min_spend: 3000,
    mid_tier_min_orders: 2,
    at_risk_days: 60,
    dormant_days: 120,
  });

  const [managingData, setManagingData] = useState(false);
  const [seedSize, setSeedSize] = useState("1000");

  useEffect(() => {
    fetchSettings();
    
    // Listen for AI Copilot updates
    const handleUpdate = () => fetchSettings();
    window.addEventListener("crm-data-updated", handleUpdate);
    return () => window.removeEventListener("crm-data-updated", handleUpdate);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!data.error) {
        setFormData({
          high_value_min_spend: data.high_value_min_spend || 10000,
          high_value_min_orders: data.high_value_min_orders || 5,
          mid_tier_min_spend: data.mid_tier_min_spend || 3000,
          mid_tier_min_orders: data.mid_tier_min_orders || 2,
          at_risk_days: data.at_risk_days || 60,
          dormant_days: data.dormant_days || 120,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStatus({ type: 'success', message: 'Settings saved successfully.' });
      } else {
        setStatus({ type: 'error', message: 'Failed to save settings.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setStatus(null);
    // Auto-save first
    await handleSave();

    try {
      const res = await fetch("/api/customers/recalculate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: data.message });
      } else {
        setStatus({ type: 'error', message: data.error || 'Recalculation failed.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred during recalculation.' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleDataAction = async (action: 'reset' | 'seed') => {
    if (!confirm(`Are you sure you want to ${action === 'reset' ? 'wipe all data' : 'generate new mock data'}? This action is destructive.`)) return;
    
    setManagingData(true);
    setStatus(null);
    try {
      const payload = action === 'seed' ? JSON.stringify({ count: seedSize }) : undefined;
      const res = await fetch(`/api/settings/${action}`, { 
        method: "POST",
        body: payload,
        headers: payload ? { "Content-Type": "application/json" } : undefined
      });
      const data = await res.json();
      if (res.ok) {
        if (action === 'seed') {
          await fetch("/api/customers/recalculate", { method: "POST" });
        }
        setStatus({ type: 'success', message: data.message });
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setManagingData(false);
    }
  };

  if (loading) {
    return <AppShell><div className="p-8 text-text-muted">Loading settings...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="mb-8">
          <h2 className="text-display font-display font-bold flex items-center gap-3">
            <SettingsIcon className="text-brand-blue" />
            Settings
          </h2>
          <p className="text-body text-text-secondary mt-1">
            Manage your CRM configuration and environment data.
          </p>
        </div>

        {status && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-fade-in ${status.type === 'success' ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}>
            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-small font-medium">{status.message}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Tabs (Vertical) */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('scoring')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-small font-medium transition-colors text-left ${
                activeTab === 'scoring' 
                  ? 'bg-brand-blue/10 text-brand-blue' 
                  : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'
              }`}
            >
              <Sliders size={18} />
              Rules & Scoring
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-small font-medium transition-colors text-left ${
                activeTab === 'data' 
                  ? 'bg-status-error/10 text-status-error' 
                  : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'
              }`}
            >
              <Database size={18} />
              Data Management
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'scoring' && (
              <div className="space-y-8 animate-fade-in">
                {/* RFM Rules Section */}
                <div className="bg-surface-card border border-border rounded-xl shadow-card overflow-hidden">
                  <div className="p-6 border-b border-border bg-surface-canvas/50">
                    <h3 className="text-h2 font-display font-semibold mb-1">RFM Scoring Rules</h3>
                    <p className="text-small text-text-secondary">
                      Define the minimum thresholds a customer must meet to be automatically assigned to an RFM tier. A customer only needs to meet ONE of the conditions (Spend OR Orders) to qualify.
                    </p>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* High Value */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-3 h-3 rounded-full bg-brand-blue"></span>
                        <h4 className="font-display font-semibold text-body text-text-primary">HIGH_VALUE Tier</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-6 pl-5">
                        <div>
                          <label className="block text-small font-medium text-text-secondary mb-2">Minimum Total Spend (₹)</label>
                          <input 
                            type="number" 
                            value={formData.high_value_min_spend}
                            onChange={(e) => setFormData({...formData, high_value_min_spend: parseFloat(e.target.value)})}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-small font-medium text-text-secondary mb-2">Minimum Lifetime Orders</label>
                          <input 
                            type="number" 
                            value={formData.high_value_min_orders}
                            onChange={(e) => setFormData({...formData, high_value_min_orders: parseInt(e.target.value)})}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-shadow"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border/50 pl-5"></div>

                    {/* Mid Tier */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-3 h-3 rounded-full bg-brand-coral"></span>
                        <h4 className="font-display font-semibold text-body text-text-primary">MID_TIER Tier</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-6 pl-5">
                        <div>
                          <label className="block text-small font-medium text-text-secondary mb-2">Minimum Total Spend (₹)</label>
                          <input 
                            type="number" 
                            value={formData.mid_tier_min_spend}
                            onChange={(e) => setFormData({...formData, mid_tier_min_spend: parseFloat(e.target.value)})}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="block text-small font-medium text-text-secondary mb-2">Minimum Lifetime Orders</label>
                          <input 
                            type="number" 
                            value={formData.mid_tier_min_orders}
                            onChange={(e) => setFormData({...formData, mid_tier_min_orders: parseInt(e.target.value)})}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-shadow"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pl-5">
                      <p className="text-[11px] text-text-muted mt-2">
                        * Customers who do not meet any of the above criteria will automatically fallback to the <strong className="text-text-secondary">LOW_VALUE</strong> tier.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lifecycle Rules Section */}
                <div className="bg-surface-card border border-border rounded-xl shadow-card overflow-hidden">
                  <div className="p-6 border-b border-border bg-surface-canvas/50">
                    <h3 className="text-h2 font-display font-semibold mb-1">Lifecycle Stage Rules</h3>
                    <p className="text-small text-text-secondary">
                      Configure how many days of inactivity push a customer into the At Risk or Dormant stages. 
                    </p>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-small font-medium text-text-secondary mb-2">Days until AT RISK</label>
                      <input 
                        type="number" 
                        value={formData.at_risk_days}
                        onChange={(e) => setFormData({...formData, at_risk_days: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-small font-medium text-text-secondary mb-2">Days until DORMANT</label>
                      <input 
                        type="number" 
                        value={formData.dormant_days}
                        onChange={(e) => setFormData({...formData, dormant_days: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-shadow"
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="bg-surface-card border border-border rounded-xl shadow-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-small text-text-secondary max-w-sm">
                    Saving these rules will instantly recalculate RFM scores and Lifecycle Stages for all customers in your database.
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="secondary" icon={<Save size={16} />} onClick={handleSave} loading={saving} className="flex-1 sm:flex-none">
                      Save Draft
                    </Button>
                    <Button icon={<RefreshCw size={16} />} onClick={handleRecalculate} loading={recalculating} className="flex-1 sm:flex-none">
                      Recalculate Data
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="animate-fade-in">
                {/* Danger Zone */}
                <div className="border border-status-error/30 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-status-error/20 bg-status-error/5">
                    <h3 className="text-h2 font-display font-semibold text-status-error mb-1 flex items-center gap-2">
                      <ShieldAlert size={18} /> Data Management
                    </h3>
                    <p className="text-small text-text-secondary">
                      Destructive actions to reset or seed your CRM environment for testing purposes. These actions cannot be undone.
                    </p>
                  </div>
                  <div className="p-6 bg-surface-card flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-border rounded-xl bg-surface-card shadow-sm gap-4 transition-all hover:border-brand-blue/30">
                      <div className="flex-1">
                        <h4 className="font-display font-semibold text-body text-text-primary">Generate Demo Data</h4>
                        <p className="text-small text-text-secondary mt-1 max-w-md">Wipes the database and instantly generates realistic mock customers complete with historical order patterns.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number"
                          min="1"
                          max="1000000"
                          value={seedSize}
                          onChange={(e) => setSeedSize(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-32 px-4 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50 text-small text-text-primary font-sans transition-shadow"
                        />
                        <Button onClick={() => handleDataAction('seed')} loading={managingData}>Seed Database</Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-status-error/30 rounded-xl bg-status-error/5 shadow-sm transition-all hover:border-status-error/50">
                      <div className="mb-4 sm:mb-0">
                        <h4 className="font-display font-semibold text-status-error text-body">Wipe Database</h4>
                        <p className="text-small text-status-error/80 mt-1 max-w-md">Permanently deletes all customers, orders, segments, and campaigns. Settings will be preserved.</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        onClick={() => handleDataAction('reset')} 
                        loading={managingData} 
                        className="!text-status-error !border-status-error/30 hover:!bg-status-error/10"
                      >
                        Factory Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
