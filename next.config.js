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
  // ESLint configuration moved to eslint.config.js or .eslintrc.json
  // If you need to ignore ESLint during builds, configure it in your ESLint config file
}

module.exports = nextConfig
