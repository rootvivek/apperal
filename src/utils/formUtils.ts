/**
 * Form utility functions for handling empty values and database constraints
 */

/**
 * Converts empty strings to null for database fields that allow NULL
 * @param value - The value to convert
 * @returns null if empty/whitespace, otherwise the trimmed string
 */
export const toNullIfEmpty = (value: string | undefined | null): string | null => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Converts empty strings to empty string for database fields with NOT NULL constraints
 * Used for optional fields that must be empty string instead of null
 * @param value - The value to convert
 * @returns empty string if empty/whitespace, otherwise the trimmed string
 */
export const toEmptyIfEmpty = (value: string | undefined | null): string => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed === '' ? '' : trimmed;
};

