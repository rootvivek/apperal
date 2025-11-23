import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { z } from 'zod';

const setAdminSchema = z.object({
  userId: z.string().uuid(),
  isAdmin: z.boolean(),
});

async function setAdminHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
  try {
    const body = await request.json();
    
    const validation = setAdminSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId, isAdmin } = validation.data;

    // Use service role client for admin operations
    const { createServerClient } = await import('@/lib/supabase/server');
    const adminClient = createServerClient();

    // Update is_admin in user_profiles table (for Firebase phone auth)
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      // If profile doesn't exist, create it
      if (updateError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await adminClient
          .from('user_profiles')
          .insert({
            id: userId,
            is_admin: isAdmin,
            full_name: 'User',
            phone: null,
          })
          .select()
          .single();

        if (createError) {
          return NextResponse.json(
            { error: `Failed to create profile: ${createError.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: isAdmin ? 'User granted admin access' : 'User admin access removed',
          profile: newProfile
        });
      }

      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isAdmin ? 'User granted admin access' : 'User admin access removed',
      profile: updatedProfile
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update admin status' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(setAdminHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 10 },
});

