interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * In-memory sliding window rate limiter.
 * Default: 10 requests per 60 seconds per IP address.
 */
export function checkRateLimit(
  clientIp: string,
  limit = 10,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  const record = ipRequestMap.get(clientIp);

  if (!record || now > record.resetAt) {
    ipRequestMap.set(clientIp, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - record.count,
    resetSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

/**
 * Periodically purge stale IP entries to prevent memory leaks.
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now > record.resetAt + 60000) {
      ipRequestMap.delete(ip);
    }
  }
}, 120000);
