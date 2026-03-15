const windowMs = 60_000
const maxRequests = 100

const hits = new Map<string, { count: number; resetAt: number }>()

// Cleanup expired entries every 5 minutes
const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of hits) {
    if (now >= entry.resetAt) hits.delete(key)
  }
}, 5 * 60_000)
cleanup.unref()

export function _resetForTest(): void {
  hits.clear()
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)

  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count++
  return entry.count > maxRequests
}
