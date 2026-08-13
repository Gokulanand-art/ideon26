import { NextResponse } from "next/server";
import { verifyRegistrationToken } from "@/lib/tokens";
import { submitPaymentTxn } from "@/lib/registration";
import { txnIdSchema, formatZodError } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // Same short-lived signed token as the success page: the payer must prove
  // they own this registration before submitting a transaction id.
  if (!verifyRegistrationToken(token, id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // 10 submissions / minute / IP.
  const rl = rateLimit(`txn:${getClientIp(request)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = txnIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await submitPaymentTxn(id, parsed.data.txn_id);
    return NextResponse.json({
      ok: true,
      payment_status: result.payment_status,
      message:
        "Transaction ID recorded. An organizer will verify your payment shortly — your seat is held in the meantime.",
    });
  } catch (err) {
    const { RegistrationError } = await import("@/lib/registration");
    if (err instanceof RegistrationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("txn submit error", err);
    return NextResponse.json(
      { error: "Something went wrong while recording your payment. Please try again." },
      { status: 500 },
    );
  }
}