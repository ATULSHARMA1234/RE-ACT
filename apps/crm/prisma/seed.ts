import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create 3 demo customers
  const c1 = await prisma.customer.upsert({
    where: { email: 'meera.sharma@example.com' },
    update: {},
    create: {
      name: 'Meera Sharma',
      email: 'meera.sharma@example.com',
      phone: '+919876543210',
      channel_pref: 'WHATSAPP',
      lifecycle_stage: 'ACTIVE',
      rfm_score: 'HIGH_VALUE',
      orders: {
        create: [
          { amount: 1500, product_name: 'Summer Dress' },
          { amount: 2500, product_name: 'Evening Gown' },
        ],
      },
    },
  });

  const c2 = await prisma.customer.upsert({
    where: { email: 'rahul.verma@example.com' },
    update: {},
    create: {
      name: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      phone: '+919876543211',
      channel_pref: 'EMAIL',
      lifecycle_stage: 'AT_RISK',
      rfm_score: 'MID_TIER',
      orders: {
        create: [
          { amount: 800, product_name: 'Basic T-Shirt' },
        ],
      },
    },
  });

  const c3 = await prisma.customer.upsert({
    where: { email: 'sneha.patel@example.com' },
    update: {},
    create: {
      name: 'Sneha Patel',
      email: 'sneha.patel@example.com',
      phone: '+919876543212',
      channel_pref: 'SMS',
      lifecycle_stage: 'DORMANT',
      rfm_score: 'LOW_VALUE',
      orders: {
        create: [
          { amount: 500, product_name: 'Accessories' },
        ],
      },
    },
  });

  console.log('Seeded customers:', { c1: c1.name, c2: c2.name, c3: c3.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
