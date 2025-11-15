import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { rateLimit } from '@/lib/middleware/rateLimit';
import { validateBody, schemas } from '@/lib/middleware/inputValidation';
import { logAdminAction } from '@/lib/middleware/adminLogging';
import { z } from 'zod';

const reactivateUserSchema = z.object({
  userId: schemas.userId,
});

async function reactivateUserHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit({ windowMs: 60000, maxRequests: 10 })(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateBody(reactivateUserSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Create admin client with service role key
    const supabaseAdmin = createServerClient();

    // Get user info before reactivation for logging
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name, phone, deleted_at')
      .eq('id', userId)
      .maybeSingle();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!userProfile.deleted_at) {
      return NextResponse.json(
        { error: 'User is not deleted. Cannot reactivate.' },
        { status: 400 }
      );
    }

    // Reactivate: Clear deleted_at and restore account
    // Restore email and name if they were changed during deletion
    const { error: reactivateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        deleted_at: null,
        is_active: true, // Also ensure account is active
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (reactivateError) {
      console.error('Error reactivating user:', reactivateError);
      return NextResponse.json(
        { error: `Failed to reactivate user: ${reactivateError.message}` },
        { status: 500 }
      );
    }

    // Log the admin action
    try {
      await logAdminAction({
        adminId: adminUserId,
        action: 'REACTIVATE_USER',
        resourceType: 'user',
        resourceId: userId,
        details: {
          reactivated_user_email: userProfile?.email || 'Unknown',
          reactivated_user_phone: userProfile?.phone || 'Unknown',
          note: 'User account reactivated. User can now log in again.',
        },
        request,
      });
    } catch (logError) {
      // Don't fail the reactivation if logging fails
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json(
      { success: true, message: 'User account reactivated successfully. User can now log in again.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error reactivating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reactivate user' },
      { status: 500 }
    );
  }
}

// Export with admin authentication wrapper
export const POST = withAdminAuth(reactivateUserHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});
