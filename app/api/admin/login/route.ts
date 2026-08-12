import { NextResponse } from "next/server";
import { adminLoginSchema, formatZodError } from "@/lib/validation";
import { verifyAdminCredentials, setAdminCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  // 10 attempts / 15 minutes / IP.
  const rl = rateLimit(`admin-login:${ip}`, 10, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid credentials.", fields: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const ok = verifyAdminCredentials(parsed.data.username, parsed.data.password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  await setAdminCookie(parsed.data.username);
  return NextResponse.json({ ok: true });
}
