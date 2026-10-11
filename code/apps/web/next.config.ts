import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    // httpxy forwards the incoming headers, including x-forwarded-proto, and sets
    // x-forwarded-host from the browser Host. middleware.ts also sets x-ankanu-edge-*.
    return [{ source: '/v1/:path*', destination: 'http://api:3000/v1/:path*' }]
  },
}

export default nextConfig
