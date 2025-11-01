
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
};

const finalConfig = withPWA(nextConfig);

// Only add the webpack config if running in production to avoid Turbopack conflicts
if (isProduction) {
  finalConfig.webpack = (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react-native-fs': false,
    };
    return config;
  };
}


export default finalConfig;
