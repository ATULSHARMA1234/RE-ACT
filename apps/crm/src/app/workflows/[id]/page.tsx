import AppShell from "@/components/AppShell";
import WorkflowEditorClient from "./WorkflowEditorClient";
import WorkflowLiveTracker from "./WorkflowLiveTracker";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkflowEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: params.id },
    include: {
      communications: {
        include: {
          customer: { select: { name: true, email: true } },
        },
        orderBy: { updated_at: "desc" },
      },
    },
  });

  if (!workflow) {
    notFound();
  }

  // Fetch segments to populate the Segment dropdown in Message nodes
  const segments = await prisma.segment.findMany({
    select: { id: true, name: true },
    orderBy: { created_at: "desc" },
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-8 pb-12">
        <WorkflowEditorClient
          initialWorkflow={{
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            nodes_json: workflow.nodes_json as any,
          }}
          segments={segments}
        />
        
        <div className="px-8 mt-4">
          <WorkflowLiveTracker initialWorkflow={workflow} />
        </div>
      </div>
    </AppShell>
  );
}
