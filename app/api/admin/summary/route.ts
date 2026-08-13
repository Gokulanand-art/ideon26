import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminSummary } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const summary = await getAdminSummary();
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}