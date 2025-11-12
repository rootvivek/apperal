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
  
  // Cache static assets aggressively
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot|css|js)$/i)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache images from Supabase storage
  else if (pathname.includes('/storage/') || pathname.includes('/product-images/') || pathname.includes('/category-images/')) {
    response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  }
  // Cache API routes that fetch public data (with shorter TTL)
  else if (pathname.startsWith('/api/') && !pathname.startsWith('/api/admin') && !pathname.startsWith('/api/orders')) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  }
  // Default cache for pages (ISR)
  else if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }
  
  // Content Security Policy (adjust based on your needs)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://www.google-analytics.com", // Allow Razorpay, Firebase, and Google reCAPTCHA scripts
    "script-src-elem 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://www.google-analytics.com", // Explicitly allow Razorpay, Firebase, and Google reCAPTCHA script elements
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com", // Allow Google Fonts and Firebase styles
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com", // Allow Google Fonts and Firebase style elements
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://api.razorpay.com https://*.razorpay.com https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://www.google.com https://www.google-analytics.com", // Allow Firebase API calls, Razorpay, and Google services
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://www.gstatic.com", // Allow Razorpay and Google reCAPTCHA iframes
    "frame-ancestors 'none'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    if (protocol !== 'https') {
      return NextResponse.redirect(
        `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
        301
      );
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

