import { z } from 'zod';
import { normalizePhone, validatePhone } from '@/utils/phone';

/**
 * Common validation schemas
 */
export const schemas = {
  // Accept both UUID (Supabase) and Firebase user IDs (alphanumeric strings)
  userId: z.string().min(1, 'User ID is required').refine(
    (val) => {
      // Accept UUID format (Supabase) or Firebase user ID format (alphanumeric, 20-28 chars)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const isFirebaseId = /^[a-zA-Z0-9]{20,28}$/.test(val);
      return isUUID || isFirebaseId;
    },
    { message: 'Invalid user ID format' }
  ),
  productId: z.string().uuid('Invalid product ID format'),
  phone: z.string().refine((val) => {
    // Use unified phone validation
    const normalized = normalizePhone(val);
    const validation = validatePhone(normalized);
    return validation.isValid;
  }, { message: 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9' }),
  url: z.string().url('Invalid URL format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
};

/**
 * Validate request body against a schema
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // ZodError has an 'issues' property, not 'errors'
      const firstIssue = error.issues[0];
      return { success: false, error: firstIssue?.message || 'Validation failed' };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize HTML (basic - use a library like DOMPurify for production)
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - in production, use DOMPurify or similar
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
}

