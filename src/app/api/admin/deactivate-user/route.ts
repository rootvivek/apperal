import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/middleware/adminAuth';
import { rateLimit } from '@/lib/middleware/rateLimit';
import { validateBody, schemas } from '@/lib/middleware/inputValidation';
import { logAdminAction } from '@/lib/middleware/adminLogging';
import { z } from 'zod';

const deactivateSchema = z.object({
  userId: schemas.userId,
  action: z.enum(['deactivate','activate']).optional(),
});

async function deactivateHandler(request: NextRequest, { userId: adminUserId }: { userId: string }): Promise<NextResponse> {
  try {
    const rl = rateLimit({ windowMs: 60000, maxRequests: 10 })(request);
    if (rl && !rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const validation = validateBody(deactivateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { userId: targetUserId, action } = validation.data;
    const supabaseAdmin = createServerClient();

    const isActivate = action === 'activate';
    const updates: any = {
      is_active: isActivate,
      updated_at: new Date().toISOString(),
    };
    if (!isActivate) {
      updates.deactivated_at = new Date().toISOString();
    } else {
      updates.deactivated_at = null;
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to update user status' }, { status: 500 });
    }

    // Handle session revocation
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId);
    
    // Revoke Supabase tokens for UUID users
    if (isUUID && !isActivate) {
      try {
        // @ts-ignore - Supabase admin methods
        if (supabaseAdmin.auth?.admin?.invalidateUser) {
          // @ts-ignore
          await supabaseAdmin.auth.admin.invalidateUser(targetUserId);
        }
      } catch (err) {
        // Non-critical error - continue
      }
    }

    // Handle Firebase token revocation
    if (!isUUID && !isActivate && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const { getFirebaseAdmin } = await import('@/lib/firebase/admin');
        const admin = await getFirebaseAdmin();
        
        if (admin?.auth) {
          try {
            await admin.auth().revokeRefreshTokens(targetUserId);
          } catch (fbErr) {
            // Non-critical error - continue
          }
        }
      } catch (importErr) {
        // Firebase admin not available - continue
      }
    }

    // Log admin action
    try {
      await logAdminAction({
        adminId: adminUserId,
        action: isActivate ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        resourceType: 'user',
        resourceId: targetUserId,
        details: { action },
        request,
      });
    } catch (logErr) {
      // Failed to log admin action (non-critical)
    }

    return NextResponse.json({ success: true, message: isActivate ? 'User activated' : 'User deactivated' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export const POST = withAdminAuth(deactivateHandler);
