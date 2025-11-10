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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://ugzyijiuhchxbuiooclv.supabase.co https://api.razorpay.com https://*.razorpay.com https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://www.google.com https://www.google-analytics.com",
              "img-src 'self' data: https://*.supabase.co",
              "frame-src 'self' https://*.razorpay.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
