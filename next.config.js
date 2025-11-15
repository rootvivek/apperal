// See https://nextjs.org/docs/app/api-reference/config/next-config-js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone output for Netlify - use Netlify Next.js plugin instead
  // output: 'standalone',
  // Enable source maps for better debugging (only in development)
  productionBrowserSourceMaps: false, // Set to true if you need source maps in production
  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'firebase', 'razorpay'],
  },
  // Turbopack config (for development - Next.js 16 uses Turbopack by default)
  turbopack: {
    // Resolve Firebase modules to prevent HMR issues
    resolveAlias: {
      'firebase/auth': 'firebase/auth',
      'firebase/app': 'firebase/app',
    },
  },
  // Webpack optimizations (for production builds)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize client-side bundle
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Separate chunk for Supabase
            supabase: {
              name: 'supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Separate chunk for Firebase
            firebase: {
              name: 'firebase',
              test: /[\\/]node_modules[\\/]firebase[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
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
    unoptimized: false, // Enable image optimization
    minimumCacheTTL: 31536000, // Cache images for 1 year
    formats: ['image/webp', 'image/avif'], // Prefer modern formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://apis.google.com https://www.google-analytics.com",
              "script-src-elem 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.gstatic.com https://www.google.com https://apis.google.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://ugzyijiuhchxbuiooclv.supabase.co https://api.razorpay.com https://*.razorpay.com https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://www.google.com https://www.google-analytics.com",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://www.gstatic.com https://*.firebaseapp.com https://*.firebase.com",
              "frame-ancestors 'self' https://www.google.com",
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
      {
        // Cache fonts with longer TTL
        source: '/:path*\\.(woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Next.js static files
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Next.js image optimization files
        source: '/_next/image/:path*',
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
