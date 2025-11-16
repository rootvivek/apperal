import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Security headers
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add caching headers for static assets
  const pathname = request.nextUrl.pathname;
  
  // Cache static assets aggressively (1 year for immutable assets)
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache CSS and JS files (1 year with revalidation)
  else if (pathname.match(/\.(css|js)$/i)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400');
  }
  // Cache images from Supabase storage (1 year with revalidation)
  else if (pathname.includes('/storage/') || pathname.includes('/product-images/') || pathname.includes('/category-images/') || pathname.includes('/subcategory-images/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=604800');
  }
  // Cache API routes that fetch public data (5 minutes with 1 hour revalidation)
  else if (pathname.startsWith('/api/') && !pathname.startsWith('/api/admin') && !pathname.startsWith('/api/orders') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/razorpay')) {
    // Different cache durations for different API types
    if (pathname.startsWith('/api/reviews')) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    } else if (pathname.startsWith('/api/wishlist')) {
      response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    }
  }
  // Default cache for pages (5 minutes with 1 hour revalidation)
  else if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  }
  
  // Content Security Policy (adjust based on your needs)
  // Note: 'unsafe-inline' is required for Razorpay and some third-party scripts
  // 'unsafe-eval' removed for better security - if Firebase requires it, consider using nonces
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://apis.google.com https://www.google-analytics.com", // Allow Razorpay, Firebase, and Google reCAPTCHA scripts (unsafe-inline required for Razorpay)
    "script-src-elem 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://apis.google.com https://www.google-analytics.com", // Explicitly allow Razorpay, Firebase, and Google reCAPTCHA script elements
    "style-src 'self' 'unsafe-inline' https://www.gstatic.com", // Allow Firebase styles
    "style-src-elem 'self' 'unsafe-inline' https://www.gstatic.com", // Allow Firebase style elements
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://*.razorpay.com https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://www.google.com https://www.google-analytics.com", // Allow Firebase API calls, Razorpay, Google services, and Supabase WebSocket
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://www.gstatic.com https://*.firebaseapp.com https://*.firebase.com", // Allow Razorpay, Google reCAPTCHA, and Firebase iframes
    "frame-ancestors 'self' https://www.google.com", // Allow Google to frame for reCAPTCHA
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    if (protocol !== 'https') {
      // Preserve query parameters and hash in redirect
      const url = request.nextUrl.clone();
      url.protocol = 'https:';
      return NextResponse.redirect(url, 301);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

