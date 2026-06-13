import prisma from "@/lib/prisma";

interface FlowNode {
  id: string;
  data: {
    originalType: string;
    config: Record<string, any>;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

interface WorkflowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * Called when a new order is placed.
 * Finds all ACTIVE workflows with an ORDER_PLACED trigger and schedules their actions.
 */
export async function evaluateOrderTriggers(customerId: string, orderId: string) {
  // Find all ACTIVE workflows
  const workflows = await prisma.workflow.findMany({
    where: { status: "ACTIVE" },
  });

  for (const workflow of workflows) {
    try {
      const graph = workflow.nodes_json as unknown as WorkflowGraph;
      if (!graph?.nodes || !graph?.edges) continue;

      // Find trigger nodes that match ORDER_PLACED
      const triggerNode = graph.nodes.find(
        (n) =>
          n.data?.originalType === "trigger" &&
          (n.data.config?.condition?.toLowerCase().includes("order") ||
           n.data.config?.condition?.toLowerCase().includes("purchase") ||
           n.data.config?.condition?.toLowerCase().includes("cart"))
      );

      if (!triggerNode) continue;

      console.log(`[Workflow Engine] Workflow "${workflow.name}" triggered by order ${orderId}`);

      // Walk the graph from the trigger node
      await walkGraph(workflow.id, customerId, triggerNode.id, graph, 0);
    } catch (err) {
      console.error(`[Workflow Engine] Error processing workflow ${workflow.id}:`, err);
    }
  }
}

/**
 * Recursively walks the workflow graph from a given node,
 * accumulating delay time and scheduling message actions.
 */
async function walkGraph(
  workflowId: string,
  customerId: string,
  currentNodeId: string,
  graph: WorkflowGraph,
  accumulatedDelayMs: number
) {
  // Find edges leaving this node
  const outEdges = graph.edges.filter((e) => e.source === currentNodeId);

  for (const edge of outEdges) {
    const targetNode = graph.nodes.find((n) => n.id === edge.target);
    if (!targetNode) continue;

    const nodeType = targetNode.data?.originalType;
    const config = targetNode.data?.config || {};

    if (nodeType === "delay") {
      // Parse delay time and add to accumulator
      const delayMs = parseDelayToMs(config.time || "1 hour");
      await walkGraph(workflowId, customerId, targetNode.id, graph, accumulatedDelayMs + delayMs);
    } else if (nodeType === "message") {
      // Schedule this message as a job
      const executeAt = new Date(Date.now() + accumulatedDelayMs);
      const channel = (config.channel || "EMAIL").toUpperCase();
      const message = config.content || "Hello {{first_name}}, thank you for your order!";

      // Personalize the message
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { name: true, email: true },
      });
      const firstName = customer?.name?.split(" ")[0] || "there";
      const personalizedMessage = message
        .replace(/\{\{first_name\}\}/gi, firstName)
        .replace(/\{\{name\}\}/gi, customer?.name || "Customer");

      await prisma.workflowJob.create({
        data: {
          workflow_id: workflowId,
          customer_id: customerId,
          channel,
          message: personalizedMessage,
          execute_at: executeAt,
          status: "PENDING",
        },
      });

      console.log(
        `[Workflow Engine] Scheduled ${channel} job for customer ${customerId} at ${executeAt.toISOString()} (delay: ${accumulatedDelayMs}ms)`
      );

      // Continue walking past the message node (there might be more actions)
      await walkGraph(workflowId, customerId, targetNode.id, graph, accumulatedDelayMs);
    } else if (nodeType === "split") {
      // For splits, walk both branches
      await walkGraph(workflowId, customerId, targetNode.id, graph, accumulatedDelayMs);
    } else if (nodeType === "action") {
      // Tag/update actions — just walk past for now
      await walkGraph(workflowId, customerId, targetNode.id, graph, accumulatedDelayMs);
    }
  }
}

/**
 * Parse human-readable delay strings like "2 Hours", "1 Day", "30 Minutes" into milliseconds.
 */
function parseDelayToMs(timeStr: string): number {
  const lower = timeStr.toLowerCase().trim();
  const numMatch = lower.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 1;

  if (lower.includes("second")) return num * 1000;
  if (lower.includes("minute") || lower.includes("min")) return num * 60 * 1000;
  if (lower.includes("hour") || lower.includes("hr")) return num * 60 * 60 * 1000;
  if (lower.includes("day")) return num * 24 * 60 * 60 * 1000;
  if (lower.includes("week")) return num * 7 * 24 * 60 * 60 * 1000;

  // Default: 1 hour
  return 60 * 60 * 1000;
}
