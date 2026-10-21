import type { NextConfig } from "next";

// Trigger dev server reload to pick up updated Prisma Client schema
const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.18', '192.168.1.*', '169.254.83.107', 'localhost', '127.0.0.1'],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
  experimental: {
    cpus: 4,
    serverActions: {
      bodySizeLimit: '10mb', // Images are pre-processed by Sharp before upload; 100mb was a DoS risk
    },
    proxyClientMaxBodySize: '10mb',
  },
};

export default nextConfig;
// Force dev HMR reload
