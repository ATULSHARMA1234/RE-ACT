import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/live-feed/simulate
 * Places a real order in the system. The auto-trigger engine (running
 * every 15s in the channel-stub poller) will detect this order and
 * automatically create workflow jobs for any matching active workflow.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const customerId = body.customer_id;
    const productName = body.product_name;
    const amount = body.amount;

    // If no customer specified, pick a random one
    let customer;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
    } else {
      const count = await prisma.customer.count();
      const skip = Math.floor(Math.random() * Math.max(count, 1));
      customer = await prisma.customer.findFirst({ skip, orderBy: { id: "asc" } });
    }

    if (!customer) {
      return NextResponse.json({ success: false, error: "No customers in database" }, { status: 404 });
    }

    // If no product specified, pick a random one
    const products = [
      { name: "Premium Skin Serum", amount: 85 },
      { name: "Hydrating Face Cream", amount: 120 },
      { name: "Vitamin C Drops", amount: 45 },
      { name: "Anti-Aging Night Mask", amount: 95 },
      { name: "Glow Booster Kit", amount: 199 },
      { name: "Collagen Elixir", amount: 150 },
      { name: "SPF 50 Daily Shield", amount: 35 },
    ];
    const product = productName
      ? { name: productName, amount: amount || 50 }
      : products[Math.floor(Math.random() * products.length)];

    // Create the order — this is the ONLY thing we do.
    // The auto-trigger engine will detect it and fire the workflow.
    const order = await prisma.order.create({
      data: {
        customer_id: customer.id,
        amount: product.amount,
        product_name: product.name,
      },
    });

    console.log(`[Live Feed] 🛒 Order placed: ${customer.name} → ${product.name} ($${product.amount})`);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        customer: { id: customer.id, name: customer.name, email: customer.email },
        product: product.name,
        amount: product.amount,
      },
      message: `Order placed: ${customer.name} bought ${product.name} ($${product.amount}). Workflow will trigger automatically.`,
    });
  } catch (error: any) {
    console.error("[Simulate] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
