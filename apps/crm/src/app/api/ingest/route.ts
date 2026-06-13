import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { evaluateOrderTriggers } from "@/lib/workflow-engine";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Support both single customer object or an array of customers
    const customers = Array.isArray(payload) ? payload : [payload];

    if (customers.length === 0) {
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    const results = [];

    for (const data of customers) {
      if (!data.email) {
        continue; // Skip invalid records missing an email
      }

      // 1. Create or update the Customer
      const customer = await prisma.customer.upsert({
        where: { email: data.email },
        update: {
          name: data.name || undefined,
          phone: data.phone || undefined,
          channel_pref: data.channel_pref || undefined,
          lifecycle_stage: data.lifecycle_stage || undefined,
          rfm_score: data.rfm_score || undefined,
        },
        create: {
          name: data.name || "Unknown",
          email: data.email,
          phone: data.phone || null,
          channel_pref: data.channel_pref || "EMAIL",
          lifecycle_stage: data.lifecycle_stage || "NEW",
          rfm_score: data.rfm_score || "LOW_VALUE",
        },
      });

      // 2. Attach any included orders
      let ordersAdded = 0;
      if (Array.isArray(data.orders)) {
        for (const orderData of data.orders) {
          if (orderData.amount && orderData.product_name) {
            const order = await prisma.order.create({
              data: {
                customer_id: customer.id,
                amount: parseFloat(orderData.amount),
                product_name: orderData.product_name,
                created_at: orderData.created_at ? new Date(orderData.created_at) : new Date(),
              },
            });
            ordersAdded++;
            
            // 3. Trigger workflows asynchronously
            evaluateOrderTriggers(customer.id, order.id).catch(err => {
              console.error("[Ingest] Workflow trigger error:", err);
            });
          }
        }
      }

      results.push({
        customer_id: customer.id,
        email: customer.email,
        orders_added: ordersAdded,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${results.length} customers.`,
      results,
    });
  } catch (error: any) {
    console.error("JSON Ingestion Error:", error);
    return NextResponse.json(
      { error: "Failed to process JSON ingestion", details: error.message },
      { status: 500 }
    );
  }
}
