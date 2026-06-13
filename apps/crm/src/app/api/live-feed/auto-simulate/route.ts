import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ─── Product catalog ────────────────────────────────────────────── */
const PRODUCTS = [
  { name: "Premium Skin Serum", amount: 85 },
  { name: "Hydrating Face Cream", amount: 120 },
  { name: "Vitamin C Drops", amount: 45 },
  { name: "Anti-Aging Night Mask", amount: 95 },
  { name: "Glow Booster Kit", amount: 199 },
  { name: "Collagen Elixir", amount: 150 },
  { name: "SPF 50 Daily Shield", amount: 35 },
  { name: "Retinol Eye Cream", amount: 65 },
  { name: "Hyaluronic Acid Serum", amount: 55 },
  { name: "Charcoal Detox Mask", amount: 40 },
];

const PAGES = [
  "/products/skin-serum", "/products/face-cream", "/products/vitamin-c",
  "/collections/skincare", "/collections/best-sellers", "/cart",
  "/checkout", "/account/orders", "/blog/skincare-routine", "/",
];

const COUPONS = ["SAVE10", "FIRST20", "GLOW15", "SUMMER25", "VIP30"];

/* ─── Event type weights (probability distribution) ──────────────── */
const EVENT_TYPES: Array<{ type: string; weight: number }> = [
  { type: "PAGE_VIEWED",       weight: 25 },
  { type: "ADDED_TO_CART",     weight: 20 },
  { type: "REMOVED_FROM_CART", weight: 8 },
  { type: "ORDER_PLACED",      weight: 15 },
  { type: "ORDER_CANCELLED",   weight: 5 },
  { type: "CART_ABANDONED",    weight: 12 },
  { type: "CHECKOUT_STARTED",  weight: 8 },
  { type: "WISHLIST_ADDED",    weight: 5 },
  { type: "COUPON_APPLIED",    weight: 4 },
  { type: "REVIEW_SUBMITTED",  weight: 3 },
];

function pickWeighted(): string {
  const totalWeight = EVENT_TYPES.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const e of EVENT_TYPES) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return "PAGE_VIEWED";
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * POST /api/live-feed/auto-simulate
 *
 * Generates 1-3 random customer events per call.
 * Called automatically by the channel-stub poller every few seconds.
 *
 * For ORDER_PLACED events, also creates a real Order record so the
 * auto-trigger engine can match it to active workflows.
 */
export async function POST() {
  try {
    // Pick 1-3 random customers
    const customerCount = await prisma.customer.count();
    if (customerCount === 0) {
      return NextResponse.json({ success: false, error: "No customers" }, { status: 404 });
    }

    const eventsToCreate = Math.random() < 0.3 ? 1 : Math.random() < 0.7 ? 2 : 3;
    const created: any[] = [];

    for (let i = 0; i < eventsToCreate; i++) {
      const skip = Math.floor(Math.random() * customerCount);
      const customer = await prisma.customer.findFirst({ skip, orderBy: { id: "asc" } });
      if (!customer) continue;

      const eventType = pickWeighted();
      const product = pick(PRODUCTS);

      // Build metadata based on event type
      let metadata: Record<string, any> = {};

      switch (eventType) {
        case "PAGE_VIEWED":
          metadata = { page: pick(PAGES) };
          break;
        case "ADDED_TO_CART":
        case "REMOVED_FROM_CART":
        case "WISHLIST_ADDED":
          metadata = { product_name: product.name, amount: product.amount };
          break;
        case "ORDER_PLACED":
          metadata = { product_name: product.name, amount: product.amount };
          break;
        case "ORDER_CANCELLED":
          metadata = { product_name: product.name, amount: product.amount, reason: pick(["Changed mind", "Found cheaper", "Delivery too slow", "Wrong item"]) };
          break;
        case "CART_ABANDONED":
          metadata = { product_name: product.name, amount: product.amount, cart_items: Math.floor(Math.random() * 4) + 1 };
          break;
        case "CHECKOUT_STARTED":
          metadata = { product_name: product.name, amount: product.amount };
          break;
        case "COUPON_APPLIED":
          metadata = { coupon_code: pick(COUPONS), discount_pct: parseInt(pick(COUPONS).replace(/\D/g, "")) };
          break;
        case "REVIEW_SUBMITTED":
          metadata = { product_name: product.name, rating: Math.floor(Math.random() * 3) + 3, review: pick(["Great product!", "Love it!", "Works well", "Good value", "Amazing results"]) };
          break;
      }

      // Create the CustomerEvent record
      const event = await prisma.customerEvent.create({
        data: {
          customer_id: customer.id,
          event_type: eventType,
          metadata,
        },
      });

      // For ORDER_PLACED, also create a real Order record
      // This will be picked up by the auto-trigger engine
      if (eventType === "ORDER_PLACED") {
        await prisma.order.create({
          data: {
            customer_id: customer.id,
            amount: product.amount,
            product_name: product.name,
          },
        });
      }

      created.push({
        id: event.id,
        event_type: eventType,
        customer_name: customer.name,
        metadata,
      });
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      events: created,
    });
  } catch (error: any) {
    console.error("[Auto-Simulate] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
