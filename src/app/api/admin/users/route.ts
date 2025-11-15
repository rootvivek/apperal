import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { createServerClient } from '@/lib/supabase/server';

async function handler(request: NextRequest, { userId }: { userId: string }) {
  try {
    const supabase = createServerClient(); // Uses service role key, bypasses RLS
    
    // Get query parameter to determine if we want deleted users
    // For POST requests, query params are in the URL
    const url = new URL(request.url);
    const includeDeleted = url.searchParams.get('deleted') === 'true';
    
    // Build query based on whether we want deleted or active users
    let query = supabase
      .from('user_profiles')
      .select('id, email, full_name, phone, created_at, user_number, is_active, deleted_at');
    
    if (includeDeleted) {
      // Get only deleted users (deleted_at is not null)
      // PostgREST syntax: use .not() with 'is' operator
      query = query.not('deleted_at', 'is', null);
    } else {
      // Get only active (non-deleted) users
      query = query.is('deleted_at', null);
    }
    
    // Apply ordering after filtering
    query = query.order('created_at', { ascending: false });
    
    const { data: users, error: usersError } = await query;
    
    if (usersError) {
      const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Failed to fetch users'
        : `Failed to fetch users: ${usersError.message}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Admin phone number - must match AdminGuard
    const ADMIN_PHONE = process.env.ADMIN_PHONE;
    if (!ADMIN_PHONE) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Fetch order counts for each user and check admin status
    const usersWithOrderCounts = await Promise.all(
      (users || []).map(async (user: any) => {
        try {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          // Check if user is admin based on phone number (last 10 digits)
          const userPhone = user.phone || '';
          const normalizedUserPhone = userPhone.replace(/\D/g, '');
          const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
          const userLast10 = normalizedUserPhone.slice(-10);
          const adminLast10 = normalizedAdminPhone.slice(-10);
          const isAdmin = userLast10 === adminLast10 && userLast10.length === 10;
          
          return {
            ...user,
            total_orders: count || 0,
            isAdmin
          };
        } catch (err) {
          // Check admin status even if order count fails (last 10 digits)
          const userPhone = user.phone || '';
          const normalizedUserPhone = userPhone.replace(/\D/g, '');
          const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
          const userLast10 = normalizedUserPhone.slice(-10);
          const adminLast10 = normalizedAdminPhone.slice(-10);
          const isAdmin = userLast10 === adminLast10 && userLast10.length === 10;
          
          return {
            ...user,
            total_orders: 0,
            isAdmin
          };
        }
      })
    );

    return NextResponse.json({ users: usersWithOrderCounts });
  } catch (error: any) {
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : `Internal server error: ${error.message}`;
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler, { rateLimit: { windowMs: 60000, maxRequests: 60 } });
export const POST = withAdminAuth(handler, { rateLimit: { windowMs: 60000, maxRequests: 60 } });
