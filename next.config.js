// See https://nextjs.org/docs/app/api-reference/config/next-config-js

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['ugzyijiuhchxbuiooclv.supabase.co'],
    unoptimized: true, // Disable image optimization for Netlify
  },
}

module.exports = nextConfig
