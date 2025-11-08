import { z } from 'zod';

/**
 * Common validation schemas
 */
export const schemas = {
  userId: z.string().uuid('Invalid user ID format'),
  productId: z.string().uuid('Invalid product ID format'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
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

