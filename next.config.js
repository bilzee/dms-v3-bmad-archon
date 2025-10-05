const pwaConfig = require('./pwa.config.js');
const currentConfig = pwaConfig.getCurrentConfig();
const cacheConfig = pwaConfig.getCacheConfig();

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: !pwaConfig.shouldEnablePWA(),
  register: currentConfig.serviceWorker.register,
  skipWaiting: currentConfig.serviceWorker.skipWaiting,
  scope: currentConfig.serviceWorker.scope,
  runtimeCaching: [
    {
      urlPattern: /^https?.*\/api\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: cacheConfig.apiCacheTime,
        },
      },
    },
    {
      urlPattern: /^https?.*\/entities\/.*$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'entities-cache',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (entities don't change often)
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: cacheConfig.assetCacheTime,
        },
      },
    },
  ],
  fallbacks: {
    document: '/offline.html',
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    PWA_ENABLED: pwaConfig.shouldEnablePWA().toString(),
    PWA_ENVIRONMENT: process.env.NODE_ENV,
  },
};

module.exports = withPWA(nextConfig);