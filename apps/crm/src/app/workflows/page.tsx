import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { updated_at: "desc" },
  });

  async function createWorkflow(formData: FormData) {
    "use server";
    const name = formData.get("name") as string || "New Automation";
    const wf = await prisma.workflow.create({
      data: {
        name,
        nodes_json: { nodes: [], edges: [] },
      },
    });
    redirect(`/workflows/${wf.id}`);
  }

  async function deleteWorkflow(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) {
      await prisma.workflow.delete({ where: { id } });
      revalidatePath("/workflows");
    }
  }

  async function toggleWorkflowStatus(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentStatus = formData.get("currentStatus") as string;
    if (id) {
      await prisma.workflow.update({
        where: { id },
        data: { status: currentStatus === "ACTIVE" ? "DRAFT" : "ACTIVE" },
      });
      revalidatePath("/workflows");
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display font-display font-bold text-text-primary tracking-tight">
            Workflows
          </h1>
          <p className="text-body text-text-secondary mt-1">
            Build and manage automated drip campaigns and triggers.
          </p>
        </div>
        <div className="flex gap-3">
          <form action={createWorkflow} className="flex gap-2">
            <input 
              type="text" 
              name="name" 
              placeholder="e.g. Welcome Series"
              required
              className="px-3 py-2 border border-border rounded-lg text-small focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
            <Button type="submit" className="flex items-center gap-2 whitespace-nowrap">
              <Plus size={16} /> Create Workflow
            </Button>
          </form>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-xl shadow-card overflow-hidden">
        {workflows.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <Settings2
              size={48}
              strokeWidth={1}
              className="mx-auto mb-4 text-text-muted"
            />
            <p className="text-body font-medium">No workflows found</p>
            <p className="text-small mt-1">
              Create your first automation to start reaching customers.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-panel/30">
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-4 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-4 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-4 uppercase tracking-wide">
                  Steps
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-4 uppercase tracking-wide">
                  Last Updated
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => {
                const nodes = wf.nodes_json && !Array.isArray(wf.nodes_json) ? (wf.nodes_json as any).nodes || [] : [];
                return (
                  <tr
                    key={wf.id}
                    className="border-b border-border last:border-0 hover:bg-surface-panel/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/workflows/${wf.id}`} className="font-semibold text-body text-brand-blue hover:underline">
                        {wf.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <form action={toggleWorkflowStatus}>
                        <input type="hidden" name="id" value={wf.id} />
                        <input type="hidden" name="currentStatus" value={wf.status} />
                        <button type="submit" className="hover:opacity-80 transition-opacity" title="Click to toggle status">
                          <StatusBadge
                            variant={wf.status === "ACTIVE" ? "success" : "draft"}
                          >
                            {wf.status === "ACTIVE" ? "ACTIVE" : "PAUSED"}
                          </StatusBadge>
                        </button>
                      </form>
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {nodes.length} Nodes
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {new Date(wf.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <form action={deleteWorkflow}>
                          <input type="hidden" name="id" value={wf.id} />
                          <button
                            type="submit"
                            className="p-2 text-text-muted hover:text-status-danger hover:bg-status-danger-bg rounded-md transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
