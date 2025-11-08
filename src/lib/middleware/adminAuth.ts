import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServerAuthClient } from '@/lib/supabase/server-auth';

// Admin phone number - must match AdminGuard
const ADMIN_PHONE = '8881765192';

/**
 * Middleware to verify if the authenticated user is an admin
 * This should be used in all admin API routes
 */
export async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    let userId: string | null = null;
    
    // Try to get user from Authorization header first (for API calls from client)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
      if (!tokenError && user) {
        userId = user.id;
      }
    }
    
    // If no user from header, try to get from cookies
    if (!userId) {
      const supabaseAuth = createServerAuthClient(request);
      const { data: { user }, error: cookieError } = await supabaseAuth.auth.getUser();
      if (!cookieError && user) {
        userId = user.id;
      }
    }
    
    if (!userId) {
      return { isAdmin: false, error: 'Unauthorized - No valid session found' };
    }

    // Use service role client to verify admin status (has access to user_profiles)
    const supabaseAdmin = createServerClient();
    return await verifyUserIsAdmin(userId, supabaseAdmin);
  } catch (error: any) {
    console.error('Error verifying admin:', error);
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
    const userPhone = profile.phone || '';
    const normalizedUserPhone = userPhone.replace(/\D/g, ''); // Remove all non-digits
    const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');

    const isAdmin = normalizedUserPhone === normalizedAdminPhone || 
                   normalizedUserPhone.endsWith(normalizedAdminPhone);

    return { isAdmin, userId };
  } catch (error: any) {
    console.error('Error verifying user is admin:', error);
    return { isAdmin: false, error: error.message || 'Verification failed' };
  }
}

/**
 * Wrapper function for admin API routes
 * Usage: export const POST = withAdminAuth(async (request, { userId }) => { ... })
 */
export function withAdminAuth(
  handler: (request: NextRequest, context: { userId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const verification = await verifyAdmin(request);
    
    if (!verification.isAdmin || !verification.userId) {
      return NextResponse.json(
        { error: verification.error || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return handler(request, { userId: verification.userId });
  };
}

