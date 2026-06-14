"use client";

import { useState } from "react";
import { FileBarChart, ChevronDown, ChevronUp, Send, CheckCircle2, MailOpen, MousePointerClick, XCircle, BookOpen, Clock, Users } from "lucide-react";

interface ReportData {
  campaignName: string;
  segmentName: string;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  messageTemplate: string;
  metrics: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    read: number;
    clicked: number;
    pending: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    readRate: number;
    clickRate: number;
    failureRate: number;
  };
  statusDistribution: Record<string, number>;
  channelDistribution: Record<string, number>;
  aiInsights?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-200",
  SENT: "bg-blue-300",
  DELIVERED: "bg-green-300",
  OPENED: "bg-blue-400",
  READ: "bg-purple-300",
  CLICKED: "bg-purple-500",
  FAILED: "bg-red-400",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  PENDING: "text-gray-600",
  SENT: "text-blue-700",
  DELIVERED: "text-green-700",
  OPENED: "text-blue-700",
  READ: "text-purple-700",
  CLICKED: "text-purple-800",
  FAILED: "text-red-700",
};

export default function CampaignReport({ data }: { data: ReportData }) {
  const [expanded, setExpanded] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [targetStatus, setTargetStatus] = useState("OPENED");
  const [followupChannel, setFollowupChannel] = useState("EMAIL");
  const [followupMessage, setFollowupMessage] = useState("");
  const [sendingFollowup, setSendingFollowup] = useState(false);
  const [followupResult, setFollowupResult] = useState<{ count: number, status: string, channel: string } | null>(null);

  const { metrics, rates, statusDistribution, channelDistribution } = data;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const handleFollowup = async () => {
    setSendingFollowup(true);
    try {
      const res = await fetch(`/api/campaigns/${data.campaignId}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          channel: followupChannel,
          messageTemplate: followupMessage
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setShowFollowup(false);
        setFollowupResult({
          count: resData.recipient_count,
          status: targetStatus,
          channel: followupChannel
        });
      } else {
        alert(resData.error || "Failed to send follow-up");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    } finally {
      setSendingFollowup(false);
    }
  };

  const maxStatus = Math.max(...Object.values(statusDistribution), 1);

  return (
    <div className="mt-8 bg-surface-card border border-border rounded-xl shadow-card overflow-hidden animate-fade-in">
      {/* Report Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 border-b border-border flex items-center justify-between hover:bg-surface-panel/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <FileBarChart size={18} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-h2 font-display font-semibold">Campaign Report</h3>
            <p className="text-small text-text-muted">Complete performance breakdown</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
      </button>

      {expanded && (
        <div className="p-6 space-y-8">
          {/* ── Overview ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-surface-panel/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-text-muted" />
                <span className="text-small font-medium text-text-secondary uppercase tracking-wide">Segment</span>
              </div>
              <p className="text-body font-semibold">{data.segmentName}</p>
            </div>
            <div className="p-4 bg-surface-panel/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Send size={16} className="text-text-muted" />
                <span className="text-small font-medium text-text-secondary uppercase tracking-wide">Channel</span>
              </div>
              <p className="text-body font-semibold">{data.channel}</p>
            </div>
            <div className="p-4 bg-surface-panel/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-text-muted" />
                <span className="text-small font-medium text-text-secondary uppercase tracking-wide">Sent At</span>
              </div>
              <p className="text-body font-semibold" suppressHydrationWarning>{formatDate(data.sentAt)}</p>
            </div>
            <div className="p-4 bg-surface-panel/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-text-muted" />
                <span className="text-small font-medium text-text-secondary uppercase tracking-wide">Total Recipients</span>
              </div>
              <p className="text-body font-semibold">{metrics.total.toLocaleString()}</p>
            </div>
          </div>

          {/* ── Conversion Funnel ── */}
          <div>
            <h4 className="text-body font-semibold text-text-primary mb-4">Conversion Funnel</h4>
            <div className="space-y-3">
              {[
                { label: "Sent", value: metrics.sent, total: metrics.total, icon: Send, color: "bg-blue-500" },
                { label: "Delivered", value: metrics.delivered, total: metrics.sent, icon: CheckCircle2, color: "bg-green-500", rate: rates.deliveryRate },
                { label: "Opened", value: metrics.opened, total: metrics.delivered, icon: MailOpen, color: "bg-blue-600", rate: rates.openRate },
                { label: "Read", value: metrics.read, total: metrics.opened, icon: BookOpen, color: "bg-purple-500", rate: rates.readRate },
                { label: "Clicked", value: metrics.clicked, total: metrics.opened, icon: MousePointerClick, color: "bg-purple-700", rate: rates.clickRate },
              ].map((step, i) => {
                const pct = step.total > 0 ? Math.round((step.value / step.total) * 100) : 0;
                return (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className="w-28 flex items-center gap-2">
                      <step.icon size={14} className="text-text-muted" />
                      <span className="text-small font-medium text-text-secondary">{step.label}</span>
                    </div>
                    <div className="flex-1 bg-surface-panel rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full ${step.color} transition-all duration-700`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
                        {step.value.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    {step.rate !== undefined && (
                      <span className="w-14 text-right text-small font-bold text-text-primary">{step.rate}%</span>
                    )}
                  </div>
                );
              })}
              {metrics.failed > 0 && (
                <div className="flex items-center gap-4">
                  <div className="w-28 flex items-center gap-2">
                    <XCircle size={14} className="text-red-500" />
                    <span className="text-small font-medium text-red-600">Failed</span>
                  </div>
                  <div className="flex-1 bg-surface-panel rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400 transition-all duration-700"
                      style={{ width: `${Math.max(metrics.sent > 0 ? Math.round((metrics.failed / metrics.sent) * 100) : 0, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
                      {metrics.failed.toLocaleString()} ({rates.failureRate}%)
                    </span>
                  </div>
                  <span className="w-14 text-right text-small font-bold text-red-600">{rates.failureRate}%</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Status Distribution ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-body font-semibold text-text-primary mb-4">Status Distribution</h4>
              <div className="space-y-2">
                {Object.entries(statusDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`text-small font-medium w-24 ${STATUS_TEXT_COLORS[status] || "text-text-secondary"}`}>{status}</span>
                      <div className="flex-1 bg-surface-panel rounded-full h-5 relative overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STATUS_COLORS[status] || "bg-gray-300"} transition-all duration-500`}
                          style={{ width: `${(count / maxStatus) * 100}%` }}
                        />
                      </div>
                      <span className="text-small font-bold text-text-primary w-12 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="text-body font-semibold text-text-primary mb-4">Recipient Channel Preference</h4>
              <div className="space-y-2">
                {Object.entries(channelDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ch, count]) => {
                    const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                    return (
                      <div key={ch} className="flex items-center gap-3">
                        <span className="text-small font-medium w-24 text-text-secondary">{ch}</span>
                        <div className="flex-1 bg-surface-panel rounded-full h-5 relative overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-small font-bold text-text-primary w-16 text-right">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* ── Message Template ── */}
          {data.messageTemplate && (
            <div>
              <h4 className="text-body font-semibold text-text-primary mb-3">Message Template</h4>
              <div className="p-4 bg-surface-panel/50 border border-border rounded-lg whitespace-pre-wrap text-body text-text-secondary leading-relaxed">
                {data.messageTemplate}
              </div>
            </div>
          )}

          {/* ── Summary & AI Insights ── */}
          <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg relative">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-body font-semibold text-indigo-900">Summary</h4>
              <button 
                onClick={() => setShowFollowup(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-small font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Send size={14} /> Create Follow-up
              </button>
            </div>
            
            <p className="text-small text-indigo-700 leading-relaxed mb-4 pr-32">
              Campaign &ldquo;{data.campaignName}&rdquo; targeted <strong>{metrics.total.toLocaleString()}</strong> recipients
              via <strong>{data.channel}</strong>.
              {metrics.sent > 0 && (
                <> Achieved a <strong>{rates.deliveryRate}%</strong> delivery rate
                and <strong>{rates.openRate}%</strong> open rate.</>
              )}
              {metrics.clicked > 0 && (
                <> <strong>{metrics.clicked.toLocaleString()}</strong> recipients clicked through ({rates.clickRate}% click-to-open rate).</>
              )}
              {metrics.failed > 0 && (
                <> <strong>{metrics.failed.toLocaleString()}</strong> messages failed to deliver.</>
              )}
            </p>

            {followupResult && (
              <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg flex items-start gap-3 animate-fade-in">
                <CheckCircle2 className="text-green-600 mt-0.5" size={16} />
                <div>
                  <h5 className="text-small font-semibold text-green-900">Follow-up Dispatched Successfully</h5>
                  <p className="text-small text-green-800 mt-1">
                    Sent to <strong>{followupResult.count}</strong> recipients who were marked as <strong>{followupResult.status === 'ALL' ? 'ALL' : followupResult.status}</strong> via <strong>{followupResult.channel}</strong>.
                  </p>
                </div>
              </div>
            )}

            {data.aiInsights && data.aiInsights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-200/60">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">AI</span>
                  </div>
                  <h4 className="text-small font-semibold text-indigo-900">Recommended Next Steps</h4>
                </div>
                <ul className="space-y-2">
                  {data.aiInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-small text-indigo-800">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span className="leading-relaxed">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-h2 font-display font-semibold">Create Follow-up Campaign</h3>
              <button onClick={() => setShowFollowup(false)} className="text-text-muted hover:text-text-primary p-1">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Target Audience Status</label>
                <select
                  value={targetStatus}
                  onChange={e => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-body bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="ALL">All Recipients ({metrics.total})</option>
                  <option value="DELIVERED">Delivered ({metrics.delivered})</option>
                  <option value="OPENED">Opened ({metrics.opened})</option>
                  <option value="READ">Read ({metrics.read})</option>
                  <option value="CLICKED">Clicked ({metrics.clicked})</option>
                  <option value="FAILED">Failed ({metrics.failed})</option>
                </select>
              </div>

              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Channel</label>
                <div className="flex gap-3">
                  {['EMAIL', 'WHATSAPP', 'SMS'].map(ch => (
                    <button
                      key={ch}
                      onClick={() => setFollowupChannel(ch)}
                      className={`flex-1 py-2 border rounded-lg text-small font-medium transition-colors ${followupChannel === ch ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-border hover:bg-surface-panel text-text-secondary'}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Message Content</label>
                <textarea
                  value={followupMessage}
                  onChange={e => setFollowupMessage(e.target.value)}
                  className="w-full h-32 p-3 border border-border rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  placeholder="Draft your follow-up message..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowFollowup(false)}
                className="px-4 py-2 text-small font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleFollowup}
                disabled={sendingFollowup || !followupMessage}
                className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 text-white rounded-lg text-small font-semibold transition-colors flex items-center gap-2"
              >
                {sendingFollowup ? <span className="animate-spin"><Clock size={16}/></span> : <Send size={16} />}
                Fire Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
