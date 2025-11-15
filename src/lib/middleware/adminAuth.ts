import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServerAuthClient } from '@/lib/supabase/server-auth';

// Admin phone number - must match AdminGuard
// Check at runtime instead of module load to avoid build-time errors
const ADMIN_PHONE = process.env.ADMIN_PHONE;

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
    // Fetch user profile to get phone number
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return { isAdmin: false, error: 'User profile not found' };
    }

    // Check if phone number matches admin phone
    if (!ADMIN_PHONE) {
      return { isAdmin: false, error: 'Admin phone not configured' };
    }

    const userPhone = profile.phone || '';
    const normalizedUserPhone = userPhone.replace(/\D/g, '');
    const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
    const userLast10 = normalizedUserPhone.slice(-10);
    const adminLast10 = normalizedAdminPhone.slice(-10);
    const isAdmin = userLast10 === adminLast10 && userLast10.length === 10;

    return { isAdmin, userId };
  } catch (error: any) {
    return { isAdmin: false, error: error.message || 'Verification failed' };
  }
}

/**
 * Wrapper function for admin API routes with rate limiting
 * Usage: export const POST = withAdminAuth(async (request, { userId }) => { ... })
 * Options: { rateLimit?: { windowMs: number; maxRequests: number } | false }
 */
export function withAdminAuth(
  handler: (request: NextRequest, context: { userId: string }) => Promise<NextResponse>,
  options?: { 
    rateLimit?: { windowMs: number; maxRequests: number } | false;
  }
) {
  return async (request: NextRequest) => {
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

    return handler(request, { userId: verification.userId });
  };
}

