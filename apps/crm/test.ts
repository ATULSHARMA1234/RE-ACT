import { config } from 'dotenv';
config({ path: '/Users/atul/Desktop/RE-ACT/apps/crm/.env' });
import prisma from './src/lib/prisma';
async function main() {
  const workflows = await prisma.workflow.findMany();
  console.log(JSON.stringify(workflows, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
