const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workflows = await prisma.workflow.findMany();
  for (const w of workflows) {
    if (w.nodes_json && w.nodes_json.nodes) {
      let changed = false;
      w.nodes_json.nodes = w.nodes_json.nodes.map((node, index) => {
        if (!node.position) {
          node.position = { x: 100, y: 100 + (index * 150) };
          changed = true;
        }
        return node;
      });
      if (changed) {
        await prisma.workflow.update({
          where: { id: w.id },
          data: { nodes_json: w.nodes_json }
        });
        console.log("Fixed nodes for workflow:", w.id);
      }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
