import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const lifecycle = searchParams.get("lifecycle") || "";
    const rfm = searchParams.get("rfm") || "";
    const channel = searchParams.get("channel") || "";
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    // Text search
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }

    // Lifecycle stage filter
    if (lifecycle) {
      conditions.push({ lifecycle_stage: lifecycle });
    }

    // RFM score filter
    if (rfm) {
      conditions.push({ rfm_score: rfm });
    }

    // Channel preference filter
    if (channel) {
      conditions.push({ channel_pref: channel });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          orders: {
            orderBy: { created_at: "desc" },
            take: 1,
            select: { created_at: true, product_name: true },
          },
          _count: { select: { orders: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Customer list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
