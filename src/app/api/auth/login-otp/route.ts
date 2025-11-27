import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizePhone, validatePhone } from '@/utils/phone';
import crypto from 'crypto';

// MSG91 Configuration
// Note: REST API authkey may differ from widget tokenAuth
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '479872AywSbHpYtpe69273221P1';

/**
 * API endpoint to login with MSG91 access token
 * Verifies the access token with MSG91, then creates or fetches user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, phone: phoneFromBody } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Verify access token with MSG91
    const verifyResponse = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authkey: MSG91_AUTH_KEY,
        'access-token': accessToken,
      }),
    });

    let verifyResult;
    try {
      const responseText = await verifyResponse.text();
      verifyResult = responseText ? JSON.parse(responseText) : {};
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Failed to verify access token. Please try again.' },
        { status: 500 }
      );
    }

    const isSuccess = verifyResult.type === 'success' || 
                      verifyResult.success === true ||
                      verifyResult.status === 'success' ||
                      (verifyResult.message && (
                        verifyResult.message.toLowerCase().includes('success') ||
                        verifyResult.message.toLowerCase().includes('verified')
                      ));

    if (!isSuccess) {
      const errorMsg = verifyResult.message || 
                       verifyResult.error || 
                       verifyResult.reason ||
                       'Invalid or expired access token';
      return NextResponse.json(
        { error: errorMsg },
        { status: verifyResponse.ok ? 401 : verifyResponse.status }
      );
    }

    // Extract phone from verified token response or decode from JWT
    let normalized: string;
    
    if (verifyResult.phone) {
      try {
        normalized = normalizePhone(verifyResult.phone);
      } catch {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    } else {
      // Try to decode JWT token to extract phone number
      try {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));
          const phoneFromToken = payload.phone || 
                                payload.mobile || 
                                payload.phoneNumber ||
                                payload.identifier?.replace(/^91/, '');
          
          if (phoneFromToken) {
            normalized = normalizePhone(phoneFromToken);
          } else if (phoneFromBody) {
            normalized = normalizePhone(phoneFromBody);
          } else {
            return NextResponse.json(
              { error: 'Phone number not found. Please try again.' },
              { status: 400 }
            );
          }
        } else if (phoneFromBody) {
          normalized = normalizePhone(phoneFromBody);
        } else {
          return NextResponse.json(
            { error: 'Phone number not found. Please try again.' },
            { status: 400 }
          );
        }
      } catch {
        if (phoneFromBody) {
          try {
            normalized = normalizePhone(phoneFromBody);
          } catch {
            return NextResponse.json(
              { error: 'Invalid phone number format' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Phone number not found. Please try again.' },
            { status: 400 }
          );
        }
      }
    }

    const validation = validatePhone(normalized);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid phone number format.' },
        { status: 400 }
      );
    }

    const formattedPhone = `+91${normalized}`;

    // Get Supabase client
    const supabase = await createServerClient();

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, phone, full_name, deleted_at, is_active')
      .eq('phone', formattedPhone)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check user. Please try again.' },
        { status: 500 }
      );
    }

    let user;

    if (existingUser) {
      if (existingUser.deleted_at) {
        return NextResponse.json(
          { error: 'Your account has been deleted. Please contact support.' },
          { status: 403 }
        );
      }

      if (existingUser.is_active === false) {
        return NextResponse.json(
          { error: 'Your account is inactive. Please contact support.' },
          { status: 403 }
        );
      }
      user = {
        id: existingUser.id,
        phone: existingUser.phone,
        user_metadata: {
          full_name: existingUser.full_name || null,
          phone: existingUser.phone,
        },
      };
    } else {
      // Create new user
      // Double-check if phone is already in use (race condition protection)
      const { data: phoneCheck } = await supabase
        .from('user_profiles')
        .select('id, phone, full_name, deleted_at, is_active')
        .eq('phone', formattedPhone)
        .maybeSingle();

      if (phoneCheck && !phoneCheck.deleted_at && phoneCheck.is_active !== false) {
        // Phone already exists and is active - return existing user
        user = {
          id: phoneCheck.id,
          phone: phoneCheck.phone,
          user_metadata: {
            full_name: phoneCheck.full_name || null,
            phone: phoneCheck.phone,
          },
        };
      } else {
        // If soft-deleted profile exists, hard delete it first
        if (phoneCheck?.deleted_at) {
          await supabase.from('user_profiles').delete().eq('id', phoneCheck.id);
        }

        const userId = crypto.randomUUID();
        
        const { data: newUser, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            phone: formattedPhone,
            full_name: 'User',
          })
          .select('id, phone, full_name, deleted_at, is_active')
          .single();

        if (createError) {
          // Handle unique constraint violations
          const isUniqueConstraint = 
            createError.code === '23505' || 
            createError.message?.includes('unique') || 
            createError.message?.includes('duplicate') ||
            createError.message?.includes('user_profiles_phone_key');

          if (isUniqueConstraint) {
            // Try to fetch existing user (race condition)
            const { data: existingUserAfterInsert } = await supabase
              .from('user_profiles')
              .select('id, phone, full_name, deleted_at, is_active')
              .eq('phone', formattedPhone)
              .maybeSingle();
            
            if (existingUserAfterInsert && !existingUserAfterInsert.deleted_at && existingUserAfterInsert.is_active !== false) {
              user = {
                id: existingUserAfterInsert.id,
                phone: existingUserAfterInsert.phone,
                user_metadata: {
                  full_name: existingUserAfterInsert.full_name || null,
                  phone: existingUserAfterInsert.phone,
                },
              };
            } else {
              return NextResponse.json(
                { error: 'This phone number is already registered. Please try logging in instead.' },
                { status: 409 }
              );
            }
          } else {
            return NextResponse.json(
              { error: 'Failed to create user. Please try again.' },
              { status: 500 }
            );
          }
        } else if (newUser) {
          user = {
            id: newUser.id,
            phone: newUser.phone,
            user_metadata: {
              full_name: newUser.full_name || null,
              phone: newUser.phone,
            },
          };
        } else {
          return NextResponse.json(
            { error: 'Failed to create user. Please try again.' },
            { status: 500 }
          );
        }
      }
    }
    return NextResponse.json({
      success: true,
      user: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to login. Please try again.' },
      { status: 500 }
    );
  }
}

