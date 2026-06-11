"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, RefreshCw, Send, AlertCircle } from "lucide-react";

interface Recommendation {
  title: string;
  reason: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  suggestedGoal: string;
}

export default function ProactiveAdvisor() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
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

  const handleUseRecommendation = (rec: Recommendation) => {
    const params = new URLSearchParams({
      goal: rec.suggestedGoal,
      channel: rec.channel,
      name: rec.title,
    });
    router.push(`/campaigns/new?${params.toString()}`);
  };

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

  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 mb-8 shadow-card relative overflow-hidden">
      {/* Decorative gradient blur background */}
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
        {recommendations.map((rec, idx) => (
          <div 
            key={idx} 
            className="flex flex-col border border-border rounded-lg p-5 bg-surface-panel/40 hover:bg-surface-panel/75 hover:border-brand-coral/30 transition-all duration-200 group shadow-sm hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-semibold px-2 py-1 bg-brand-blue/10 text-brand-blue rounded">
                {rec.channel}
              </span>
            </div>
            
            <h4 className="font-display font-semibold text-body text-text-primary mb-2 group-hover:text-brand-coral transition-colors">
              {rec.title}
            </h4>
            
            <p className="text-small text-text-secondary flex-grow mb-4 leading-relaxed">
              {rec.reason}
            </p>

            <button
              onClick={() => handleUseRecommendation(rec)}
              className="mt-auto w-full py-2.5 px-4 bg-white hover:bg-brand-coral hover:text-white border border-border hover:border-brand-coral rounded-lg font-medium text-small text-text-primary transition-all duration-150 inline-flex items-center justify-center gap-1"
            >
              Configure Campaign <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
