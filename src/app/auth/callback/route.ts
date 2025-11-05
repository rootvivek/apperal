import { NextRequest, NextResponse } from 'next/server'

/**
 * This route handler is kept for compatibility but the actual auth callback
 * is handled by the client-side page at /auth/callback/page.tsx
 * 
 * For PKCE flow, the code exchange must happen on the client side because
 * the code verifier is stored in the browser's session storage.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  // If there's an OAuth error, redirect to error page
  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || 'Unknown error')}`)
  }

  // Otherwise, let the client-side page handle the callback
  // The client page will read the code from the URL and exchange it
  return NextResponse.redirect(`${origin}/auth/callback?${searchParams.toString()}`)
}
