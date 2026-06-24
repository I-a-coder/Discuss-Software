import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function limitByKey(
  key: string,
  options: { windowMs: number; max: number }
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (existing.count >= options.max) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, retryAfterSec: 0 };
}

// Prune expired buckets every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}, 300_000);

/**
 * One-liner rate limiter for API routes.
 * Returns a 429 NextResponse if limit exceeded, otherwise null.
 *
 * Usage:
 *   const limited = rateLimit(userId, { max: 5, windowMs: 60_000, label: "calls" });
 *   if (limited) return limited;
 */
export function rateLimit(
  userId: string,
  opts: { max: number; windowMs: number; label?: string }
): NextResponse | null {
  const { max, windowMs, label = "requests" } = opts;
  const result = limitByKey(`${label}:${userId}`, { max, windowMs });
  if (!result.allowed) {
    return NextResponse.json(
      { error: `Too many ${label}. Retry in ${result.retryAfterSec}s.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSec),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  return null;
}
