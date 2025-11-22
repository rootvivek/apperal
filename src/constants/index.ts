/**
 * Application-wide constants
 * 
 * This file contains all shared constants used across the application.
 * All TTL values are in SECONDS for consistency.
 */

/**
 * Cache durations in seconds
 * Used for various caching strategies throughout the application
 */
export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

/**
 * File upload limits
 * Defines maximum file sizes and allowed image types
 */
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB for images
  VALID_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
} as const;

/**
 * Image processing settings
 * Configuration for image optimization and conversion
 */
export const IMAGE_SETTINGS = {
  MAX_DIMENSION: 2000,
  WEBP_QUALITY: 85,
  WEBP_EFFORT: 6,
} as const;

/**
 * Navigation cache configuration
 * TTL is in seconds (converted from milliseconds for consistency)
 */
export const NAVIGATION_CACHE = {
  KEY: 'navigation_categories',
  TTL: 600, // 10 minutes in seconds (was 10 * 60 * 1000 ms)
} as const;

/**
 * Order status values
 * Represents the current state of an order in the system
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  PAID: 'paid',
  RETURNED: 'returned',
} as const;

/**
 * Payment status values
 * Represents the current state of payment processing
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const;

/**
 * Payment methods
 * Available payment options for customers
 */
export const PAYMENT_METHODS = {
  COD: 'cod',
  UPI: 'upi',
  DEBIT_CARD: 'debit_card',
  RAZORPAY: 'razorpay',
} as const;

/**
 * Currency configuration
 * Indian Rupee (INR) settings for formatting and display
 */
export const CURRENCY = {
  SYMBOL: '₹',
  CODE: 'INR',
  LOCALE: 'en-IN',
} as const;

/**
 * Product display limits per page
 * Can be overridden via environment variables:
 * - NEXT_PUBLIC_PRODUCT_LIMIT_HOME_PAGE
 * - NEXT_PUBLIC_PRODUCT_LIMIT_CATEGORY_PAGE
 * - NEXT_PUBLIC_PRODUCT_LIMIT_DEFAULT
 */
export const PRODUCT_LIMITS = {
  HOME_PAGE: parseInt(process.env.NEXT_PUBLIC_PRODUCT_LIMIT_HOME_PAGE || '20', 10),
  CATEGORY_PAGE: parseInt(process.env.NEXT_PUBLIC_PRODUCT_LIMIT_CATEGORY_PAGE || '20', 10),
  DEFAULT: parseInt(process.env.NEXT_PUBLIC_PRODUCT_LIMIT_DEFAULT || '20', 10),
} as const;

