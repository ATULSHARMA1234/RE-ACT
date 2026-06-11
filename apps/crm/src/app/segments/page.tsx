"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { Sparkles, Users, Filter, X, ChevronRight, Save, Plus, ArrowRight, Trash2, Download } from "lucide-react";
import Link from "next/link";

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

  // Saved Segments State
  const [savedSegments, setSavedSegments] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    fetchSavedSegments();
  }, []);

  const fetchSavedSegments = async () => {
    try {
      const res = await fetch("/api/segments");
      const data = await res.json();
      if (data.segments) setSavedSegments(data.segments);
    } catch (e) {
      console.error(e);
    }
  };

  const evaluateSegment = async (useAi: boolean) => {
    setLoading(true);
    setShowSaveInput(false);
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

  const saveSegment = async () => {
    if (!segmentName.trim() || !evalResult?.appliedFilter) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        body: JSON.stringify({
          name: segmentName,
          filter: evalResult.appliedFilter,
        }),
      });
      if (res.ok) {
        setSegmentName("");
        setShowSaveInput(false);
        fetchSavedSegments(); // refresh list
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(true);
    }
  };

  const deleteSegment = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent loading the segment
    if (!confirm("Are you sure you want to delete this segment?")) return;
    try {
      const res = await fetch(`/api/segments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSavedSegments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSegment = (segment: any) => {
    setFilter({
      lifecycle_stage: segment.filter_json.lifecycle_stage || [],
      rfm_score: segment.filter_json.rfm_score || [],
      channel_pref: segment.filter_json.channel_pref || [],
      min_orders: segment.filter_json.min_orders || "",
      max_days_since_purchase: segment.filter_json.max_days_since_purchase || "",
    });
    // Optional: could automatically trigger preview here, but let user click preview manually
  };

  const exportCSV = () => {
    if (!evalResult || !evalResult.preview) return;
    
    const headers = ["Name,Email,Phone,RFM Score,Lifecycle Stage\n"];
    const rows = evalResult.preview.map((c: any) => 
      `"${c.name}","${c.email}","${c.phone || ''}","${c.rfm_score}","${c.lifecycle_stage}"`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `segment_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        
        {/* Left Sidebar: Saved Segments */}
        <div className="w-[280px] shrink-0 flex flex-col gap-4 border-r border-border pr-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-display font-semibold text-text-primary">Saved Segments</h2>
            <div className="bg-surface-panel px-2 py-0.5 rounded-full text-[10px] font-bold text-text-secondary">
              {savedSegments.length}
            </div>
          </div>
          
          <div className="space-y-3">
            {savedSegments.length === 0 && (
              <p className="text-small text-text-muted italic">No saved segments yet.</p>
            )}
            {savedSegments.map(seg => (
              <div 
                key={seg.id} 
                onClick={() => loadSegment(seg)}
                className="bg-surface-card border border-border rounded-xl p-4 shadow-sm hover:border-brand-blue/30 transition-all group cursor-pointer relative"
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => deleteSegment(e, seg.id)} className="p-1 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="font-semibold text-body text-text-primary mb-1 truncate pr-6">{seg.name}</h3>
                <div className="flex flex-wrap gap-1 mb-3">
                   {/* Render a quick summary of the filter */}
                   {seg.filter_json.lifecycle_stage?.map((st: string) => (
                     <span key={st} className="text-[10px] bg-surface-panel px-1.5 py-0.5 rounded text-text-secondary">{st}</span>
                   ))}
                   {seg.filter_json.rfm_score?.map((rf: string) => (
                     <span key={rf} className="text-[10px] bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 rounded">{rf}</span>
                   ))}
                </div>
                <Link 
                  href={`/campaigns/new?segment_id=${seg.id}`}
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  Create Campaign <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Manual Builder & Preview */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-surface-card border border-border rounded-xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h2 font-display font-semibold flex items-center gap-2">
                <Filter size={20} className="text-brand-blue" />
                Build a Segment
              </h2>
              <Button onClick={() => evaluateSegment(false)} loading={loading}>
                Preview Audience
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
                          ? "bg-brand-blue text-white border-brand-blue shadow-md"
                          : "bg-surface-canvas text-text-primary border-border hover:bg-surface-panel hover:border-text-muted"
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
                          ? "bg-brand-blue text-white border-brand-blue shadow-md"
                          : "bg-surface-canvas text-text-primary border-border hover:bg-surface-panel hover:border-text-muted"
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
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
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
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface-canvas focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                  placeholder="e.g. 90"
                />
              </div>
            </div>
          </div>

          {/* Preview Results */}
          {evalResult && (
            <div className="bg-surface-card border border-border rounded-xl shadow-card p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-h2 font-display font-semibold flex items-center gap-2">
                    <Users size={18} className="text-text-secondary" />
                    Audience Preview
                  </h3>
                  <p className="text-small text-text-muted mt-1">
                    Matched <span className="font-bold text-brand-blue">{evalResult.count}</span> customers
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {showSaveInput ? (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <input 
                        type="text"
                        placeholder="Name this segment..."
                        value={segmentName}
                        onChange={e => setSegmentName(e.target.value)}
                        className="px-3 py-1.5 text-small border border-border rounded-lg focus:outline-none focus:border-brand-blue"
                        autoFocus
                      />
                      <Button onClick={saveSegment} loading={isSaving} size="sm">Save</Button>
                      <button onClick={() => setShowSaveInput(false)} className="p-1.5 text-text-muted hover:bg-surface-panel rounded-lg">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Button variant="secondary" icon={<Download size={16} />} onClick={exportCSV}>
                        Export CSV
                      </Button>
                      <Button variant="secondary" icon={<Save size={16} />} onClick={() => setShowSaveInput(true)}>
                        Save Segment
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
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
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-panel/50 transition-colors">
                        <td className="py-3 text-body font-medium">{c.name}</td>
                        <td className="py-3 text-body text-text-secondary">{c.email}</td>
                        <td className="py-3">
                          <StatusBadge variant={c.rfm_score === 'HIGH_VALUE' ? 'active' : 'new'}>
                            {c.rfm_score?.replace("_", " ") || "UNKNOWN"}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                    {evalResult.preview.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-text-muted">
                          <div className="flex flex-col items-center gap-2">
                            <Users size={32} className="opacity-20" />
                            <p>No customers match this filter.</p>
                          </div>
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
          <div className="w-[340px] bg-gradient-to-b from-brand-coral/10 to-brand-coral/5 border border-brand-coral/20 rounded-2xl p-6 flex flex-col shadow-drawer animate-slide-in relative shrink-0">
            <button
              onClick={() => setAiDrawerOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-brand-coral hover:bg-brand-coral/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-6 text-brand-coral">
              <Sparkles size={20} />
              <h2 className="text-h2 font-display font-bold">AI Co-Pilot</h2>
            </div>

            <p className="text-small text-brand-coral/80 mb-4 leading-relaxed">
              Describe the audience you want to reach, and I'll configure the filters for you instantly.
            </p>

            <textarea
              className="w-full h-32 p-4 rounded-xl border border-brand-coral/20 focus:outline-none focus:ring-2 focus:ring-brand-coral/50 bg-white/80 backdrop-blur-sm text-body resize-none mb-4 shadow-inner placeholder:text-text-muted"
              placeholder="e.g. Find my high value customers who haven't bought anything in 90 days..."
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
            />

            <Button
              variant="ai"
              className="w-full shadow-md hover:shadow-lg transition-all"
              onClick={() => evaluateSegment(true)}
              loading={loading}
              icon={<Sparkles size={16} />}
            >
              Generate Segment
            </Button>

            <div className="mt-auto pt-6 flex items-center justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/60 backdrop-blur-md rounded-full text-brand-coral text-[10px] font-bold tracking-wider uppercase border border-brand-coral/20 shadow-sm">
                <Sparkles size={12} />
                Powered by Groq
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAiDrawerOpen(true)}
            className="w-12 bg-brand-coral/5 border border-brand-coral/20 rounded-2xl flex items-center justify-center hover:bg-brand-coral/10 transition-colors shrink-0 shadow-sm group"
          >
            <ChevronRight size={24} className="text-brand-coral group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>
    </AppShell>
  );
}
