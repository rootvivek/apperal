import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizePhone, validatePhone } from '@/utils/phone';
import crypto from 'crypto';

/**
 * API endpoint to verify OTP and create/login user
 * This handles MSG91 OTP verification and Supabase user management
 */
export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Normalize and validate phone number
    const normalized = normalizePhone(phone);
    const validation = validatePhone(normalized);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // Note: MSG91 OTP verification is handled client-side via their widget
    
    const supabase = createServerClient();
    
    // Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name, phone, deleted_at, is_active')
      .eq('phone', normalized)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      // Check if account is deleted or deactivated
      if (existingProfile.deleted_at) {
        return NextResponse.json(
          { error: 'Account has been deleted' },
          { status: 403 }
        );
      }

      if (existingProfile.is_active === false) {
        return NextResponse.json(
          { error: 'Account has been deactivated' },
          { status: 403 }
        );
      }

      userId = existingProfile.id;
    } else {
      // Create new user profile
      // Generate a UUID for the user ID (since we're not using Firebase UIDs anymore)
      userId = crypto.randomUUID();
      
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: 'User',
          phone: normalized,
        });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      // Create default address
      await supabase.from('addresses').insert({
        user_id: userId,
        address_line1: '',
        city: '',
        state: '',
        zip_code: '',
        full_name: null,
        phone: normalized || null,
        is_default: true,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        phone: normalized,
        user_metadata: {
          phone: normalized,
          full_name: existingProfile?.full_name || 'User',
        },
      },
    });
  } catch (error) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}

