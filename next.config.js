// See https://nextjs.org/docs/app/api-reference/config/next-config-js

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['ugzyijiuhchxbuiooclv.supabase.co'],
    unoptimized: true, // Disable image optimization for Netlify
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
