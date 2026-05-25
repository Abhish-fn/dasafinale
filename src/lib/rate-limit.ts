const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

/**
 * In-memory rate limiter. Tracks requests per key within a sliding window.
 * @param key - Unique identifier (e.g., userId, IP)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.lastReset > windowMs) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

// Cleanup old entries every 10 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now - entry.lastReset > 600_000) {
        rateLimitMap.delete(key);
      }
    }
  }, 600_000);
}
