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
      .select('id, full_name, phone, created_at, is_admin, is_active, deleted_at');
    
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

    // Fetch order counts for each user
    const usersWithOrderCounts = await Promise.all(
      (users || []).map(async (user: any) => {
        try {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          return {
            ...user,
            total_orders: count || 0,
            isAdmin: user.is_admin === true
          };
        } catch (err) {
          return {
            ...user,
            total_orders: 0,
            isAdmin: user.is_admin === true
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
