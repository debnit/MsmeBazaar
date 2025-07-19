/** @type {import('next').NextConfig} */
const { withBundleAnalyzer } = require('@next/bundle-analyzer');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  env: {
    CUSTOM_KEY: 'admin-dashboard',
  },
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: `${process.env.MSME_API_URL || 'http://localhost:8001'}/admin/:path*`,
      },
      {
        source: '/api/prometheus/:path*',
        destination: `${process.env.PROMETHEUS_URL || 'http://localhost:9090'}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },
  poweredByHeader: false,
  compress: true,
};

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = bundleAnalyzer(nextConfig);