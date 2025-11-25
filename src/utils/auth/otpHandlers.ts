import { normalizePhone, validatePhone } from '@/utils/phone';

// Declare MSG91 types
declare global {
  interface Window {
    initSendOTP?: (config: {
      widgetId: string;
      tokenAuth: string;
      identifier: string;
      exposeMethods?: boolean;
      success?: (data: any) => void;
      failure?: (error: any) => void;
    }) => void;
  }
}

/**
 * Formats phone number for MSG91 API (adds +91 prefix)
 */
export function formatPhoneForMSG91(phone: string): string {
  const normalized = normalizePhone(phone);
  return `+91${normalized}`;
}

/**
 * Validates OTP format (must be 6 digits)
 */
export function validateOTPFormat(otp: string): { isValid: boolean; error?: string } {
  if (!/^\d{6}$/.test(otp)) {
    return {
      isValid: false,
      error: 'Invalid OTP format. Must be 6 digits.',
    };
  }
  return { isValid: true };
}

/**
 * Sends OTP using MSG91 widget
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize and validate phone number
    const normalized = normalizePhone(phone);
    const validation = validatePhone(normalized);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Invalid phone number format.',
      };
    }

    // Format for MSG91 (add +91 prefix)
    const formattedPhone = formatPhoneForMSG91(phone);
    const MSG91_WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '356b6a663761313433363531';
    const MSG91_TOKEN_AUTH = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '477219T76HjcGeGew69118f03P1';

    // Call MSG91 (script is preloaded by ClientLayout)
    if (window.initSendOTP) {
      window.initSendOTP({
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_TOKEN_AUTH,
        identifier: formattedPhone,
        exposeMethods: true,
        success: () => {},
        failure: (error: any) => console.error('❌ MSG91 OTP failed:', error),
      });
    }
    
    // Return success immediately - OTP screen shows right away
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to send OTP. Please try again.',
    };
  }
}

/**
 * Verifies OTP by calling the API
 */
export async function verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Normalize phone number (returns 10 digits)
    const normalized = normalizePhone(phone);
    
    // Validate phone number format
    const validation = validatePhone(normalized);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Invalid phone number format.',
      };
    }

    // Validate OTP format
    const otpValidation = validateOTPFormat(otp);
    if (!otpValidation.isValid) {
      return {
        success: false,
        error: otpValidation.error,
      };
    }

    // Format for MSG91 (add +91 prefix)
    const formattedPhone = formatPhoneForMSG91(phone);

    // Call API to verify OTP
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        otp: otp,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to verify OTP',
      };
    }

    return {
      success: true,
      user: result.user,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to verify OTP. Please try again.',
    };
  }
}

