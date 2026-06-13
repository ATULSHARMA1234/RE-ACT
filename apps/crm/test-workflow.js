const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workflow = await prisma.workflow.create({
    data: {
      name: "Test Order Workflow",
      status: "ACTIVE",
      nodes_json: {
        nodes: [
          {
            id: "node_1",
            data: {
              originalType: "trigger",
              config: { condition: "Order placed" }
            }
          },
          {
            id: "node_2",
            data: {
              originalType: "delay",
              config: { time: "5 seconds" }
            }
          },
          {
            id: "node_3",
            data: {
              originalType: "message",
              config: { channel: "EMAIL", content: "Thanks for testing!" }
            }
          }
        ],
        edges: [
          { id: "e1-2", source: "node_1", target: "node_2" },
          { id: "e2-3", source: "node_2", target: "node_3" }
        ]
      }
    }
  });
  console.log("Created workflow:", workflow.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
