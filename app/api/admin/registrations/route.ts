import { NextResponse } from "next/server";
import { requireAdmin, checkOrigin } from "@/lib/auth";
import {
  listRegistrations,
  updateStatus,
  type ListParams,
} from "@/lib/admin";
import { adminStatusUpdateSchema, formatZodError } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireAdmin();
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
  await requireAdmin();
  if (!(await checkOrigin(request))) {
    return NextResponse.json({ error: "Origin verification failed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = adminStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", fields: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const updated = await updateStatus(parsed.data.id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
