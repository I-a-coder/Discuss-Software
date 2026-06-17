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

