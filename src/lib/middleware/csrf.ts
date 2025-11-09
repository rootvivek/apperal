import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'csrf-token';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create CSRF token for the current request
 */
export async function getCSRFToken(request?: NextRequest): Promise<string> {
  if (request) {
    // For API routes
    const cookieStore = request.cookies;
    let token = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
    
    if (!token) {
      token = generateCSRFToken();
    }
    return token;
  } else {
    // For server components
    const cookieStore = await cookies();
    let token = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
    
    if (!token) {
      token = generateCSRFToken();
    }
    return token;
  }
}

/**
 * Verify CSRF token from request
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

/**
 * Middleware to require CSRF token for state-changing operations
 */
export function requireCSRF(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    // Only require CSRF for POST, PUT, PATCH, DELETE methods
    const method = request.method;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (!verifyCSRFToken(request)) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    return handler(request);
  };
}

