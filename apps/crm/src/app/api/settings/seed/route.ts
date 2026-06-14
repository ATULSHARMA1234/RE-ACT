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
    const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"];
    const states = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "CA"];

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

    // Ensure Settings singleton exists (needed for recalculation)
    await prisma.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: {
        id: "singleton",
        high_value_min_spend: 10000.0,
        high_value_min_orders: 5,
        mid_tier_min_spend: 3000.0,
        mid_tier_min_orders: 2,
        at_risk_days: 60,
        dormant_days: 120,
      },
    });

    const settings = (await prisma.settings.findUnique({ where: { id: "singleton" } }))!;

    // Clean first
    console.log("Wiping database before massive seed...");
    await prisma.commEvent.deleteMany({});
    await prisma.communication.deleteMany({});
    await prisma.workflowJob.deleteMany({});
    await prisma.customerEvent.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.segment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.workflow.deleteMany({});
    await prisma.customer.deleteMany({});

    const BATCH_SIZE = 10000; // Optimal batch size for Prisma bulk inserts
    
    console.log(`Starting generation of ${TOTAL_CUSTOMERS} customers in batches of ${BATCH_SIZE}...`);

    for (let batchStart = 0; batchStart < TOTAL_CUSTOMERS; batchStart += BATCH_SIZE) {
      const customersBatch = [];
      const ordersBatch: any[] = [];
      
      const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_CUSTOMERS - batchStart);

      // Create dummy campaigns ONLY in the first batch to avoid creating them multiple times
      let mockCampaigns: { id: string, channel: string }[] = [];
      if (batchStart === 0) {
        const segmentId = crypto.randomUUID();
        await prisma.segment.create({
          data: {
            id: segmentId,
            name: "All Customers (Demo)",
            filter_json: { type: "ALL" },
            is_dynamic: true
          }
        });

        const campaignChannels = ["EMAIL", "SMS", "WHATSAPP"];
        for (const channel of campaignChannels) {
          const cid = crypto.randomUUID();
          await prisma.campaign.create({
            data: {
              id: cid,
              name: `Summer Promo - ${channel}`,
              segment_id: segmentId,
              channel: channel,
              message_template: "Hey there! Get 20% off our new summer collection.",
              status: "SENT",
              sent_at: new Date(Date.now() - randomInt(1, 14) * 24 * 60 * 60 * 1000)
            }
          });
          mockCampaigns.push({ id: cid, channel });
        }
      } else {
        // Fetch existing campaigns for subsequent batches
        const existingCampaigns = await prisma.campaign.findMany({ select: { id: true, channel: true } });
        mockCampaigns = existingCampaigns.map(c => ({ id: c.id, channel: c.channel }));
      }

      // Track per-customer order data for RFM/lifecycle calculation
      const customerOrderMeta: Map<string, { totalSpend: number; totalOrders: number; daysSinceLast: number | null }> = new Map();

      for (let i = 0; i < currentBatchSize; i++) {
        const customerId = crypto.randomUUID(); // Pre-generate ID for relational mapping
        
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);
        const name = `${firstName} ${lastName}`;
        // Add random uuid to email to guarantee uniqueness at 500k scale
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${crypto.randomUUID().split('-')[0]}@${randomItem(domains)}`;
        
        const cityIndex = randomInt(0, cities.length - 1);
        const city = cities[cityIndex];
        const state = states[cityIndex];

        // 70% of customers have 1-4 orders, 30% have 0 orders
        const orderCount = Math.random() > 0.3 ? randomInt(1, 4) : 0;
        const daysSinceLastPurchase = randomInt(1, 200);

        let totalSpend = 0;
        let lastOrderDate = new Date();
        lastOrderDate.setDate(lastOrderDate.getDate() - daysSinceLastPurchase);

        for (let j = 0; j < orderCount; j++) {
          const product = randomItem(products);
          const orderDate = new Date(lastOrderDate);
          orderDate.setDate(orderDate.getDate() - (j * randomInt(10, 40)));
          const amount = randomInt(product.min, product.max);
          totalSpend += amount;

          // Randomly attribute ~25% of orders to one of the dummy campaigns
          const isAttributed = Math.random() > 0.75;
          const attributedCampaign = isAttributed && mockCampaigns.length > 0 ? randomItem(mockCampaigns) : null;

          ordersBatch.push({
            id: crypto.randomUUID(),
            customer_id: customerId,
            amount,
            product_name: product.name,
            created_at: orderDate,
            attributed_campaign_id: attributedCampaign ? attributedCampaign.id : null
          });
        }

        // Calculate RFM score inline
        let rfmScore = "LOW_VALUE";
        if (totalSpend >= settings.high_value_min_spend || orderCount >= settings.high_value_min_orders) {
          rfmScore = "HIGH_VALUE";
        } else if (totalSpend >= settings.mid_tier_min_spend || orderCount >= settings.mid_tier_min_orders) {
          rfmScore = "MID_TIER";
        }

        // Calculate lifecycle stage inline
        let lifecycleStage = "NEW";
        if (orderCount === 0) {
          lifecycleStage = "NEW";
        } else if (daysSinceLastPurchase >= settings.dormant_days) {
          lifecycleStage = "DORMANT";
        } else if (daysSinceLastPurchase >= settings.at_risk_days) {
          lifecycleStage = "AT_RISK";
        } else if (orderCount <= 1 && daysSinceLastPurchase < 14) {
          lifecycleStage = "NEW";
        } else {
          lifecycleStage = "ACTIVE";
        }

        customersBatch.push({
          id: customerId,
          name,
          email,
          phone: `+1${randomInt(200, 999)}${randomInt(1000000, 9999999)}`,
          city,
          state,
          channel_pref: randomItem(channels),
          lifecycle_stage: lifecycleStage,
          rfm_score: rfmScore,
        });
      }

      // Insert the batch
      // Use createMany to safely insert arrays. skipDuplicates handles edge collisions.
      await prisma.customer.createMany({ data: customersBatch, skipDuplicates: true });
      if (ordersBatch.length > 0) {
        await prisma.order.createMany({ data: ordersBatch, skipDuplicates: true });
      }
      
      console.log(`Seeded batch ${batchStart / BATCH_SIZE + 1} / ${Math.ceil(TOTAL_CUSTOMERS / BATCH_SIZE)}`);
    }

    // Count the distribution for the response
    const [highCount, midCount, lowCount, newCount, activeCount, atRiskCount, dormantCount] = await Promise.all([
      prisma.customer.count({ where: { rfm_score: "HIGH_VALUE" } }),
      prisma.customer.count({ where: { rfm_score: "MID_TIER" } }),
      prisma.customer.count({ where: { rfm_score: "LOW_VALUE" } }),
      prisma.customer.count({ where: { lifecycle_stage: "NEW" } }),
      prisma.customer.count({ where: { lifecycle_stage: "ACTIVE" } }),
      prisma.customer.count({ where: { lifecycle_stage: "AT_RISK" } }),
      prisma.customer.count({ where: { lifecycle_stage: "DORMANT" } }),
    ]);

    console.log("Massive seeding complete.");
    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${TOTAL_CUSTOMERS.toLocaleString()} customers.`,
      distribution: {
        rfm: { HIGH_VALUE: highCount, MID_TIER: midCount, LOW_VALUE: lowCount },
        lifecycle: { NEW: newCount, ACTIVE: activeCount, AT_RISK: atRiskCount, DORMANT: dormantCount },
      }
    });
  } catch (error: any) {
    console.error("Database Mass Seed Error details:", error.message, error.stack);
    return NextResponse.json({ error: "Failed to mass seed database", details: error.message }, { status: 500 });
  }
}
