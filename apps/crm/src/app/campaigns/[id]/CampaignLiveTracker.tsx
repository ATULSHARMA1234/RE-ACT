"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import { Send, CheckCircle2, MailOpen, MousePointerClick } from "lucide-react";

export default function CampaignLiveTracker({ initialCampaign }: { initialCampaign: any }) {
  const [comms, setComms] = useState<any[]>(initialCampaign.communications);
  
  useEffect(() => {
    // Connect to channel stub
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl);

    socket.on('delivery_event', (event) => {
      if (event.campaign_id !== initialCampaign.id) return;
      
      setComms(prev => prev.map(c => {
        if (c.id === event.communication_id) {
          return {
            ...c,
            status: event.event_type,
            // Assuming the event is recent, we could update the specific timestamp here
            updated_at: event.timestamp
          };
        }
        return c;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [initialCampaign.id]);

  const total = comms.length;
  const delivered = comms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED'].includes(c.status)).length;
  const opened = comms.filter(c => ['OPENED', 'CLICKED'].includes(c.status)).length;
  const clicked = comms.filter(c => c.status === 'CLICKED').length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Sent" value={total} icon={Send} />
        <StatCard label="Delivered" value={delivered} icon={CheckCircle2} />
        <StatCard label="Opened" value={opened} icon={MailOpen} />
        <StatCard label="Clicked" value={clicked} icon={MousePointerClick} />
      </div>

      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-h2 font-display font-semibold">Recipient Log</h3>
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
                  <td className="px-6 py-4 text-body text-text-secondary">
                    {c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={c.status.toLowerCase() as any}>{c.status}</StatusBadge>
                  </td>
                </tr>
              ))}
              {comms.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">No recipients found for this campaign.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
