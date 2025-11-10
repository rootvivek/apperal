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

async function deactivateHandler(request: NextRequest, { userId: adminUserId }: { userId: string }) {
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
      console.error('Error updating user_profiles for deactivate/activate:', error);
      return NextResponse.json({ error: error.message || 'Failed to update user status' }, { status: 500 });
    }

    // Optionally revoke sessions/tokens - attempt to revoke Supabase tokens if UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId);
    if (isUUID && !isActivate) {
      try {
        // Try to revoke all refresh tokens for the user so they are forced to reauthenticate
        // Note: supabase-js may not have a dedicated revoke endpoint; deleting user would remove sessions.
        // Here we attempt to invalidate tokens via the Admin API if available (best-effort).
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (supabaseAdmin.auth && supabaseAdmin.auth.admin && supabaseAdmin.auth.admin.invalidateUser) {
          // @ts-ignore
          await supabaseAdmin.auth.admin.invalidateUser(targetUserId);
        }
      } catch (err) {
        // Not critical - continue
        // Failed to invalidate sessions but not critical
      }
    }

    // If Firebase service account configured, try to revoke refresh tokens for Firebase users
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        // Dynamically import firebase-admin if available. This is optional and will be skipped if
        // the package isn't installed. Use @ts-ignore to avoid type errors when types are not present.
        // @ts-ignore
        const firebaseAdmin = await import('firebase-admin');
        // Initialize app if not already
        if (!firebaseAdmin.apps.length) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
          firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(serviceAccount) });
        }

        // If targetUserId is not UUID, assume it's a Firebase UID and revoke tokens
        if (!isUUID) {
          try {
            await firebaseAdmin.auth().revokeRefreshTokens(targetUserId);
            // Firebase tokens revoked successfully
          } catch (fbErr) {
            // Failed to revoke Firebase tokens
          }
        }
      } catch (importErr) {
        // Firebase admin not available
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
    console.error('Error in deactivateHandler:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export const POST = withAdminAuth(deactivateHandler);
