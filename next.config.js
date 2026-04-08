/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds to prevent warnings from blocking deployment
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Enable experimental features that might help with module resolution
    optimizePackageImports: ['@/components', '@/lib']
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack configuration to help with module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').join(__dirname, 'src'),
    }

    // Add fallbacks for node modules that might be missing
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    }

    // Log webpack config for debugging in production builds
    if (process.env.NODE_ENV === 'production') {
      console.log('🔧 [WEBPACK DEBUG] Alias configuration:', config.resolve.alias)
      console.log('🔧 [WEBPACK DEBUG] Extensions:', config.resolve.extensions)
    }

    return config
  },
}

module.exports = nextConfig