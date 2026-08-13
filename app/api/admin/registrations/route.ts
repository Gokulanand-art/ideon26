import { NextResponse } from "next/server";
import { requireAdmin, checkOrigin } from "@/lib/auth";
import { listRegistrations, runAdminAction, type ListParams } from "@/lib/admin";
import { adminActionSchema, formatZodError } from "@/lib/validation";
import { RegistrationError } from "@/lib/registration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const params: ListParams = {
    search: url.searchParams.get("search") ?? undefined,
    mode: url.searchParams.get("mode") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: Number(url.searchParams.get("page") ?? "1") || 1,
    limit: Number(url.searchParams.get("limit") ?? "25") || 25,
  };
  const result = await listRegistrations(params);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkOrigin(request))) {
    return NextResponse.json({ error: "Origin verification failed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", fields: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const updated = await runAdminAction(parsed.data.id, parsed.data.action, admin.u);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof RegistrationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("admin action error", err);
    return NextResponse.json(
      { error: "Failed to update the registration." },
      { status: 500 },
    );
  }
}