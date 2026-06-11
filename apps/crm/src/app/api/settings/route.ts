import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "singleton" }
    });

    // If it doesn't exist, create defaults
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: "singleton",
          high_value_min_spend: 10000.0,
          high_value_min_orders: 5,
          mid_tier_min_spend: 3000.0,
          mid_tier_min_orders: 2,
          at_risk_days: 60,
          dormant_days: 120,
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("GET Settings Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: {
        high_value_min_spend: data.high_value_min_spend,
        high_value_min_orders: data.high_value_min_orders,
        mid_tier_min_spend: data.mid_tier_min_spend,
        mid_tier_min_orders: data.mid_tier_min_orders,
        at_risk_days: data.at_risk_days,
        dormant_days: data.dormant_days,
      },
      create: {
        id: "singleton",
        high_value_min_spend: data.high_value_min_spend,
        high_value_min_orders: data.high_value_min_orders,
        mid_tier_min_spend: data.mid_tier_min_spend,
        mid_tier_min_orders: data.mid_tier_min_orders,
        at_risk_days: data.at_risk_days ?? 60,
        dormant_days: data.dormant_days ?? 120,
      }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("POST Settings Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
