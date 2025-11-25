/**
 * Utility for handling API responses with consistent error handling
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

/**
 * Parses and validates an API response
 * @param response - The fetch Response object
 * @param errorMessage - Custom error message prefix
 * @returns Parsed response data
 * @throws Error if response is not ok or success is false
 */
export async function handleApiResponse<T = any>(
  response: Response,
  errorMessage: string = 'Request failed'
): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `${errorMessage}: ${response.status}`);
  }

  if (data.success === false) {
    throw new Error(data.error || data.details || `${errorMessage}: Operation failed`);
  }

  return data as T;
}

