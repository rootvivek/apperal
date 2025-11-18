// Application-wide constants

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  VERY_LONG: 86400,
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB for images
  VALID_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
} as const;

// Image processing settings
export const IMAGE_SETTINGS = {
  MAX_DIMENSION: 2000,
  WEBP_QUALITY: 85,
  WEBP_EFFORT: 6,
} as const;

// Navigation cache
export const NAVIGATION_CACHE = {
  KEY: 'navigation_categories',
  TTL: 10 * 60 * 1000, // 10 minutes
} as const;

// Order statuses
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  PAID: 'paid',
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  COD: 'cod',
  UPI: 'upi',
  DEBIT_CARD: 'debit_card',
  RAZORPAY: 'razorpay',
} as const;

// Product display limits
export const PRODUCT_LIMITS = {
  HOME_PAGE: 20,
  CATEGORY_PAGE: 20,
  DEFAULT: 20,
} as const;

