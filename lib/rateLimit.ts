/**
 * Simple in-memory rate limiter (fixed window).
 *
 * Suitable for single-instance deployments. For multi-instance production, swap
 * for a Redis-backed limiter.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfter: 0 };
  }
  entry.count += 1;
  const ok = entry.count <= limit;
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - entry.count),
    retryAfter: ok ? 0 : Math.ceil((entry.reset - now) / 1000),
  };
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
