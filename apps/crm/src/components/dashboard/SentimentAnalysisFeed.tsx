"use client";

import { MessageSquare, Smile, Frown, Meh } from "lucide-react";

const mockSentiments = [
  { id: 1, text: "Loving the new summer collection! The fabrics are so breathable.", sentiment: "positive", user: "jessica_m" },
  { id: 2, text: "My order hasn't arrived yet. It's been 5 days.", sentiment: "negative", user: "tom_b" },
  { id: 3, text: "Standard quality. Nothing special but fits okay.", sentiment: "neutral", user: "alex_k" },
  { id: 4, text: "Customer support was amazing! Fixed my issue in 5 mins.", sentiment: "positive", user: "sarah_j" },
];

export default function SentimentAnalysisFeed() {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 shadow-card flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-brand-blue" size={20} />
          <h3 className="text-h2 font-display font-semibold">Live Sentiment</h3>
        </div>
        <span className="text-small font-medium bg-surface-panel text-text-secondary px-2 py-1 rounded-full">
          Preview
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {mockSentiments.map((item) => (
          <div key={item.id} className="p-3 bg-surface-panel/30 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-small font-mono text-text-secondary">@{item.user}</span>
              {item.sentiment === "positive" && <Smile size={14} className="text-status-success" />}
              {item.sentiment === "negative" && <Frown size={14} className="text-status-danger" />}
              {item.sentiment === "neutral" && <Meh size={14} className="text-text-muted" />}
            </div>
            <p className="text-body text-text-primary text-sm line-clamp-2">
              &quot;{item.text}&quot;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
