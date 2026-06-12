import { config } from 'dotenv';
config();

import prisma from './src/lib/prisma';

async function main() {
  const workflows = await prisma.workflow.findMany();
  console.log(JSON.stringify(workflows, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
