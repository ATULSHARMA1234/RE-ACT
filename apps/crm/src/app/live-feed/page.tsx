



"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import {
  Play,
  Pause,
  ShoppingBag,
  Mail,
  Zap,
  Radio,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MailOpen,
  MousePointerClick,
  Send,
  Workflow,
  RefreshCw,
  ArrowRight,
  Timer,
  MessageCircle,
  ChevronDown,
  FlaskConical,
  ShoppingCart,
  Eye,
  Heart,
  Trash2,
  CreditCard,
  Star,
  Tag,
  XOctagon,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */

interface FeedEvent {
  id: string;
  type: "ORDER" | "WORKFLOW_JOB" | "COMMUNICATION" | "CUSTOMER_EVENT";
  timestamp: string;
  customer: { id: string; name: string; email: string };
  details: Record<string, any>;
  _isNew?: boolean;
}

interface WorkflowSummary { id: string; name: string; status: string; }
interface SelectedWorkflow { id: string; name: string; status: string; nodes_json: any; }
interface WorkflowActivity {
  triggerCount: number; jobsPending: number; jobsCompleted: number;
  totalMessages: number; sent: number; delivered: number; opened: number; failed: number;
}

/* ─── Event Display Helpers ──────────────────────────────────────── */

const EVENT_META: Record<string, { icon: any; label: string; color: string; bg: string; border: string }> = {
  ORDER_PLACED: { icon: ShoppingBag, label: "Order Placed", color: "text-brand-green", bg: "bg-brand-green/5", border: "border-brand-green/20" },
  CART_ABANDONED: { icon: ShoppingCart, label: "Cart Abandoned", color: "text-brand-amber", bg: "bg-brand-amber/5", border: "border-brand-amber/20" },
  ADDED_TO_CART: { icon: ShoppingCart, label: "Added to Cart", color: "text-brand-blue", bg: "bg-brand-blue/5", border: "border-brand-blue/20" },
  REMOVED_FROM_CART: { icon: Trash2, label: "Removed from Cart", color: "text-status-danger", bg: "bg-status-danger/5", border: "border-status-danger/20" },
  CHECKOUT_STARTED: { icon: CreditCard, label: "Checkout Started", color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/5", border: "border-[#8B5CF6]/20" },
  PAGE_VIEWED: { icon: Eye, label: "Page Viewed", color: "text-text-secondary", bg: "bg-surface-panel/30", border: "border-border" },
  WISHLIST_ADDED: { icon: Heart, label: "Added to Wishlist", color: "text-brand-coral", bg: "bg-brand-coral/5", border: "border-brand-coral/20" },
  ORDER_CANCELLED: { icon: XOctagon, label: "Order Cancelled", color: "text-status-danger", bg: "bg-status-danger/5", border: "border-status-danger/20" },
  REVIEW_SUBMITTED: { icon: Star, label: "Review Submitted", color: "text-brand-amber", bg: "bg-brand-amber/5", border: "border-brand-amber/20" },
  COUPON_APPLIED: { icon: Tag, label: "Coupon Applied", color: "text-brand-green", bg: "bg-brand-green/5", border: "border-brand-green/20" },
};

function formatTimestamp(ts: string): string {
  const diffSec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function getEventDisplay(event: FeedEvent) {
  if (event.type === "CUSTOMER_EVENT") {
    const meta = EVENT_META[event.details?.event_type] || EVENT_META.PAGE_VIEWED;
    const Icon = meta.icon;
    let desc = event.customer.name;
    const d = event.details;

    switch (d.event_type) {
      case "ORDER_PLACED": desc = `${event.customer.name} placed an order — ${d.product_name} ($${d.amount})`; break;
      case "CART_ABANDONED": desc = `${event.customer.name} abandoned cart — ${d.cart_items} item(s), $${d.amount}`; break;
      case "ADDED_TO_CART": desc = `${event.customer.name} added ${d.product_name} to cart ($${d.amount})`; break;
      case "REMOVED_FROM_CART": desc = `${event.customer.name} removed ${d.product_name} from cart`; break;
      case "CHECKOUT_STARTED": desc = `${event.customer.name} started checkout — ${d.product_name}`; break;
      case "PAGE_VIEWED": desc = `${event.customer.name} viewed ${d.page}`; break;
      case "WISHLIST_ADDED": desc = `${event.customer.name} wishlisted ${d.product_name}`; break;
      case "ORDER_CANCELLED": desc = `${event.customer.name} cancelled order — ${d.reason}`; break;
      case "REVIEW_SUBMITTED": desc = `${event.customer.name} reviewed ${d.product_name} — ${"★".repeat(d.rating || 0)}`; break;
      case "COUPON_APPLIED": desc = `${event.customer.name} applied coupon ${d.coupon_code} (${d.discount_pct}% off)`; break;
    }

    return {
      icon: <Icon size={15} className={meta.color} />,
      title: meta.label,
      desc,
      bg: `${meta.bg} ${meta.border}`,
    };
  }

  if (event.type === "ORDER") {
    return {
      icon: <ShoppingBag size={15} className="text-brand-green" />,
      title: `Order — $${event.details.amount?.toLocaleString()}`,
      desc: `${event.customer.name} ordered "${event.details.product_name}"`,
      bg: "bg-brand-green/5 border-brand-green/20",
    };
  }

  if (event.type === "WORKFLOW_JOB") {
    return {
      icon: <Zap size={15} className="text-[#8B5CF6]" />,
      title: `Workflow: ${event.details.workflow_name}`,
      desc: `${event.details.channel} to ${event.customer.name} — ${event.details.status}`,
      bg: "bg-[#8B5CF6]/5 border-[#8B5CF6]/20",
    };
  }

  // COMMUNICATION
  const s = event.details?.status;
  const commIcons: Record<string, any> = {
    FAILED: <XCircle size={15} className="text-status-danger" />,
    CLICKED: <MousePointerClick size={15} className="text-brand-green" />,
    OPENED: <MailOpen size={15} className="text-brand-amber" />,
    READ: <MailOpen size={15} className="text-brand-amber" />,
    DELIVERED: <CheckCircle2 size={15} className="text-brand-green" />,
  };

  return {
    icon: commIcons[s] || <Send size={15} className="text-brand-coral" />,
    title: `${event.details.channel || "Message"} → ${s}`,
    desc: `${event.customer.name} via ${event.details.source}`,
    bg: "bg-brand-coral/5 border-brand-coral/20",
  };
}

/* ─── Workflow Pipeline ──────────────────────────────────────────── */

function WorkflowPipeline({ workflow, activity }: { workflow: SelectedWorkflow; activity: WorkflowActivity | null }) {
  let nodes: any[] = [];
  if (workflow.nodes_json && !Array.isArray(workflow.nodes_json)) nodes = workflow.nodes_json.nodes || [];

  const pipeline: Array<{
    label: string; icon: React.ReactNode; count: number;
    status: "idle" | "active" | "success" | "warning" | "error";
    detail: string; pulseColor: string; bgColor: string; borderColor: string; iconBg: string;
  }> = [];

  const triggerNode = nodes.find((n: any) => n.data?.originalType === "trigger" || n.type === "triggerNode");
  const triggerLabel = triggerNode?.data?.config?.condition || "Order Placed";
  const tc = activity?.triggerCount ?? 0;
  pipeline.push({
    label: triggerLabel, icon: <Play size={18} />, count: tc,
    status: tc > 0 ? "active" : "idle",
    detail: tc > 0 ? `${tc} events matched` : "Waiting…",
    pulseColor: "bg-brand-blue", bgColor: "bg-brand-blue/5",
    borderColor: tc > 0 ? "border-brand-blue" : "border-border",
    iconBg: "bg-brand-blue/10 text-brand-blue",
  });

  const delayNode = nodes.find((n: any) => n.data?.originalType === "delay" || n.type === "delayNode");
  if (delayNode) {
    const pj = activity?.jobsPending ?? 0;
    pipeline.push({
      label: `Delay: ${delayNode.data?.config?.time || "Wait"}`, icon: <Timer size={18} />, count: pj,
      status: pj > 0 ? "warning" : tc > 0 ? "success" : "idle",
      detail: pj > 0 ? `${pj} jobs waiting` : "No pending",
      pulseColor: "bg-brand-amber", bgColor: "bg-brand-amber/5",
      borderColor: pj > 0 ? "border-brand-amber" : "border-border",
      iconBg: "bg-brand-amber/10 text-brand-amber",
    });
  }

  const messageNode = nodes.find((n: any) => n.data?.originalType === "message" || n.type === "messageNode");
  if (messageNode) {
    const ch = messageNode.data?.config?.channel || "EMAIL";
    const s = activity?.sent ?? 0; const f = activity?.failed ?? 0;
    pipeline.push({
      label: `Send ${ch}`, icon: <MessageCircle size={18} />, count: s,
      status: f > 0 ? "error" : s > 0 ? "active" : "idle",
      detail: s > 0 ? `${s} sent, ${f} failed` : "No messages",
      pulseColor: "bg-brand-green", bgColor: "bg-brand-green/5",
      borderColor: s > 0 ? "border-brand-green" : "border-border",
      iconBg: "bg-brand-green/10 text-brand-green",
    });
  }

  const dv = activity?.delivered ?? 0; const op = activity?.opened ?? 0; const tot = activity?.totalMessages ?? 0;
  pipeline.push({
    label: "Delivered", icon: <CheckCircle2 size={18} />, count: dv,
    status: dv > 0 ? "success" : "idle",
    detail: dv > 0 ? `${dv} delivered, ${op} opened${tot > 0 ? ` (${Math.round((dv / tot) * 100)}%)` : ""}` : "Awaiting…",
    pulseColor: "bg-brand-green", bgColor: dv > 0 ? "bg-[#ECFDF5]" : "bg-surface-panel/30",
    borderColor: dv > 0 ? "border-brand-green" : "border-border",
    iconBg: dv > 0 ? "bg-brand-green/10 text-brand-green" : "bg-surface-panel text-text-muted",
  });

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-5 px-6">
      {pipeline.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className={`relative flex flex-col items-center w-[170px] shrink-0 rounded-2xl border-2 px-3 py-4 transition-all duration-500 ${step.bgColor} ${step.borderColor} ${step.status !== "idle" ? "shadow-lg" : "shadow-sm"}`}>
            {step.status === "active" && (
              <><div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${step.pulseColor} animate-ping opacity-40`} /><div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${step.pulseColor}`} /></>
            )}
            {step.status === "success" && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-green flex items-center justify-center shadow-sm"><CheckCircle2 size={12} className="text-white" /></div>
            )}
            {step.status === "error" && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-danger flex items-center justify-center shadow-sm"><XCircle size={12} className="text-white" /></div>
            )}
            <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center mb-2`}>{step.icon}</div>
            <p className="text-small font-semibold text-text-primary text-center leading-tight">{step.label}</p>
            <div className={`mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold ${step.count > 0 ? "bg-white/80 text-text-primary border border-white shadow-sm" : "bg-surface-panel/50 text-text-muted"}`}>
              {step.count > 0 ? step.count.toLocaleString() : "—"}
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 text-center leading-tight">{step.detail}</p>
          </div>
          {i < pipeline.length - 1 && (
            <div className="flex items-center mx-1 shrink-0">
              <div className={`w-8 h-0.5 transition-colors duration-500 ${pipeline[i + 1].status !== "idle" ? "bg-brand-green" : "bg-border"}`} />
              <ArrowRight size={14} className={`-ml-1 transition-colors ${pipeline[i + 1].status !== "idle" ? "text-brand-green" : "text-text-muted"}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export default function LiveFeedPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [allWorkflows, setAllWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<SelectedWorkflow | null>(null);
  const [workflowActivity, setWorkflowActivity] = useState<WorkflowActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  // Stats from events
  const customerEventCount = events.filter((e) => e.type === "CUSTOMER_EVENT").length;
  const orderCount = events.filter((e) => e.type === "CUSTOMER_EVENT" && e.details?.event_type === "ORDER_PLACED").length
    + events.filter((e) => e.type === "ORDER").length;
  const jobCount = events.filter((e) => e.type === "WORKFLOW_JOB").length;
  const commCount = events.filter((e) => e.type === "COMMUNICATION").length;
  const deliveredCount = events.filter(
    (e) => e.type === "COMMUNICATION" && ["DELIVERED", "OPENED", "READ", "CLICKED"].includes(e.details?.status)
  ).length;

  const fetchEvents = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const wfParam = selectedWorkflowId ? `&workflow_id=${selectedWorkflowId}` : "";
      const res = await fetch(`/api/live-feed?since=${since}${wfParam}`);
      const data = await res.json();
      if (data.success) {
        setEvents((prev) => {
          const prevIds = new Set(prev.map((e) => e.id + e.type));
          const newEvents = (data.events as FeedEvent[]).filter((e) => !prevIds.has(e.id + e.type));
          const marked = newEvents.map((e) => ({ ...e, _isNew: true }));
          if (marked.length > 0) return [...marked, ...prev].slice(0, 300);
          return prev.length === 0 ? data.events : prev;
        });
        if (data.allWorkflows) setAllWorkflows(data.allWorkflows);
        if (data.selectedWorkflow) {
          setSelectedWorkflow(data.selectedWorkflow);
          if (!selectedWorkflowId) setSelectedWorkflowId(data.selectedWorkflow.id);
        }
        if (data.workflowActivity) setWorkflowActivity(data.workflowActivity);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error("[LiveFeed] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkflowId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Polling — 3 seconds when running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(fetchEvents, 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, fetchEvents]);

  // Start/Stop simulation on channel-stub
  useEffect(() => {
    if (isRunning) {
      fetch(`${SOCKET_URL}/simulation/start`, { method: "POST" }).catch(() => { });
    } else {
      fetch(`${SOCKET_URL}/simulation/stop`, { method: "POST" }).catch(() => { });
    }
  }, [isRunning, SOCKET_URL]);

  // Socket.IO
  useEffect(() => {
    if (!isRunning) { socketRef.current?.disconnect(); socketRef.current = null; return; }
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.on("delivery_event", (event) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.type === "COMMUNICATION" && e.id === event.communication_id
            ? { ...e, timestamp: event.timestamp, details: { ...e.details, status: event.event_type }, _isNew: true }
            : e
        )
      );
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [isRunning, SOCKET_URL]);

  // Clear _isNew
  useEffect(() => {
    if (events.some((e) => e._isNew)) {
      const t = setTimeout(() => setEvents((p) => p.map((e) => ({ ...e, _isNew: false }))), 1500);
      return () => clearTimeout(t);
    }
  }, [events]);

  const handleWorkflowSelect = (wfId: string) => {
    setSelectedWorkflowId(wfId);
    setEvents([]);
    setWorkflowActivity(null);
    setShowSelector(false);
    setIsLoading(true);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-display font-display font-bold text-text-primary tracking-tight flex items-center gap-3">
              <Radio size={24} className={isRunning ? "text-brand-green animate-pulse" : "text-text-muted"} />
              Live Feed
            </h1>
            <p className="text-body text-text-secondary mt-1">
              Real-time customer activity — orders, cart actions, and automated workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-small text-text-muted" suppressHydrationWarning>
                Updated {formatTimestamp(lastFetch.toISOString())}
              </span>
            )}
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full font-semibold text-body transition-all duration-300 shadow-sm ${isRunning
                  ? "bg-status-danger text-white hover:bg-status-danger/90"
                  : "bg-brand-green text-white hover:bg-brand-green/90"
                }`}
            >
              {isRunning ? (<><Pause size={16} /> Stop</>) : (<><Play size={16} /> Start Live</>)}
            </button>
          </div>
        </div>

        {/* Control Bar: Workflow Selector */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-3 px-4 py-2.5 bg-white/70 backdrop-blur-xl border border-white/60 rounded-xl shadow-sm hover:shadow-card transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                <FlaskConical size={16} className="text-[#8B5CF6]" />
              </div>
              <div className="text-left">
                <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold">Active Workflow</p>
                <p className="text-body font-semibold text-text-primary">
                  {selectedWorkflow?.name || "Select…"}
                </p>
              </div>
              {selectedWorkflow && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${selectedWorkflow.status === "ACTIVE" ? "bg-[#E6F4EA] text-[#1E8E3E]" : "bg-surface-panel text-text-secondary"
                  }`}>{selectedWorkflow.status}</span>
              )}
              <ChevronDown size={16} className={`text-text-muted transition-transform ${showSelector ? "rotate-180" : ""}`} />
            </button>

            {showSelector && (
              <div className="absolute top-full left-0 mt-2 w-[360px] bg-white border border-border rounded-xl shadow-modal z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-border bg-surface-panel/30">
                  <p className="text-small font-semibold text-text-secondary uppercase tracking-wide">Choose a workflow</p>
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  {allWorkflows.length === 0 ? (
                    <div className="p-6 text-center text-text-muted">
                      <Workflow size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-small">No workflows found.</p>
                    </div>
                  ) : allWorkflows.map((wf) => (
                    <button key={wf.id} onClick={() => handleWorkflowSelect(wf.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-panel/50 transition-colors border-b border-border/50 last:border-0 ${selectedWorkflowId === wf.id ? "bg-brand-blue/5" : ""}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${wf.status === "ACTIVE" ? "bg-brand-green/10" : "bg-surface-panel"}`}>
                        <Workflow size={16} className={wf.status === "ACTIVE" ? "text-brand-green" : "text-text-muted"} />
                      </div>
                      <p className="flex-1 text-body font-semibold text-text-primary truncate">{wf.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${wf.status === "ACTIVE" ? "bg-[#E6F4EA] text-[#1E8E3E]" : "bg-surface-panel text-text-secondary"}`}>{wf.status}</span>
                      {selectedWorkflowId === wf.id && <CheckCircle2 size={16} className="text-brand-blue shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isRunning && (
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-green/5 border border-brand-green/20 rounded-xl animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-ping" />
              <span className="text-small font-medium text-brand-green">Simulating customer activity…</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-4 shrink-0">
          {([
            { icon: Eye, color: "text-text-secondary", bg: "bg-surface-panel/50", count: customerEventCount, label: "Events" },
            { icon: ShoppingBag, color: "text-brand-green", bg: "bg-brand-green/10", count: orderCount, label: "Orders" },
            { icon: Zap, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10", count: jobCount, label: "Triggers" },
            { icon: Mail, color: "text-brand-coral", bg: "bg-brand-coral/10", count: commCount, label: "Messages" },
            { icon: CheckCircle2, color: "text-brand-green", bg: "bg-brand-green/10", count: deliveredCount, label: "Delivered" },
          ] as const).map((s) => (
            <div key={s.label} className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-h2 font-display font-bold text-text-primary">{s.count}</p>
                <p className="text-[11px] text-text-muted uppercase tracking-wide">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Split */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* TOP: Pipeline */}
          <div className="shrink-0 bg-white/60 backdrop-blur-xl border border-white/60 rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-surface-card/50">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                  <Workflow size={14} className="text-[#8B5CF6]" />
                </div>
                <div>
                  <h2 className="text-body font-display font-semibold text-text-primary">{selectedWorkflow?.name || "Workflow Pipeline"}</h2>
                  {selectedWorkflow && <p className="text-[11px] text-text-muted">Nodes light up as customer events trigger the workflow</p>}
                </div>
              </div>
              {selectedWorkflow && (
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedWorkflow.status === "ACTIVE" ? "bg-brand-green animate-pulse" : "bg-text-muted"}`} />
                  <span className={`text-small font-medium ${selectedWorkflow.status === "ACTIVE" ? "text-brand-green" : "text-text-muted"}`}>{selectedWorkflow.status}</span>
                </div>
              )}
            </div>
            {selectedWorkflow ? (
              <WorkflowPipeline workflow={selectedWorkflow} activity={workflowActivity} />
            ) : (
              <div className="flex items-center justify-center py-10 text-text-muted">
                <div className="text-center space-y-2">
                  <FlaskConical size={36} className="mx-auto opacity-30" />
                  <p className="text-body font-medium">Select a workflow above</p>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM: Event Stream */}
          <div className="flex-1 bg-white/60 backdrop-blur-xl border border-white/60 rounded-xl shadow-card overflow-hidden flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between shrink-0 bg-surface-card/50">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-coral/10 flex items-center justify-center"><Radio size={14} className="text-brand-coral" /></div>
                <h2 className="text-body font-display font-semibold text-text-primary">Event Stream</h2>
                <span className="text-[11px] text-text-muted bg-surface-panel px-2 py-0.5 rounded-full">{events.length}</span>
              </div>
              <div className="flex items-center gap-3">
                {isRunning && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-coral animate-ping" />
                    <span className="text-small font-medium text-brand-coral">Live</span>
                  </div>
                )}
                <button onClick={fetchEvents} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-panel rounded-lg transition-all" title="Refresh">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-3 text-text-muted"><RefreshCw size={18} className="animate-spin" /><span>Loading…</span></div>
                </div>
              ) : events.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3 text-text-muted">
                    <Package size={36} className="mx-auto opacity-30" />
                    <p className="text-body font-medium">No events yet</p>
                    <p className="text-small">Click <strong>Start Live</strong> to begin generating customer activity.</p>
                  </div>
                </div>
              ) : (
                events.map((event) => {
                  const display = getEventDisplay(event);
                  return (
                    <div key={`${event.type}-${event.id}`} className={`flex items-start gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500 ${display.bg} ${event._isNew ? "ring-2 ring-brand-blue/30 animate-slide-in" : "opacity-90"}`}>
                      <div className="w-7 h-7 rounded-lg bg-white/80 border border-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        {display.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-small font-semibold text-text-primary truncate">{display.title}</p>
                          {event.type === "COMMUNICATION" && event.details?.status && (
                            <StatusBadge variant={event.details.status.toLowerCase() as any}>{event.details.status}</StatusBadge>
                          )}
                        </div>
                        <p className="text-[12px] text-text-secondary mt-0.5 truncate">{display.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0 mt-1" suppressHydrationWarning>
                        <Clock size={11} />
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showSelector && <div className="fixed inset-0 z-40" onClick={() => setShowSelector(false)} />}
    </AppShell>
  );
}
