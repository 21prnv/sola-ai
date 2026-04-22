type Entry = { count: number; resetAt: number }

const WINDOW_MS = 60_000
const hits = new Map<string, Entry>()

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfter: number; resetAt: number }

export function checkRateLimit(key: string, max: number, windowMs: number = WINDOW_MS): RateLimitResult {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs
    hits.set(key, { count: 1, resetAt })
    return { ok: true, remaining: max - 1, resetAt }
  }
  if (entry.count >= max) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000), resetAt: entry.resetAt }
  }
  entry.count += 1
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
}, WINDOW_MS)
cleanupInterval.unref?.()
