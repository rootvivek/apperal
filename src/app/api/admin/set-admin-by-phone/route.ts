import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizePhone, validatePhone, formatPhoneForFirebase } from '@/utils/phone';
import { z } from 'zod';

const setAdminByPhoneSchema = z.object({
  phone: z.string().min(10).max(15),
  isAdmin: z.boolean(),
  setupKey: z.string().optional(), // Optional setup key for initial admin setup
});

/**
 * API endpoint to set admin status by phone number
 * This can be used for initial setup with a setup key, or by existing admins
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = setAdminByPhoneSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { phone, isAdmin, setupKey } = validation.data;

    // Check setup key if provided (for initial admin setup)
    // In production, you should set ADMIN_SETUP_KEY and require it
    const validSetupKey = process.env.ADMIN_SETUP_KEY;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (setupKey) {
      // If setup key is provided, validate it
      if (!validSetupKey || setupKey !== validSetupKey) {
        return NextResponse.json(
          { error: 'Invalid setup key' },
          { status: 403 }
        );
      }
    } else if (!isDevelopment) {
      // In production, require setup key
      return NextResponse.json(
        { error: 'Setup key required for this operation. Set ADMIN_SETUP_KEY in your environment variables.' },
        { status: 403 }
      );
    }
    // In development, allow without setup key for easier initial setup

    // Normalize and validate phone number using the standard phone utils
    const normalizedPhone = normalizePhone(phone);
    const phoneValidation = validatePhone(normalizedPhone);
    
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Format phone for database lookup (with +91 prefix as stored in database)
    const formattedPhone = formatPhoneForFirebase(normalizedPhone);

    // Use service role client for admin operations
    const adminClient = createServerClient();

    // Find user by phone number (try multiple formats)
    // Database might store it as +919876543210, +91 9876543210, or 9876543210
    // Use OR query to check all possible formats
    const { data: profile, error: findError } = await adminClient
      .from('user_profiles')
      .select('id, phone, full_name, is_admin')
      .or(`phone.eq.${formattedPhone},phone.eq.${normalizedPhone},phone.eq.+91${normalizedPhone}`)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: `Failed to find user: ${findError.message}` },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: `No user found with phone number ${phone}. Please login first to create a profile.` },
        { status: 404 }
      );
    }

    // Update is_admin status
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update admin status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isAdmin 
        ? `Admin access granted to user with phone ${phone}` 
        : `Admin access removed from user with phone ${phone}`,
      profile: updatedProfile
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update admin status' },
      { status: 500 }
    );
  }
}
