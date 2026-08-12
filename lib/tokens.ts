/**
 * Short-lived signed tokens granting the holder read access to a single
 * registration's public details (used by the success page). Tokens are HMAC
 * signed with ADMIN_AUTH_SECRET (or a dev fallback) and expire.
 */
import { createHmac } from "node:crypto";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

function secret(): string {
  return (
    process.env.ADMIN_AUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-only-insecure-secret-please-set-ADMIN_AUTH_SECRET"
      : "")
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function createRegistrationToken(registrationId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = b64url(JSON.stringify({ id: registrationId, exp }));
  const sig = createHmac("sha256", secret()).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

export function verifyRegistrationToken(
  token: string | null | undefined,
  registrationId: string,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload] = parts;
  const expected = `${payload}.${b64url(createHmac("sha256", secret()).update(payload).digest())}`;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!a.equals(b)) {
    // timingSafeEqual would also work; equals is fine here.
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.id !== registrationId) return false;
    if (typeof decoded.exp !== "number" || decoded.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}
