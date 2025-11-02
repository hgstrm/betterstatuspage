/**
 * Rate Limiter for Demo Mode
 * Prevents abuse of the public demo instance
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store
// In production with multiple instances, consider using Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per 15 minutes per IP

/**
 * Get client identifier (IP address or session ID)
 */
function getClientIdentifier(request: Request | { headers: Headers }): string {
  const headers = request.headers instanceof Headers ? request.headers : new Headers();
  
  // Try to get IP from headers (common hosting platforms)
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  
  // In demo mode, also consider session as fallback
  return ip;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(request: Request | { headers: Headers }): { allowed: boolean; remaining: number; resetAt: number } {
  const clientId = getClientIdentifier(request);
  const now = Date.now();
  
  let entry = rateLimitStore.get(clientId);
  
  // Clean up expired entries
  if (entry && entry.resetAt < now) {
    rateLimitStore.delete(clientId);
    entry = undefined;
  }
  
  // Create new entry if needed
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(clientId, entry);
  }
  
  // Check if limit exceeded
  const allowed = entry.count < MAX_REQUESTS_PER_WINDOW;
  
  if (allowed) {
    entry.count++;
  }
  
  return {
    allowed,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Clean up old entries periodically
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(request: Request | { headers: Headers }): Record<string, string> {
  const clientId = getClientIdentifier(request);
  const entry = rateLimitStore.get(clientId);
  
  if (!entry) {
    return {
      'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
      'X-RateLimit-Remaining': String(MAX_REQUESTS_PER_WINDOW),
      'X-RateLimit-Reset': String(Math.floor((Date.now() + RATE_LIMIT_WINDOW_MS) / 1000)),
    };
  }
  
  return {
    'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
    'X-RateLimit-Remaining': String(Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count)),
    'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
  };
}

