import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { rateLimit } from '@/lib/middleware/rateLimit';
import { validateBody, schemas } from '@/lib/middleware/inputValidation';
import { logAdminAction } from '@/lib/middleware/adminLogging';
import { z } from 'zod';

const deleteUserSchema = z.object({
  userId: schemas.userId,
});

async function deleteUserHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    // Rate limiting - stricter for admin operations
    const rateLimitResult = rateLimit({ windowMs: 60000, maxRequests: 10 })(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateBody(deleteUserSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Prevent admin from deleting themselves
    if (userId === adminUserId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createServerClient();

    // Get user email before deletion for logging
    const { data: deletedUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    // Delete all user data EXCEPT user profile
    // Delete user's addresses
    await supabaseAdmin
      .from('addresses')
      .delete()
      .eq('user_id', userId);

    // Delete user's cart items
    const { data: userCart } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (userCart) {
      await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('cart_id', userCart.id);
      
      await supabaseAdmin
        .from('carts')
        .delete()
        .eq('id', userCart.id);
    }

    // Delete user's wishlist items
    await supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('user_id', userId);

    // Delete user's reviews
    await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('user_id', userId);

    // Delete user's orders
    await supabaseAdmin
      .from('orders')
      .delete()
      .eq('user_id', userId);

    // Soft delete: Mark user profile as deleted (keep profile, just mark as deleted)
    const { error: softDeleteError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        deleted_at: new Date().toISOString(),
        email: `deleted_${Date.now()}_${userId.substring(0, 8)}@deleted.local`,
        full_name: '[Deleted User]',
        // Keep phone number for potential account recovery or new signup detection
      })
      .eq('id', userId);

    if (softDeleteError) {
      return NextResponse.json(
        { error: `Failed to mark user as deleted: ${softDeleteError.message}` },
        { status: 500 }
      );
    }

    // Log the admin action (don't fail if logging fails)
    try {
      await logAdminAction({
        adminId: adminUserId,
        action: 'DELETE_USER',
        resourceType: 'user',
        resourceId: userId,
        details: {
          deleted_user_email: deletedUserProfile?.email || 'Unknown',
        },
        request,
      });
    } catch (logError) {
      // Don't fail the deletion if logging fails
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json(
      { success: true, message: 'User data deleted successfully. Profile marked as deleted.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}

// Export with admin authentication wrapper
export const POST = withAdminAuth(deleteUserHandler);

