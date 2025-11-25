/**
 * Unified Phone Number Validation and Normalization System
 * 
 * This module provides a single source of truth for phone number handling
 * across the entire application. All phone numbers are normalized to a
 * 10-digit format (India) and validated using consistent rules.
 * 
 * Rules:
 * - Remove all non-numeric characters
 * - If number starts with '91' and total length > 10 → remove '91'
 * - If number starts with '0' and total length > 10 → remove '0'
 * - Final phone must be 10 digits
 * - Validation regex: /^[6-9]\d{9}$/ (must start with 6-9)
 * 
 * Display: +91 XXXXX XXXXX (UI only)
 * Storage: 9876543210 (10 digits only, never store +91)
 * Firebase: +919876543210 (with +91 prefix for OTP)
 */

/**
 * Normalizes a phone number input to a 10-digit format
 * 
 * @param input - Raw phone number input (can include +91, spaces, dashes, etc.)
 * @returns Normalized 10-digit phone number or empty string if invalid
 * 
 * @example
 * normalizePhone("+91 9876543210") → "9876543210"
 * normalizePhone("919876543210") → "9876543210"
 * normalizePhone("98765 43210") → "9876543210"
 * normalizePhone("09876543210") → "9876543210"
 * normalizePhone("1234567890") → "1234567890" (but will fail validation)
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove all non-numeric characters
  let cleaned = input.replace(/\D/g, '');
  
  // If number starts with '91' and total length > 10 → remove '91'
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // If number starts with '0' and total length > 10 → remove '0'
  if (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.substring(1);
  }
  
  // Return only first 10 digits (in case of extra digits)
  return cleaned.slice(0, 10);
}

/**
 * Validates a normalized phone number using India-specific rules
 * 
 * @param phone - Normalized 10-digit phone number
 * @returns Object with isValid boolean and optional error message
 * 
 * @example
 * validatePhone("9876543210") → { isValid: true }
 * validatePhone("1234567890") → { isValid: false, error: "Phone number must start with 6, 7, 8, or 9" }
 * validatePhone("5876543210") → { isValid: false, error: "Phone number must start with 6, 7, 8, or 9" }
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  // First normalize the input
  const normalized = normalizePhone(phone);
  
  // Check length
  if (normalized.length !== 10) {
    return {
      isValid: false,
      error: 'Phone number must be exactly 10 digits'
    };
  }
  
  // Validate using regex: must start with 6, 7, 8, or 9
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalized)) {
    return {
      isValid: false,
      error: 'Phone number must start with 6, 7, 8, or 9'
    };
  }
  
  return { isValid: true };
}

/**
 * Formats a normalized phone number for display in UI
 * Displays as: +91 XXXXX XXXXX
 * 
 * @param phone - Normalized 10-digit phone number
 * @returns Formatted phone string for display
 * 
 * @example
 * formatPhoneForDisplay("9876543210") → "+91 98765 43210"
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return phone || '';
  
  // Format as +91 XXXXX XXXXX
  return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
}

/**
 * Formats a normalized phone number for Firebase authentication
 * Adds +91 prefix automatically
 * 
 * @param phone - Normalized 10-digit phone number
 * @returns Phone number with +91 prefix for Firebase
 * 
 * @example
 * formatPhoneForFirebase("9876543210") → "+919876543210"
 */
export function formatPhoneForFirebase(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) {
    // If invalid, return as-is (Firebase will handle validation)
    return phone?.startsWith('+') ? phone : `+${phone || ''}`;
  }
  
  // Ensure it starts with +91
  if (normalized.startsWith('+91')) {
    return normalized.replace(/\s+/g, ''); // Remove spaces
  }
  
  return `+91${normalized}`;
}

/**
 * Formats phone number for input field (allows partial input)
 * Removes +91 prefix and formats as user types
 * 
 * @param input - Raw input from user
 * @returns Cleaned phone number without +91 prefix (for input field)
 * 
 * @example
 * formatPhoneForInput("+91 98765") → "98765"
 * formatPhoneForInput("9876543210") → "9876543210"
 */
export function formatPhoneForInput(input: string): string {
  // Remove +91 prefix if present
  let cleaned = input.replace(/^\+91\s*/, '');
  
  // Remove all non-numeric characters
  cleaned = cleaned.replace(/\D/g, '');
  
  // Limit to 10 digits
  return cleaned.slice(0, 10);
}

/**
 * Zod schema for phone validation (to be used in forms)
 * Automatically normalizes and validates phone numbers
 */
export const phoneSchema = {
  normalize: (val: string) => normalizePhone(val),
  validate: (val: string) => {
    const result = validatePhone(val);
    if (!result.isValid) {
      throw new Error(result.error || 'Invalid phone number');
    }
    return val;
  }
};

/**
 * Helper to check if two phone numbers are the same
 * (handles normalization automatically)
 * 
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if both normalize to the same 10-digit number
 */
export function arePhonesEqual(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (normalized1.length !== 10 || normalized2.length !== 10) {
    return false;
  }
  
  return normalized1 === normalized2;
}

