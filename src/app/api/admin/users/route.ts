import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { createServerClient } from '@/lib/supabase/server';

async function handler(request: NextRequest, { userId }: { userId: string }) {
  try {
    const supabase = createServerClient(); // Uses service role key, bypasses RLS
    
    // Fetch all users from user_profiles (exclude deleted users)
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, phone, created_at, user_number, is_active')
      .is('deleted_at', null) // Only get non-deleted users
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      );
    }

    // Admin phone number - must match AdminGuard
    const ADMIN_PHONE = '8881765192';

    // Fetch order counts for each user and check admin status
    const usersWithOrderCounts = await Promise.all(
      (users || []).map(async (user: any) => {
        try {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          // Check if user is admin based on phone number
          const userPhone = user.phone || '';
          const normalizedUserPhone = userPhone.replace(/\D/g, '');
          const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
          const isAdmin = normalizedUserPhone === normalizedAdminPhone || 
                         normalizedUserPhone.endsWith(normalizedAdminPhone);
          
          return {
            ...user,
            total_orders: count || 0,
            isAdmin
          };
        } catch (err) {
          // Check admin status even if order count fails
          const userPhone = user.phone || '';
          const normalizedUserPhone = userPhone.replace(/\D/g, '');
          const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
          const isAdmin = normalizedUserPhone === normalizedAdminPhone || 
                         normalizedUserPhone.endsWith(normalizedAdminPhone);
          
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
    console.error('Error in users API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
export const POST = withAdminAuth(handler);

