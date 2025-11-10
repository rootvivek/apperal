import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

/**
 * Create Supabase client for server-side auth (reads from cookies)
 * Use this when you need to get the authenticated user from cookies
 * IMPORTANT: Only use in server components or API routes
 */
export async function createServerAuthClient(request?: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (request) {
    // For API routes with NextRequest
    const cookieStore = request.cookies;
    
    return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // In API routes, we can't set cookies directly
          // This is handled by the client
        },
        remove(name: string, options: any) {
          // In API routes, we can't remove cookies directly
        },
      },
    });
  }
  
  // For server components
  const cookieStore = await cookies();
  
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({
            name,
            value,
            ...options
          });
        } catch (e) {
          console.warn('Could not set cookie in server component');
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.delete(name);
        } catch (e) {
          console.warn('Could not delete cookie in server component');
        }
      },
    },
  });
}

