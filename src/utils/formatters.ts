/**
 * Form formatting utilities
 * Safe parsing and formatting functions for form data
 */

/**
 * Safely parses a string to an integer
 * @param value - String value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 */
export function safeParseInt(value: string | undefined | null, defaultValue: number = 0): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parses a string to a float
 * @param value - String value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed float or default value
 */
export function safeParseFloat(value: string | undefined | null, defaultValue: number = 0): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Formats a number to a string with optional decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Formats a currency value to Indian Rupee format
 * @param value - Number to format
 * @returns Formatted currency string (e.g., "₹100.00")
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₹0.00';
  return `₹${value.toFixed(2)}`;
}

/**
 * Formats a date to a readable string
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options: {
    year?: 'numeric' | '2-digit';
    month?: 'long' | 'short' | 'numeric' | '2-digit';
    day?: 'numeric' | '2-digit';
    hour?: '2-digit';
    minute?: '2-digit';
    hour12?: boolean;
  } = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options);
}

/**
 * Formats a date to a short string (date only)
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US');
}

