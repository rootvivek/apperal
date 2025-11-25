import { NextRequest, NextResponse } from 'next/server';
import { normalizePhone, validatePhone } from '@/utils/phone';

// MSG91 Configuration
const MSG91_WIDGET_ID = process.env.MSG91_WIDGET_ID || '356b6a663761313433363531';
const MSG91_TOKEN_AUTH = process.env.MSG91_TOKEN_AUTH || '477219T76HjcGeGew69118f03P1';

/**
 * API endpoint to send OTP via MSG91
 * This is a server-side proxy for MSG91 OTP sending
 */
export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize and validate phone number
    const normalized = normalizePhone(phone);
    const validation = validatePhone(normalized);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid phone number format.' },
        { status: 400 }
      );
    }

    // Note: MSG91 widget handles OTP sending client-side
    return NextResponse.json({
      success: true,
      phone: `+91${normalized}`,
    });
  } catch (error) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

