/**
 * Utility for creating admin API request headers
 */

/**
 * Creates headers for admin API requests with authentication
 * @param userId - The user ID to include in X-User-Id header
 * @returns Headers object with Content-Type and X-User-Id
 */
export function createAdminHeaders(userId?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  
  return headers;
}

