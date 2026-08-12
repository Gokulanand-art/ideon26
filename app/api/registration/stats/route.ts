import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("stats error", err);
    return NextResponse.json(
      { error: "Failed to load registration statistics." },
      { status: 500 },
    );
  }
}
