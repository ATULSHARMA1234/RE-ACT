"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Rocket,
  Zap,
} from "lucide-react";

interface Recommendation {
  title: string;
  reason: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  suggestedGoal: string;
}

type ExecutionStep = "idle" | "segment" | "draft" | "fire" | "done" | "error";

interface ExecutionState {
  step: ExecutionStep;
  segmentId?: string;
  segmentName?: string;
  message?: string;
  campaignId?: string;
  recipientCount?: number;
  error?: string;
}

export default function ProactiveAdvisor() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Track execution state per recommendation (by index)
  const [execStates, setExecStates] = useState<Record<number, ExecutionState>>({});

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    setExecStates({});
    try {
      const res = await fetch("/api/ai/advisor");
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || "Failed to load suggestions.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const updateExecState = (idx: number, update: Partial<ExecutionState>) => {
    setExecStates(prev => ({
      ...prev,
      [idx]: { ...prev[idx], ...update },
    }));
  };

  // Full autonomous execution: segment → draft → fire
  const handleExecute = async (rec: Recommendation, idx: number) => {
    updateExecState(idx, { step: "segment" });

    try {
      // Step 1: Create a segment using AI parsing
      const segRes = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `[AI] ${rec.title}`,
          naturalLanguage: rec.suggestedGoal,
        }),
      });
      const segData = await segRes.json();

      if (!segData.id && !segData.segment?.id) {
        // Fallback: try to use an existing segment or create manually
        const listRes = await fetch("/api/segments");
        const listData = await listRes.json();
        const segments = listData.segments || [];

        if (segments.length === 0) {
          throw new Error("No segments available. Please create a segment first.");
        }

        // Pick the first segment as fallback
        const fallbackSeg = segments[0];
        updateExecState(idx, {
          step: "draft",
          segmentId: fallbackSeg.id,
          segmentName: fallbackSeg.name,
        });

        await draftAndFire(rec, idx, fallbackSeg.id);
        return;
      }

      const segmentId = segData.id || segData.segment?.id;
      const segmentName = segData.name || segData.segment?.name || rec.title;

      updateExecState(idx, { step: "draft", segmentId, segmentName });
      await draftAndFire(rec, idx, segmentId);
    } catch (err: any) {
      updateExecState(idx, { step: "error", error: err.message });
    }
  };

  const draftAndFire = async (rec: Recommendation, idx: number, segmentId: string) => {
    try {
      // Step 2: Draft message via AI
      const draftRes = await fetch("/api/campaigns/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignGoal: rec.suggestedGoal,
          audienceDescription: rec.title,
          channel: rec.channel,
        }),
      });
      const draftData = await draftRes.json();
      const messageTemplate = draftData.draft || draftData.message || `Hi {{first_name}}, ${rec.suggestedGoal}`;

      updateExecState(idx, { step: "fire", message: messageTemplate });

      // Step 3: Fire the campaign
      const fireRes = await fetch("/api/campaigns/fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rec.title,
          segment_id: segmentId,
          channel: rec.channel,
          message_template: messageTemplate,
        }),
      });
      const fireData = await fireRes.json();

      if (fireData.success) {
        updateExecState(idx, {
          step: "done",
          campaignId: fireData.campaign_id,
          recipientCount: fireData.recipient_count,
        });
      } else {
        throw new Error(fireData.error || "Campaign firing failed");
      }
    } catch (err: any) {
      updateExecState(idx, { step: "error", error: err.message });
    }
  };

  const handleConfigure = (rec: Recommendation) => {
    const params = new URLSearchParams({
      goal: rec.suggestedGoal,
      channel: rec.channel,
      name: rec.title,
    });
    router.push(`/campaigns/new?${params.toString()}`);
  };

  const getStepLabel = (step: ExecutionStep): string => {
    switch (step) {
      case "segment": return "Creating segment…";
      case "draft": return "Drafting message…";
      case "fire": return "Firing campaign…";
      case "done": return "Campaign sent!";
      case "error": return "Failed";
      default: return "";
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="bg-surface-card border border-border rounded-lg p-6 mb-8 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-brand-coral animate-pulse" size={20} />
            <h3 className="text-h3 font-display font-semibold">AI Marketing Co-Pilot</h3>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-brand-coral/30 border-t-brand-coral animate-spin" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-5 bg-surface-panel/50 space-y-3 animate-pulse">
              <div className="h-5 bg-border rounded w-2/3" />
              <div className="h-4 bg-border rounded w-full" />
              <div className="h-4 bg-border rounded w-5/6" />
              <div className="h-8 bg-border rounded w-1/3 pt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="bg-surface-card border border-border rounded-lg p-6 mb-8 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-brand-coral" size={20} />
            <h3 className="text-h3 font-display font-semibold">AI Marketing Co-Pilot</h3>
          </div>
          <button onClick={fetchRecommendations} className="text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 p-4 bg-brand-coral/10 border border-brand-coral/20 rounded-lg text-brand-coral-text">
          <AlertCircle size={20} />
          <div>
            <p className="font-semibold text-body">Unable to fetch recommendations</p>
            <p className="text-small text-text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main State ──
  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 mb-8 shadow-card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-coral/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-coral animate-pulse" size={20} />
          <div>
            <h3 className="text-h3 font-display font-semibold text-text-primary">AI Marketing Co-Pilot</h3>
            <p className="text-small text-text-secondary">Proactive suggestions based on your real-time audience data</p>
          </div>
        </div>
        <button
          onClick={fetchRecommendations}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-panel rounded-lg transition-all"
          title="Refresh recommendations"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {recommendations.map((rec, idx) => {
          const exec = execStates[idx] || { step: "idle" as ExecutionStep };
          const isExecuting = ["segment", "draft", "fire"].includes(exec.step);
          const isDone = exec.step === "done";
          const isError = exec.step === "error";

          return (
            <div
              key={idx}
              className={`flex flex-col border rounded-lg p-5 transition-all duration-200 group shadow-sm ${
                isDone
                  ? "border-status-success/40 bg-status-success/5"
                  : isError
                  ? "border-status-error/40 bg-status-error/5"
                  : "border-border bg-surface-panel/40 hover:bg-surface-panel/75 hover:border-brand-coral/30 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold px-2 py-1 bg-brand-blue/10 text-brand-blue rounded">
                  {rec.channel}
                </span>
                {isDone && <CheckCircle2 size={16} className="text-status-success" />}
                {isExecuting && <Loader2 size={16} className="animate-spin text-brand-coral" />}
              </div>

              <h4 className="font-display font-semibold text-body text-text-primary mb-2 group-hover:text-brand-coral transition-colors">
                {rec.title}
              </h4>

              <p className="text-small text-text-secondary flex-grow mb-4 leading-relaxed">
                {rec.reason}
              </p>

              {/* Execution Progress */}
              {isExecuting && (
                <div className="mb-4 p-3 bg-brand-coral/5 border border-brand-coral/20 rounded-lg">
                  <div className="flex items-center gap-2 text-small text-brand-coral font-medium">
                    <Loader2 size={14} className="animate-spin" />
                    {getStepLabel(exec.step)}
                  </div>
                  {/* Progress dots */}
                  <div className="flex items-center gap-2 mt-2">
                    {["segment", "draft", "fire"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full transition-colors ${
                          ["segment", "draft", "fire"].indexOf(exec.step) >= i
                            ? "bg-brand-coral"
                            : "bg-border"
                        }`} />
                        {i < 2 && <div className="w-4 h-px bg-border" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success State */}
              {isDone && (
                <div className="mb-4 p-3 bg-status-success/10 border border-status-success/20 rounded-lg">
                  <p className="text-small text-status-success font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    Sent to {exec.recipientCount?.toLocaleString()} recipients
                  </p>
                  <button
                    onClick={() => router.push(`/campaigns/${exec.campaignId}`)}
                    className="text-xs text-brand-blue hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    View Live Tracker <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="mb-4 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
                  <p className="text-small text-status-error font-medium">{exec.error}</p>
                </div>
              )}

              {/* Action Buttons */}
              {exec.step === "idle" && (
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => handleExecute(rec, idx)}
                    className="flex-1 py-2.5 px-4 bg-brand-coral text-white border border-brand-coral rounded-lg font-medium text-small transition-all duration-150 inline-flex items-center justify-center gap-1 hover:bg-brand-coral/90"
                  >
                    <Rocket size={14} /> Execute
                  </button>
                  <button
                    onClick={() => handleConfigure(rec)}
                    className="py-2.5 px-4 bg-white hover:bg-surface-panel border border-border rounded-lg font-medium text-small text-text-primary transition-all duration-150 inline-flex items-center justify-center gap-1"
                    title="Customize before sending"
                  >
                    <Zap size={14} />
                  </button>
                </div>
              )}

              {isDone && (
                <button
                  onClick={() => router.push(`/campaigns/${exec.campaignId}`)}
                  className="mt-auto w-full py-2.5 px-4 bg-status-success/10 hover:bg-status-success/20 border border-status-success/30 rounded-lg font-medium text-small text-status-success transition-all duration-150 inline-flex items-center justify-center gap-1"
                >
                  Track Campaign <ArrowRight size={14} />
                </button>
              )}

              {isError && (
                <button
                  onClick={() => handleExecute(rec, idx)}
                  className="mt-auto w-full py-2.5 px-4 bg-white hover:bg-surface-panel border border-border rounded-lg font-medium text-small text-text-primary transition-all duration-150 inline-flex items-center justify-center gap-1"
                >
                  <RefreshCw size={14} /> Retry
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
