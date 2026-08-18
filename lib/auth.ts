/**
 * Admin authentication.
 *
 * - Passwords are hashed with scrypt (node:crypto) and verified with
 *   timingSafeEqual. Production should set ADMIN_PASSWORD_HASH (run
 *   `npm run hash-password`). A plaintext ADMIN_PASSWORD env is supported for
 *   convenience and is hashed at runtime for comparison.
 * - Sessions are signed HMAC-SHA256 tokens stored in an httpOnly,
 *   SameSite=Strict cookie. No password is ever put in a URL.
 * - CSRF: admin state-changing endpoints also verify the Origin header.
 */
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "./config";

const COOKIE_NAME = "hk_admin_session";
// Cookie lifetime tracks the signed token's own expiry (SESSION_TTL_HOURS).
// Hardcoding it meant a longer SESSION_TTL_HOURS silently did nothing: the
// token stayed valid while the browser discarded the cookie after 12h.
const cookieMaxAge = (): number => Math.floor(config.sessionTtlMs / 1000);

function requireSecret(): string {
  if (!config.adminAuthSecret) {
    if (process.env.NODE_ENV !== "production") {
      // Deterministic dev fallback so local setup "just works" without config.
      return "dev-only-insecure-secret-please-set-ADMIN_AUTH_SECRET";
    }
    throw new Error("ADMIN_AUTH_SECRET is not configured.");
  }
  return config.adminAuthSecret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  // ":" delimiter instead of "$" so the value survives dotenv parsing
  // (.env files expand $... sequences, which would corrupt the hash).
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, saltHex, hashHex] = stored.split(":");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const hash = Buffer.from(hashHex, "hex");
    const computed = scryptSync(password, salt, 64);
    if (computed.length !== hash.length) return false;
    return timingSafeEqual(computed, hash);
  } catch {
    return false;
  }
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  const secret = requireSecret();
  const sig = createHmac("sha256", secret).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

export function createSessionToken(username: string): string {
  const exp = Date.now() + config.sessionTtlMs;
  const payload = b64url(JSON.stringify({ u: username, exp }));
  return sign(payload);
}

export function verifySessionToken(token: string | undefined | null): { u: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload] = parts;
  const expected = sign(payload);
  // Constant-time compare of the full token.
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.exp !== "number" || decoded.exp < Date.now()) return null;
    if (typeof decoded.u !== "string") return null;
    return { u: decoded.u };
  } catch {
    return null;
  }
}

/**
 * Shared-link access key: whoever holds it gets an admin session without a
 * password, so it is deliberately long and unguessable.
 *
 * Derived from ADMIN_AUTH_SECRET rather than stored separately, so there is
 * no extra secret to configure or leave unset by accident. Setting
 * ADMIN_ACCESS_KEY overrides it. Rotate by rotating ADMIN_AUTH_SECRET, which
 * also invalidates every existing session.
 */
export function adminAccessKey(): string {
  if (config.adminAccessKey) return config.adminAccessKey;
  if (!config.adminAuthSecret) return "";
  return b64url(
    createHmac("sha256", config.adminAuthSecret).update("admin-access-key-v1").digest(),
  ).slice(0, 43);
}

/** Constant-time key comparison; hashing first keeps unequal lengths safe. */
export function verifyAccessKey(key: string | undefined | null): boolean {
  const expected = adminAccessKey();
  if (!expected || !key) return false;
  const a = createHmac("sha256", expected).update(key).digest();
  const b = createHmac("sha256", expected).update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function setAdminCookie(username: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(username), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookieMaxAge(),
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function getCurrentAdmin(): Promise<{ u: string } | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

/**
 * Resolve the current admin session, or null when unauthenticated. Route
 * handlers should turn null into a 401 response (throwing a Response object
 * is not handled by the route handler runtime).
 */
export async function requireAdmin(): Promise<{ u: string } | null> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return null;
  }
  return admin;
}

/**
 * Verify admin credentials against configuration.
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  if (username !== config.adminUsername) return false;
  if (config.adminPasswordHash) {
    return verifyPassword(password, config.adminPasswordHash);
  }
  if (config.adminPasswordPlain) {
    return password === config.adminPasswordPlain;
  }
  return false;
}

/**
 * CSRF: confirm the request Origin matches the expected host.
 */
export async function checkOrigin(request: Request): Promise<boolean> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.host === host;
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
