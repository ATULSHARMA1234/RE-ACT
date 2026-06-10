"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { Sparkles, Users, Filter, X, ChevronRight, Save } from "lucide-react";

export default function SegmentsPage() {
  const [filter, setFilter] = useState<any>({
    lifecycle_stage: [],
    rfm_score: [],
    channel_pref: [],
  });
  const [nlQuery, setNlQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(true);

  const evaluateSegment = async (useAi: boolean) => {
    setLoading(true);
    try {
      const payload = useAi ? { query: nlQuery } : { filter };
      const res = await fetch("/api/segments/evaluate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setEvalResult(data);
        if (useAi) {
          // Sync AI generated filter back to manual UI
          setFilter({
            lifecycle_stage: data.appliedFilter.lifecycle_stage || [],
            rfm_score: data.appliedFilter.rfm_score || [],
            channel_pref: data.appliedFilter.channel_pref || [],
            min_orders: data.appliedFilter.min_orders || "",
            max_days_since_purchase: data.appliedFilter.max_days_since_purchase || "",
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayFilter = (key: string, value: string) => {
    setFilter((prev: any) => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  return (
    <AppShell>
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        {/* Main Content: Manual Builder & Preview */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-surface-card border border-border rounded-lg shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h2 font-display font-semibold flex items-center gap-2">
                <Filter size={20} className="text-brand-blue" />
                Manual Segment Builder
              </h2>
              <Button onClick={() => evaluateSegment(false)} loading={loading}>
                Evaluate Filter
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Lifecycle Stage */}
              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">
                  Lifecycle Stage
                </label>
                <div className="flex flex-wrap gap-2">
                  {["NEW", "ACTIVE", "AT_RISK", "DORMANT"].map((stage) => (
                    <button
                      key={stage}
                      onClick={() => toggleArrayFilter("lifecycle_stage", stage)}
                      className={`px-3 py-1.5 rounded-pill text-small font-medium border transition-colors ${
                        filter.lifecycle_stage?.includes(stage)
                          ? "bg-brand-blue text-white border-brand-blue"
                          : "bg-surface-canvas text-text-primary border-border hover:bg-surface-panel"
                      }`}
                    >
                      {stage.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* RFM Score */}
              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">
                  RFM Score
                </label>
                <div className="flex flex-wrap gap-2">
                  {["HIGH_VALUE", "MID_TIER", "LOW_VALUE"].map((score) => (
                    <button
                      key={score}
                      onClick={() => toggleArrayFilter("rfm_score", score)}
                      className={`px-3 py-1.5 rounded-pill text-small font-medium border transition-colors ${
                        filter.rfm_score?.includes(score)
                          ? "bg-brand-blue text-white border-brand-blue"
                          : "bg-surface-canvas text-text-primary border-border hover:bg-surface-panel"
                      }`}
                    >
                      {score.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numeric constraints */}
              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">
                  Min Orders
                </label>
                <input
                  type="number"
                  value={filter.min_orders || ""}
                  onChange={(e) =>
                    setFilter({ ...filter, min_orders: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg"
                  placeholder="e.g. 2"
                />
              </div>

              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">
                  Max Days Since Purchase
                </label>
                <input
                  type="number"
                  value={filter.max_days_since_purchase || ""}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      max_days_since_purchase: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg"
                  placeholder="e.g. 90"
                />
              </div>
            </div>
          </div>

          {/* Preview Results */}
          {evalResult && (
            <div className="bg-surface-card border border-border rounded-lg shadow-card p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-h2 font-display font-semibold">
                  Audience Preview
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium">
                    Total matched:{" "}
                    <span className="text-brand-blue text-h2 font-bold">
                      {evalResult.count}
                    </span>
                  </span>
                  <Button variant="secondary" icon={<Save size={16} />}>
                    Save Segment
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-small font-semibold text-text-secondary py-2">Name</th>
                      <th className="text-left text-small font-semibold text-text-secondary py-2">Email</th>
                      <th className="text-left text-small font-semibold text-text-secondary py-2">RFM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResult.preview.map((c: any) => (
                      <tr key={c.id} className="border-b border-border last:border-0">
                        <td className="py-3 text-body">{c.name}</td>
                        <td className="py-3 text-body text-text-secondary">{c.email}</td>
                        <td className="py-3">
                          <StatusBadge variant="new">{c.rfm_score}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                    {evalResult.preview.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-text-muted">
                          No customers matched the criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* AI Sidebar Drawer */}
        {aiDrawerOpen ? (
          <div className="w-[400px] bg-brand-coral-light border border-brand-coral-border rounded-xl p-6 flex flex-col shadow-drawer animate-slide-in relative shrink-0">
            <button
              onClick={() => setAiDrawerOpen(false)}
              className="absolute top-4 right-4 p-1 text-brand-coral hover:bg-brand-coral/10 rounded-lg"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-6 text-brand-coral-text">
              <Sparkles size={24} />
              <h2 className="text-h2 font-display font-bold">AI Co-Pilot</h2>
            </div>

            <p className="text-body text-brand-coral-text mb-4">
              Describe the audience you want to reach, and Groq will build the segment for you in milliseconds.
            </p>

            <textarea
              className="w-full h-32 p-4 rounded-lg border border-brand-coral-border focus:outline-none focus:ring-2 focus:ring-brand-coral/50 bg-white text-body resize-none mb-4"
              placeholder="e.g., Show me high value customers who haven't bought anything in the last 60 days..."
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
            />

            <Button
              variant="ai"
              className="w-full"
              onClick={() => evaluateSegment(true)}
              loading={loading}
              icon={<Sparkles size={16} />}
            >
              Generate Segment
            </Button>

            <div className="mt-auto pt-6 flex items-center justify-end">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/50 rounded-pill text-brand-coral-text text-[10px] font-semibold tracking-wider uppercase border border-brand-coral-border/50">
                <Sparkles size={12} />
                Powered by Groq
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAiDrawerOpen(true)}
            className="w-12 bg-brand-coral-light border border-brand-coral-border rounded-xl flex items-center justify-center hover:bg-brand-coral/10 transition-colors shrink-0"
          >
            <ChevronRight size={24} className="text-brand-coral" />
          </button>
        )}
      </div>
    </AppShell>
  );
}
