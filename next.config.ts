
import type {NextConfig} from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const isProduction = process.env.NODE_ENV === 'production';

const withPWA = withPWAInit({
  dest: 'public',
  disable: !isProduction,
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
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
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  webpack: (config) => {
    // This is to prevent an error with jsmediatags during production builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react-native-fs': false,
    };
    return config;
  }
};

export default withPWA(nextConfig);
