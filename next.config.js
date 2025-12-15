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
  webpack: (config, { isServer, dev }) => {
    // Only modify CSS extraction in production builds
    if (!isServer && !dev) {
      // Client-side webpack configuration for production only
      const MiniCssExtractPlugin = require('mini-css-extract-plugin');
      
      // Add MiniCssExtractPlugin if not already present
      const hasPlugin = config.plugins.some(plugin => 
        plugin instanceof MiniCssExtractPlugin
      );
      
      if (!hasPlugin) {
        config.plugins.push(new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash].css',
          chunkFilename: 'static/css/[name].[contenthash].chunk.css',
        }));
      }
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);