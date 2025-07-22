/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      'localhost',
      'msmebazaar.com',
      'api.msmebazaar.com',
      // Add custom domains as needed
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.msmebazaar.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  
  // Custom headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Rewrites for multi-tenant routing
  async rewrites() {
    return {
      beforeFiles: [
        // Handle custom domains
        {
          source: '/(.*)',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>.*)\\.msmebazaar\\.com',
            },
          ],
          destination: '/org/:subdomain/:path*',
        },
      ],
      afterFiles: [
        // API proxy to backend
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/:path*`,
        },
      ],
    }
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')({
          enabled: process.env.ANALYZE === 'true',
        })
        config.plugins.push(new BundleAnalyzerPlugin())
      }
      return config
    },
  }),
}

module.exports = nextConfig