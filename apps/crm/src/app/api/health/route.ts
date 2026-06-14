import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    groq_key_set: !!process.env.GROQ_API_KEY,
    groq_key_prefix: process.env.GROQ_API_KEY?.slice(0, 8) || "NOT SET",
    google_key_set: !!process.env.GOOGLE_API_KEY,
    google_key_prefix: process.env.GOOGLE_API_KEY?.slice(0, 8) || "NOT SET",
    gemini_key_set: !!process.env.GEMINI_API_KEY,
    gemini_key_prefix: process.env.GEMINI_API_KEY?.slice(0, 8) || "NOT SET",
    channel_stub_url: process.env.CHANNEL_STUB_URL || "NOT SET",
    node_env: process.env.NODE_ENV,
  });
}
