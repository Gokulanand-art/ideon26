import { NextResponse } from "next/server";
import { requireAdmin, checkOrigin } from "@/lib/auth";
import { registerParticipant, RegistrationError } from "@/lib/registration";
import { registerPayloadSchema, formatZodError } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * On-spot registration (venue counter). Creates the participant as CONFIRMED
 * with a VERIFIED cash payment, charging team_size × fee_per_head at the
 * counter. Respects the on-spot cap (10) and the total cap (30).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkOrigin(request))) {
    return NextResponse.json({ error: "Origin verification failed." }, { status: 403 });
  }

  // Generous limit: 20 on-spot registrations / minute / IP.
  const rl = rateLimit(`onspot:${getClientIp(request)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await registerParticipant(parsed.data, {
      onsite: true,
      adminUser: admin.u,
    });
    return NextResponse.json(
      {
        registration_id: result.registration_id,
        status: result.status,
        amount: result.amount,
        payment_status: result.payment_status,
        message: `On-spot registration ${result.registration_id} created. Amount collected: ₹${result.amount}.`,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof RegistrationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("on-spot registration error", err);
    return NextResponse.json(
      { error: "Something went wrong while creating the on-spot registration." },
      { status: 500 },
    );
  }
}