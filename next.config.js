// See https://nextjs.org/docs/app/api-reference/config/next-config-js

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Enable source maps for better debugging (only in development)
  productionBrowserSourceMaps: false, // Set to true if you need source maps in production
  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ugzyijiuhchxbuiooclv.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Disable image optimization for Netlify
    minimumCacheTTL: 31536000, // Cache images for 1 year
    formats: ['image/webp', 'image/avif'], // Prefer modern formats
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://www.google-analytics.com",
              "script-src-elem 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://ugzyijiuhchxbuiooclv.supabase.co https://api.razorpay.com https://*.razorpay.com https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://www.google.com https://www.google-analytics.com",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://www.gstatic.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // Cache static assets with longer TTL
        source: '/:path*\\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache CSS and JS files
        source: '/:path*\\.(css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
