// See https://nextjs.org/docs/app/api-reference/config/next-config-js

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
    minimumCacheTTL: 86400, // Cache images for 24 hours
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
        ],
      },
    ];
  },
}

module.exports = nextConfig
