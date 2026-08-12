import { NextResponse } from "next/server";
import { registerSchema, formatZodError } from "@/lib/validation";
import { registerParticipant, RegistrationError } from "@/lib/registration";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createRegistrationToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Basic abuse protection: 10 registrations / minute / IP.
  const ip = getClientIp(request);
  const rl = rateLimit(`reg:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body.", fields: {} },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await registerParticipant(parsed.data);
    const token = createRegistrationToken(result.registration_id);
    return NextResponse.json(
      {
        registration_id: result.registration_id,
        name: result.full_name,
        participation_type: result.participation_type,
        team_name: result.team_name,
        team_size: result.team_size,
        status: result.status,
        token,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof RegistrationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("registration error", err);
    return NextResponse.json(
      { error: "Something went wrong while completing your registration. Please try again." },
      { status: 500 },
    );
  }
}
