import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const data = await req.json().catch(() => ({}));
    const TOTAL_CUSTOMERS = data.count ? parseInt(data.count) : 1000;
    const firstNames = ["Aarav", "Meera", "Rahul", "Sneha", "Vikram", "Anjali", "Rohan", "Priya", "Karan", "Neha", "Arjun", "Kavya", "Aditya", "Pooja", "Siddharth", "Riya", "Yash", "Ishita", "Kabir", "Nisha"];
    const lastNames = ["Sharma", "Verma", "Patel", "Singh", "Gupta", "Kumar", "Desai", "Rao", "Joshi", "Malhotra", "Kapoor", "Chawla", "Mehta", "Bhatia", "Reddy"];
    const domains = ["example.com", "gmail.com", "yahoo.com", "company.in"];
    const channels = ["EMAIL", "WHATSAPP", "SMS"];

    const products = [
      { name: "Summer Dress", min: 1000, max: 3000 },
      { name: "Evening Gown", min: 4000, max: 12000 },
      { name: "Basic T-Shirt", min: 400, max: 1200 },
      { name: "Running Shoes", min: 2500, max: 6000 },
      { name: "Smart Watch", min: 3000, max: 15000 },
    ];

    function randomItem(arr: any[]) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function randomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Clean first
    console.log("Wiping database before massive seed...");
    await prisma.commEvent.deleteMany({});
    await prisma.communication.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.segment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.customer.deleteMany({});

    const BATCH_SIZE = 10000; // Optimal batch size for Prisma bulk inserts
    
    console.log(`Starting generation of ${TOTAL_CUSTOMERS} customers in batches of ${BATCH_SIZE}...`);

    for (let batchStart = 0; batchStart < TOTAL_CUSTOMERS; batchStart += BATCH_SIZE) {
      const customersBatch = [];
      const ordersBatch = [];
      
      const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_CUSTOMERS - batchStart);

      for (let i = 0; i < currentBatchSize; i++) {
        const customerId = crypto.randomUUID(); // Pre-generate ID for relational mapping
        
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const name = `${firstName} ${lastName}`;
        // Add random uuid to email to guarantee uniqueness at 500k scale
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${crypto.randomUUID().split('-')[0]}@${randomItem(domains)}`;
        
        customersBatch.push({
          id: customerId,
          name,
          email,
          phone: `+9198${randomInt(10000000, 99999999)}`,
          channel_pref: randomItem(channels),
          lifecycle_stage: "NEW", // Will be recalculated by the engine later
          rfm_score: "LOW_VALUE", 
        });

        // 70% of customers have 1-4 orders, 30% have 0 orders
        const orderCount = Math.random() > 0.3 ? randomInt(1, 4) : 0;
        const daysSinceLastPurchase = randomInt(1, 200);

        let lastOrderDate = new Date();
        lastOrderDate.setDate(lastOrderDate.getDate() - daysSinceLastPurchase);

        for (let j = 0; j < orderCount; j++) {
          const product = randomItem(products);
          const orderDate = new Date(lastOrderDate);
          orderDate.setDate(orderDate.getDate() - (j * randomInt(10, 40)));

          ordersBatch.push({
            id: crypto.randomUUID(),
            customer_id: customerId,
            amount: randomInt(product.min, product.max),
            product_name: product.name,
            created_at: orderDate
          });
        }
      }

      // Insert the batch
      // Use createMany to safely insert arrays. skipDuplicates handles edge collisions.
      await prisma.customer.createMany({ data: customersBatch, skipDuplicates: true });
      if (ordersBatch.length > 0) {
        await prisma.order.createMany({ data: ordersBatch, skipDuplicates: true });
      }
      
      console.log(`Seeded batch ${batchStart / BATCH_SIZE + 1} / ${Math.ceil(TOTAL_CUSTOMERS / BATCH_SIZE)}`);
    }

    console.log("Massive seeding complete.");
    return NextResponse.json({ success: true, message: `Successfully seeded ${TOTAL_CUSTOMERS.toLocaleString()} mock customers.` });
  } catch (error: any) {
    console.error("Database Mass Seed Error:", error);
    return NextResponse.json({ error: "Failed to mass seed database" }, { status: 500 });
  }
}
