"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import { Send, CheckCircle2, MailOpen, MousePointerClick, XCircle, BookOpen, RefreshCw } from "lucide-react";

export default function WorkflowLiveTracker({ initialWorkflow }: { initialWorkflow: any }) {
  const router = useRouter();
  const [comms, setComms] = useState<any[]>(initialWorkflow.communications || []);

  // Sync state if server props change (e.g., after router.refresh)
  useEffect(() => {
    setComms(initialWorkflow.communications || []);
  }, [initialWorkflow.communications]);

  // Invalidate client router cache on mount so we get fresh DB state when revisiting
  useEffect(() => {
    router.refresh();
  }, [router]);
  
  useEffect(() => {
    // Connect to channel stub
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl);

    socket.on('delivery_event', (event) => {
      // The event uses campaign_id as a catch-all for both campaigns and workflows
      if (event.campaign_id !== `workflow_${initialWorkflow.id}`) return;
      
      setComms(prev => prev.map(c => {
        if (c.id === event.communication_id) {
          return {
            ...c,
            status: event.event_type,
            updated_at: event.timestamp
          };
        }
        return c;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [initialWorkflow.id]);

  const sent = comms.filter(c => c.status !== 'PENDING').length;
  const delivered = comms.filter(c => ['DELIVERED', 'OPENED', 'READ', 'CLICKED'].includes(c.status)).length;
  const failed = comms.filter(c => c.status === 'FAILED').length;
  const opened = comms.filter(c => ['OPENED', 'READ', 'CLICKED'].includes(c.status)).length;
  const read = comms.filter(c => ['READ', 'CLICKED'].includes(c.status)).length;
  const clicked = comms.filter(c => c.status === 'CLICKED').length;

  const pct = (n: number, d: number) => d > 0 ? `${Math.round((n / d) * 100)}%` : '0%';

  return (
    <div className="space-y-8 animate-fade-in mt-8">
      {/* Performance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Sent" value={sent} icon={Send} />
        <StatCard label="Delivered" value={`${delivered}`} icon={CheckCircle2} />
        <StatCard label="Failed" value={failed} icon={XCircle} />
        <StatCard label="Opened" value={`${opened}`} icon={MailOpen} />
        <StatCard label="Read" value={`${read}`} icon={BookOpen} />
        <StatCard label="Clicked" value={`${clicked}`} icon={MousePointerClick} />
      </div>

      {/* Funnel Rates */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card p-6">
        <h3 className="text-h2 font-display font-semibold mb-4">Funnel Analysis</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-small text-text-muted uppercase tracking-wide mb-1">Delivery Rate</p>
            <p className="text-display font-display font-bold text-brand-green">{pct(delivered, sent)}</p>
            <p className="text-small text-text-muted">{delivered} of {sent} sent</p>
          </div>
          <div>
            <p className="text-small text-text-muted uppercase tracking-wide mb-1">Open Rate</p>
            <p className="text-display font-display font-bold text-brand-blue">{pct(opened, delivered)}</p>
            <p className="text-small text-text-muted">{opened} of {delivered} delivered</p>
          </div>
          <div>
            <p className="text-small text-text-muted uppercase tracking-wide mb-1">Read Rate</p>
            <p className="text-display font-display font-bold text-purple-500">{pct(read, opened)}</p>
            <p className="text-small text-text-muted">{read} of {opened} opened</p>
          </div>
          <div>
            <p className="text-small text-text-muted uppercase tracking-wide mb-1">Click Rate</p>
            <p className="text-display font-display font-bold text-brand-coral">{pct(clicked, opened)}</p>
            <p className="text-small text-text-muted">{clicked} of {opened} opened</p>
          </div>
        </div>
      </div>

      {/* Recipient Log */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-h2 font-display font-semibold">Live Trigger Log</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-ping-dot" />
            <span className="text-small font-medium text-brand-green">Live Updates</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-panel/50">
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Customer Name</th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Email</th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Last Update</th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {comms.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-panel/30 transition-colors">
                  <td className="px-6 py-4 text-body font-medium">{c.customer.name}</td>
                  <td className="px-6 py-4 text-body text-text-secondary">{c.customer.email}</td>
                  <td className="px-6 py-4 text-small text-text-muted" suppressHydrationWarning>
                    {c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={c.status.toLowerCase() as any}>{c.status}</StatusBadge>
                  </td>
                </tr>
              ))}
              {comms.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">No messages triggered by this workflow yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
