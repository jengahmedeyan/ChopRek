/**
 * Advanced Rate Limiting Implementation
 * 
 * Provides multiple rate limiting strategies:
 * - Fixed Window: Simple counter that resets after time window
 * - Sliding Window: More accurate, considers request distribution
 * - Token Bucket: Allows burst traffic with gradual refill
 */

import { NextRequest } from 'next/server';

// ===== RATE LIMIT CONFIGURATION =====

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
  statusCode?: number; // Custom status code (default: 429)
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export interface TokenBucketEntry {
  tokens: number;
  lastRefill: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();
const tokenBucketStore = new Map<string, TokenBucketEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean rate limit store
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  // Clean token bucket store (remove inactive buckets after 1 hour)
  for (const [key, entry] of tokenBucketStore.entries()) {
    if (now - entry.lastRefill > 60 * 60 * 1000) {
      tokenBucketStore.delete(key);
    }
  }
}, 60000); // Run every minute

// ===== KEY GENERATORS =====

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Default key generator: IP address
 */
export function defaultKeyGenerator(request: NextRequest): string {
  return getClientIP(request);
}

/**
 * User-based key generator: User ID from session
 */
export function userKeyGenerator(request: NextRequest): string {
  const userId = request.headers.get('x-user-id') || getClientIP(request);
  return `user:${userId}`;
}

/**
 * Route-based key generator: IP + route
 */
export function routeKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request);
  const route = request.nextUrl.pathname;
  return `${ip}:${route}`;
}

/**
 * API key-based generator
 */
export function apiKeyGenerator(request: NextRequest): string {
  const apiKey = request.headers.get('x-api-key') || getClientIP(request);
  return `api:${apiKey}`;
}

// ===== FIXED WINDOW RATE LIMITING =====

/**
 * Fixed window rate limiter
 * Simple counter that resets after time window
 */
export function fixedWindowLimiter(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // No entry or window expired - create new
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
      firstRequest: now,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// ===== SLIDING WINDOW RATE LIMITING =====

interface SlidingWindowEntry {
  timestamps: number[];
}

const slidingWindowStore = new Map<string, SlidingWindowEntry>();

/**
 * Sliding window rate limiter
 * More accurate than fixed window, considers request distribution
 */
export function slidingWindowLimiter(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Get or create entry
  let entry = slidingWindowStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    slidingWindowStore.set(key, entry);
  }
  
  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
  
  // Check if limit exceeded
  if (entry.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: oldestTimestamp + config.windowMs,
      retryAfter,
    };
  }
  
  // Add current timestamp
  entry.timestamps.push(now);
  slidingWindowStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetTime: now + config.windowMs,
  };
}

// ===== TOKEN BUCKET RATE LIMITING =====

/**
 * Token bucket rate limiter
 * Allows burst traffic with gradual token refill
 */
export function tokenBucketLimiter(
  key: string,
  bucketSize: number,
  refillRate: number // tokens per second
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  
  // Get or create bucket
  let bucket = tokenBucketStore.get(key);
  if (!bucket) {
    bucket = {
      tokens: bucketSize,
      lastRefill: now,
    };
    tokenBucketStore.set(key, bucket);
  }
  
  // Calculate tokens to add based on time elapsed
  const timeSinceLastRefill = (now - bucket.lastRefill) / 1000; // seconds
  const tokensToAdd = timeSinceLastRefill * refillRate;
  
  // Refill tokens (capped at bucket size)
  bucket.tokens = Math.min(bucketSize, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
  
  // Check if tokens available
  if (bucket.tokens < 1) {
    const timeToNextToken = (1 - bucket.tokens) / refillRate;
    
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(timeToNextToken),
    };
  }
  
  // Consume one token
  bucket.tokens -= 1;
  tokenBucketStore.set(key, bucket);
  
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
  };
}

// ===== MIDDLEWARE HELPER =====

/**
 * Create rate limit middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  
  return (request: NextRequest) => {
    const key = keyGenerator(request);
    const result = fixedWindowLimiter(key, config);
    
    return result;
  };
}

/**
 * Get rate limit status for debugging
 */
export function getRateLimitStatus(key: string): RateLimitEntry | null {
  return rateLimitStore.get(key) || null;
}

/**
 * Clear rate limit for a key (useful for testing or admin override)
 */
export function clearRateLimit(key: string): boolean {
  return rateLimitStore.delete(key);
}

/**
 * Clear all rate limits
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  slidingWindowStore.clear();
  tokenBucketStore.clear();
}

// ===== PRESET CONFIGURATIONS =====

export const RATE_LIMIT_PRESETS = {
  // Strict limits for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Moderate limits for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'API rate limit exceeded. Please slow down.',
  },
  
  // Strict limits for write operations
  write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Too many write requests. Please slow down.',
  },
  
  // Lenient limits for read operations
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,
    message: 'Too many read requests. Please slow down.',
  },
  
  // Very strict for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Rate limit exceeded for sensitive operation.',
  },
  
  // Generous for public endpoints
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500,
    message: 'Rate limit exceeded.',
  },
};

// ===== EXPORT =====

export default {
  fixedWindowLimiter,
  slidingWindowLimiter,
  tokenBucketLimiter,
  createRateLimiter,
  getRateLimitStatus,
  clearRateLimit,
  clearAllRateLimits,
  getClientIP,
  defaultKeyGenerator,
  userKeyGenerator,
  routeKeyGenerator,
  apiKeyGenerator,
  RATE_LIMIT_PRESETS,
};
