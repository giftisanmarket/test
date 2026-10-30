import { headers } from "next/headers";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limiting cache: key -> record
const rateLimitCache = new Map<string, RateLimitRecord>();

// Periodically purge expired records to avoid memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitCache.entries()) {
      if (now > record.resetTime) {
        rateLimitCache.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Ensure background cleanup does not keep serverless processes open indefinitely
  if (timer && typeof timer === "object" && "unref" in timer) {
    (timer as { unref: () => void }).unref();
  }
}

/**
 * Extracts client IP address from standard proxy/CDN headers.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    // Prefer platform-verified proxy headers that clients cannot spoof on Vercel / Cloudflare
    const vercelIp = headersList.get("x-vercel-forwarded-for");
    if (vercelIp) {
      return vercelIp.split(",")[0].trim();
    }
    const cfConnectingIp = headersList.get("cf-connecting-ip");
    if (cfConnectingIp) {
      return cfConnectingIp.trim();
    }
    const realIp = headersList.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
      const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }
  } catch {
    // If called outside of a request context, return fallback
  }
  return "127.0.0.1";
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * Checks rate limit for a specific action and key (typically IP or email).
 * 
 * @param key Unique key such as `login:${ip}` or `contact:${ip}`
 * @param limit Maximum permitted operations within window
 * @param windowMs Time window duration in milliseconds (default: 60s)
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record || now > record.resetTime) {
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetInMs: windowMs,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetTime - now),
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: limit - record.count,
    resetInMs: Math.max(0, record.resetTime - now),
  };
}
