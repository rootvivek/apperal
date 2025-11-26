import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";
  const pathname = request.nextUrl.pathname;

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  /* ─────────────── CSP ─────────────── */
  // Set CSP for both dev and production (must be before early return)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://apis.google.com https://www.google-analytics.com https://verify.msg91.com https://hcaptcha.com https://*.hcaptcha.com",
    "script-src-elem 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://apis.google.com https://www.google-analytics.com https://verify.msg91.com https://hcaptcha.com https://*.hcaptcha.com",
    "style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com https://hcaptcha.com https://*.hcaptcha.com",
    "style-src-elem 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com https://hcaptcha.com https://*.hcaptcha.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://*.razorpay.com https://verify.msg91.com https://control.msg91.com https://www.google.com https://www.google-analytics.com https://hcaptcha.com https://*.hcaptcha.com https://api.hcaptcha.com https://api2.hcaptcha.com",
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://www.gstatic.com https://hcaptcha.com https://*.hcaptcha.com",
    "frame-ancestors 'self' https://www.google.com",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  /* ─────────────── CACHING LOGIC ─────────────── */
  if (isDev) {
    // 🚫 Disable caching in development = live updates
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  }

  // ➤ Production: apply caching logic
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i)) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (pathname.match(/\.(css|js)$/i)) {
    response.headers.set("Cache-Control", "public, max-age=31536000, stale-while-revalidate=86400");
  } else if (
    pathname.includes("/storage/") ||
    pathname.includes("/product-images/") ||
    pathname.includes("/category-images/") ||
    pathname.includes("/subcategory-images/")
  ) {
    response.headers.set("Cache-Control", "public, max-age=31536000, stale-while-revalidate=604800");
  } else if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin")) {
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  } else if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

  // Redirect HTTP → HTTPS in production
  if (!isDev) {
    const proto = request.headers.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      return NextResponse.redirect(url, 301);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
