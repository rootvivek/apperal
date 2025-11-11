import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { rateLimit } from '@/lib/middleware/rateLimit';
import { validateBody, schemas } from '@/lib/middleware/inputValidation';
import { logAdminAction } from '@/lib/middleware/adminLogging';
import { z } from 'zod';

const hardDeleteUserSchema = z.object({
  userId: schemas.userId,
});

async function hardDeleteUserHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
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
    const validation = validateBody(hardDeleteUserSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Prevent admin from hard deleting themselves
    if (userId === adminUserId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createServerClient();

    // Get user info before deletion for logging
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name, phone')
      .eq('id', userId)
      .maybeSingle();

    // Hard delete: Completely remove the user profile from database
    // This allows the phone number to be reused for new accounts
    const { error: deleteError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error hard deleting user profile:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Log the admin action
    try {
      await logAdminAction({
        adminId: adminUserId,
        action: 'HARD_DELETE_USER',
        resourceType: 'user',
        resourceId: userId,
        details: {
          deleted_user_email: userProfile?.email || 'Unknown',
          deleted_user_phone: userProfile?.phone || 'Unknown',
          note: 'User profile permanently deleted from database',
        },
        request,
      });
    } catch (logError) {
      // Don't fail the deletion if logging fails
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json(
      { success: true, message: 'User permanently deleted. Phone number can now be reused.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error hard deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to hard delete user' },
      { status: 500 }
    );
  }
}

// Export with admin authentication wrapper
export const POST = withAdminAuth(hardDeleteUserHandler);

