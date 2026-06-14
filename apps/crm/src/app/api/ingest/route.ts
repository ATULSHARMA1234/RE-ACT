import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { evaluateOrderTriggers } from "@/lib/workflow-engine";
import { z } from "zod";

// Industry-standard API Key validation (Default for assignment demo)
const EXPECTED_API_KEY = process.env.INGEST_API_KEY || "REACH_SECRET_KEY_123";

// Zod Schema for strict payload validation
const OrderSchema = z.object({
  amount: z.number().positive(),
  product_name: z.string().min(1),
  created_at: z.string().datetime().optional()
});

const CustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional().nullable(),
  channel_pref: z.enum(["EMAIL", "WHATSAPP", "SMS"]).optional(),
  lifecycle_stage: z.enum(["NEW", "ACTIVE", "AT_RISK", "DORMANT"]).optional(),
  rfm_score: z.enum(["HIGH_VALUE", "MID_TIER", "LOW_VALUE"]).optional(),
  orders: z.array(OrderSchema).optional()
});

const PayloadSchema = z.union([
  CustomerSchema,
  z.array(CustomerSchema)
]);

export async function POST(req: Request) {
  try {
    // 1. Authentication
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== EXPECTED_API_KEY) {
      return NextResponse.json({ error: "Unauthorized: Invalid x-api-key header" }, { status: 401 });
    }

    const rawPayload = await req.json();

    // 2. Schema Validation
    const validationResult = PayloadSchema.safeParse(rawPayload);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Bad Request: Schema Validation Failed", 
        issues: validationResult.error.issues 
      }, { status: 400 });
    }

    const customers = Array.isArray(validationResult.data) 
      ? validationResult.data 
      : [validationResult.data];

    if (customers.length === 0) {
      return NextResponse.json({ error: "Empty payload array" }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // 3. Batch Processing with Partial Failure Support
    for (const data of customers) {
      try {
        // Idempotent Upsert for the Customer
        const customer = await prisma.customer.upsert({
          where: { email: data.email },
          update: {
            name: data.name,
            phone: data.phone,
            channel_pref: data.channel_pref,
            lifecycle_stage: data.lifecycle_stage,
            rfm_score: data.rfm_score,
          },
          create: {
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            channel_pref: data.channel_pref || "EMAIL",
            lifecycle_stage: data.lifecycle_stage || "NEW",
            rfm_score: data.rfm_score || "LOW_VALUE",
          },
        });

        // Insert nested orders
        let ordersAdded = 0;
        if (data.orders && data.orders.length > 0) {
          for (const orderData of data.orders) {
            const order = await prisma.order.create({
              data: {
                customer_id: customer.id,
                amount: orderData.amount,
                product_name: orderData.product_name,
                created_at: orderData.created_at ? new Date(orderData.created_at) : new Date(),
              },
            });
            ordersAdded++;
            
            // Asynchronously evaluate real-time workflow triggers
            evaluateOrderTriggers(customer.id, order.id).catch(err => {
              console.error("[Ingest] Workflow trigger error:", err);
            });
          }
        }

        results.push({
          customer_id: customer.id,
          email: customer.email,
          orders_added: ordersAdded,
          status: "SUCCESS"
        });

      } catch (dbError: any) {
        console.error(`Database error for email ${data.email}:`, dbError);
        errors.push({
          email: data.email,
          error: dbError.message || "Database insert failed"
        });
      }
    }

    // 4. Return appropriate status codes
    if (errors.length > 0 && results.length === 0) {
      // Complete failure
      return NextResponse.json({ success: false, errors }, { status: 500 });
    } else if (errors.length > 0) {
      // Partial success (207 Multi-Status)
      return NextResponse.json({ 
        success: true, 
        message: "Partial success. Some records failed.",
        results, 
        errors 
      }, { status: 207 });
    }

    // Full success
    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${results.length} customers.`,
      results,
    });

  } catch (error: any) {
    console.error("JSON Ingestion Fatal Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error processing ingestion payload" },
      { status: 500 }
    );
  }
}
