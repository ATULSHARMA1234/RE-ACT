import AppShell from "@/components/AppShell";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, MessageSquare, Megaphone, Bot } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        orderBy: { created_at: "desc" },
      },
      communications: {
        include: {
          campaign: true,
          workflow: true,
        },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  // Combine orders and communications into a single timeline array
  const timeline: Array<{
    id: string;
    type: "ORDER" | "CAMPAIGN_MSG" | "WORKFLOW_MSG";
    date: Date;
    title: string;
    description: string;
    status?: string;
    amount?: number;
    channel?: string | null;
  }> = [];

  customer.orders.forEach((order) => {
    timeline.push({
      id: order.id,
      type: "ORDER",
      date: order.created_at,
      title: "Order Placed",
      description: `Order #${order.id.slice(-6).toUpperCase()}`,
      amount: order.amount,
      status: "COMPLETED",
    });
  });

  customer.communications.forEach((comm) => {
    const isWorkflow = !!comm.workflow_id;
    timeline.push({
      id: comm.id,
      type: isWorkflow ? "WORKFLOW_MSG" : "CAMPAIGN_MSG",
      date: comm.created_at,
      title: isWorkflow ? "Workflow Message Triggered" : "Campaign Message Sent",
      description: isWorkflow 
        ? `Triggered by workflow: ${comm.workflow?.name || "Unknown Workflow"}`
        : `Sent via campaign: ${comm.campaign?.name || "Unknown Campaign"}`,
      status: comm.status,
      channel: comm.channel,
    });
  });

  // Sort timeline by date descending
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate total spend
  const total_spend = customer.orders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <AppShell>
      <div className="mb-8">
        <Link href="/customers" className="inline-flex items-center gap-2 text-small font-medium text-text-secondary hover:text-text-primary mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Customers
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-display font-display font-bold">{customer.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-small text-text-secondary">{customer.email}</span>
              <span className="text-small text-text-muted">•</span>
              {customer.phone && (
                <>
                  <span className="text-small text-text-secondary">{customer.phone}</span>
                  <span className="text-small text-text-muted">•</span>
                </>
              )}
              <span className="text-small text-text-secondary">Stage: <span className="font-medium text-text-primary">{customer.lifecycle_stage}</span></span>
            </div>
          </div>
          <div className="text-right bg-surface-panel p-4 rounded-lg border border-border">
            <p className="text-small text-text-muted uppercase tracking-wide">Lifetime Value</p>
            <p className="text-h2 font-display font-bold text-brand-green">
              ${total_spend.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-lg shadow-card p-8">
        <h3 className="text-h2 font-display font-semibold mb-8">Activity Timeline</h3>
        
        <div className="relative border-l-2 border-border ml-4 space-y-10">
          {timeline.length === 0 ? (
            <p className="text-text-muted ml-8 py-4">No activity recorded for this customer.</p>
          ) : (
            timeline.map((event) => {
              let Icon = MessageSquare;
              let iconBg = "bg-surface-card";
              let iconColor = "text-text-secondary";

              if (event.type === "ORDER") {
                Icon = ShoppingBag;
                iconBg = "bg-brand-blue/10";
                iconColor = "text-brand-blue";
              } else if (event.type === "CAMPAIGN_MSG") {
                Icon = Megaphone;
                iconBg = "bg-brand-coral/10";
                iconColor = "text-brand-coral";
              } else if (event.type === "WORKFLOW_MSG") {
                Icon = Bot;
                iconBg = "bg-purple-500/10";
                iconColor = "text-purple-500";
              }

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Timeline Node */}
                  <div className={`absolute -left-[1.35rem] top-0.5 w-10 h-10 rounded-full border-4 border-surface-card flex items-center justify-center ${iconBg}`}>
                    <Icon size={16} className={iconColor} />
                  </div>

                  <div className="bg-surface-panel border border-border rounded-lg p-5 hover:border-brand-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-body font-semibold flex items-center gap-2">
                          {event.title}
                          {event.channel && (
                            <span className="text-xs px-2 py-0.5 bg-surface-card border border-border rounded-md text-text-secondary font-medium">
                              {event.channel}
                            </span>
                          )}
                        </h4>
                        <p className="text-small text-text-secondary mt-1">{event.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-small text-text-muted mb-2">
                          {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString()}
                        </p>
                        {event.type === "ORDER" && event.amount && (
                          <p className="font-semibold text-brand-green">+${event.amount.toLocaleString()}</p>
                        )}
                        {event.status && event.type !== "ORDER" && (
                          <StatusBadge variant={event.status.toLowerCase() as any}>
                            {event.status}
                          </StatusBadge>
                        )}
                        {event.status && event.type === "ORDER" && (
                          <StatusBadge variant={event.status === "COMPLETED" ? "delivered" : "pending"}>
                            {event.status}
                          </StatusBadge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
