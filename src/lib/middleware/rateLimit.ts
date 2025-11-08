import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

/**
 * Simple rate limiting middleware
 * For production, use a proper rate limiting service like Upstash Redis
 */
export function rateLimit(options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }) {
  return (request: NextRequest): { allowed: boolean; remaining: number; resetTime: number } | null => {
    const identifier = getIdentifier(request);
    const now = Date.now();
    
    const record = rateLimitMap.get(identifier);
    
    if (!record || now > record.resetTime) {
      // Create new record
      rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return { allowed: true, remaining: options.maxRequests - 1, resetTime: now + options.windowMs };
    }
    
    if (record.count >= options.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }
    
    record.count++;
    return { allowed: true, remaining: options.maxRequests - record.count, resetTime: record.resetTime };
  };
}

function getIdentifier(request: NextRequest): string {
  // Use IP address as identifier
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Clean up old rate limit records periodically
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    // Use Array.from to convert Map entries to array for iteration
    const entries = Array.from(rateLimitMap.entries());
    for (const [key, value] of entries) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

