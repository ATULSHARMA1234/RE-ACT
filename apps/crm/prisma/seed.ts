import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const firstNames = ["Aarav", "Meera", "Rahul", "Sneha", "Vikram", "Anjali", "Rohan", "Priya", "Karan", "Neha", "Arjun", "Kavya", "Aditya", "Pooja", "Siddharth", "Riya", "Yash", "Ishita", "Kabir", "Nisha", "Dev", "Tara", "Samar", "Maya", "Dhruv", "Zara", "Armaan", "Kiara", "Vivaan", "Sia"];
const lastNames = ["Sharma", "Verma", "Patel", "Singh", "Gupta", "Kumar", "Desai", "Rao", "Joshi", "Malhotra", "Kapoor", "Chawla", "Mehta", "Bhatia", "Reddy", "Iyer", "Nair", "Das", "Bose", "Banerjee", "Sinha", "Mishra", "Tiwari", "Choudhary", "Pandey"];

const domains = ["example.com", "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "company.in"];
const channels = ["EMAIL", "WHATSAPP", "SMS"];
const stages = ["NEW", "ACTIVE", "AT_RISK", "DORMANT"];
const rfmScores = ["HIGH_VALUE", "MID_TIER", "LOW_VALUE"];

const products = [
  { name: "Summer Dress", min: 1000, max: 3000 },
  { name: "Evening Gown", min: 4000, max: 12000 },
  { name: "Basic T-Shirt", min: 400, max: 1200 },
  { name: "Accessories", min: 200, max: 800 },
  { name: "Running Shoes", min: 2500, max: 6000 },
  { name: "Denim Jacket", min: 1500, max: 4000 },
  { name: "Formal Shirt", min: 1200, max: 3500 },
  { name: "Wireless Earbuds", min: 1800, max: 5000 },
  { name: "Smart Watch", min: 3000, max: 15000 },
  { name: "Leather Wallet", min: 800, max: 2500 }
];

function randomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('Clearing existing data...');
  await prisma.commEvent.deleteMany({});
  await prisma.communication.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log('Seeding 150 realistic customers...');

  const customers = [];

  for (let i = 0; i < 150; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@${randomItem(domains)}`;
    
    // Determine realistic correlation between stage, rfm and orders
    const isDormant = Math.random() > 0.7; // 30% dormant
    const isNew = !isDormant && Math.random() > 0.8; // 20% of remaining are new
    
    let stage = randomItem(stages);
    let rfm = randomItem(rfmScores);
    let orderCount = randomInt(1, 8);
    let daysSinceLastPurchase = randomInt(1, 120);

    if (isDormant) {
      stage = 'DORMANT';
      rfm = Math.random() > 0.5 ? 'LOW_VALUE' : 'MID_TIER';
      daysSinceLastPurchase = randomInt(90, 365);
      orderCount = randomInt(1, 3);
    } else if (isNew) {
      stage = 'NEW';
      rfm = 'LOW_VALUE';
      daysSinceLastPurchase = randomInt(1, 14);
      orderCount = 1;
    } else {
      stage = Math.random() > 0.3 ? 'ACTIVE' : 'AT_RISK';
      rfm = orderCount > 4 ? 'HIGH_VALUE' : 'MID_TIER';
      if (stage === 'AT_RISK') daysSinceLastPurchase = randomInt(45, 90);
      else daysSinceLastPurchase = randomInt(5, 45);
    }

    const customerOrders = [];
    let lastOrderDate = new Date();
    lastOrderDate.setDate(lastOrderDate.getDate() - daysSinceLastPurchase);

    for (let j = 0; j < orderCount; j++) {
      const product = randomItem(products);
      // Older orders go further back in time
      const orderDate = new Date(lastOrderDate);
      orderDate.setDate(orderDate.getDate() - (j * randomInt(10, 40)));

      customerOrders.push({
        amount: randomInt(product.min, product.max),
        product_name: product.name,
        created_at: orderDate
      });
    }

    const c = await prisma.customer.create({
      data: {
        name,
        email,
        phone: `+9198${randomInt(10000000, 99999999)}`,
        channel_pref: randomItem(channels),
        lifecycle_stage: stage,
        rfm_score: rfm,
        orders: {
          create: customerOrders
        }
      }
    });

    customers.push(c);
  }

  console.log(`Successfully seeded ${customers.length} customers with orders!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
