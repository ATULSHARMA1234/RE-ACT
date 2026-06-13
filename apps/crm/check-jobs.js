const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.workflowJob.findMany();
  console.log("Jobs in DB:", jobs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
