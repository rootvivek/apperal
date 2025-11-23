import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServerAuthClient } from '@/lib/supabase/server-auth';

/**
 * Middleware to verify if the authenticated user is an admin
 * This should be used in all admin API routes
 */
export async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    let userId: string | null = null;
    
    // Try to get user ID from headers (for Firebase auth)
    // Check multiple header name variations
    const headerUserId = request.headers.get('x-user-id') || 
                        request.headers.get('X-User-Id') ||
                        request.headers.get('x-admin-user-id') ||
                        request.headers.get('X-Admin-User-Id');
    if (headerUserId) {
      // Validate user ID format before using it
      const isValidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerUserId) ||
                           /^[a-zA-Z0-9]{20,28}$/.test(headerUserId);
      if (!isValidFormat) {
        return { isAdmin: false, error: 'Invalid user ID format' };
      }
      userId = headerUserId;
    }
    
    // Try to get Firebase user ID from request body (for Firebase auth)
    // Only for POST requests, and only if not already found in header
    if (!userId && request.method === 'POST') {
      try {
        const body = await request.clone().json().catch(() => ({}));
        if (body && typeof body === 'object' && 'userId' in body) {
          userId = body.userId as string;
        }
      } catch {
        // Body might not be JSON or might be empty, continue
      }
    }
    
    // Try to get user from Authorization header (for Supabase auth)
    // Only try this if we haven't found a userId yet
    if (!userId) {
      try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
          // Only try Supabase auth if token looks like a Supabase token (JWT format)
          // Firebase tokens are different, so skip this check for Firebase
          if (token.length > 100) { // Supabase tokens are typically longer
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
      if (!tokenError && user) {
        userId = user.id;
      }
          }
        }
      } catch (authError) {
        // Ignore auth header errors - Firebase users won't have Supabase tokens
        // This is expected and not an error
      }
    }
    
    // If no user from header, try to get from cookies (for Supabase auth)
    // Only try this if we haven't found a userId yet (Firebase users won't have Supabase cookies)
    if (!userId) {
      try {
        const supabaseAuth = await createServerAuthClient(request);
      const { data: { user }, error: cookieError } = await supabaseAuth.auth.getUser();
      if (!cookieError && user) {
        userId = user.id;
        }
      } catch (cookieError) {
        // Ignore cookie errors - Firebase users won't have Supabase auth cookies
        // This is expected and not an error
      }
    }
    
    if (!userId) {
      return { isAdmin: false, error: 'Unauthorized - No valid session found' };
    }

    // Use service role client to verify admin status (has access to user_profiles)
    const supabaseAdmin = createServerClient();
    return await verifyUserIsAdmin(userId, supabaseAdmin);
  } catch (error: any) {
    return { isAdmin: false, error: error.message || 'Verification failed' };
  }
}

async function verifyUserIsAdmin(userId: string, supabase: any): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    // Check is_admin from user_profiles table (for Firebase phone auth)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return { isAdmin: false, error: 'Failed to fetch user profile' };
    }

    if (!profile) {
      return { isAdmin: false, error: 'User profile not found' };
    }

    // Check is_admin from user_profiles table
    const isAdmin = profile.is_admin === true;

    return { isAdmin, userId };
  } catch (error: any) {
    return { isAdmin: false, error: error.message || 'Verification failed' };
  }
}

/**
 * Wrapper function for admin API routes with rate limiting
 * Usage: export const POST = withAdminAuth(async (request, { userId }) => { ... })
 * For dynamic routes: export const PUT = withAdminAuth(async (request, { userId, params }) => { ... })
 * Options: { rateLimit?: { windowMs: number; maxRequests: number } | false }
 */
export function withAdminAuth<T extends Record<string, any> = {}>(
  handler: (request: NextRequest, context: { userId: string; params?: Promise<T> }) => Promise<NextResponse>,
  options?: { 
    rateLimit?: { windowMs: number; maxRequests: number } | false;
  }
) {
  return async (
    request: NextRequest, 
    context?: { params?: Promise<T> } | { params: Promise<T> }
  ) => {
    // Apply rate limiting if specified (default: 60 requests per minute)
    if (options?.rateLimit !== false) {
      const { rateLimit } = await import('@/lib/middleware/rateLimit');
      const rateLimitOptions = options?.rateLimit || { windowMs: 60000, maxRequests: 60 };
      const rateLimitResult = rateLimit(rateLimitOptions)(request);
      if (rateLimitResult && !rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
      }
    }


    const verification = await verifyAdmin(request);
    
    if (!verification.isAdmin || !verification.userId) {
      // Generic error message in production
      const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Forbidden: Admin access required'
        : verification.error || 'Forbidden: Admin access required';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      );
    }

    try {
      // Extract params from context (handles both optional and required params)
      const params = context && 'params' in context ? context.params : undefined;
      return await handler(request, { 
        userId: verification.userId,
        params
      });
    } catch (handlerError: any) {
      console.error('Error in admin handler:', handlerError);
      return NextResponse.json(
        { 
          error: handlerError.message || 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? handlerError.stack : undefined
        },
        { status: 500 }
      );
    }
  };
}

