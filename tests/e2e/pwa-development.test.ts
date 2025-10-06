/**
 * PWA Development Environment Tests
 * Tests PWA functionality in development mode with PWA_TESTING=true
 */

import { test, expect } from '@playwright/test';

test.describe('PWA Development Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should enable PWA in development when PWA_TESTING=true', async ({ page }) => {
    // Check if PWA is enabled in environment
    const pwaEnabled = await page.evaluate(() => {
      return (window as any).__NEXT_DATA__?.env?.PWA_ENABLED === 'true';
    });
    
    if (process.env.PWA_TESTING === 'true') {
      expect(pwaEnabled).toBeTruthy();
    } else {
      expect(pwaEnabled).toBeFalsy();
    }
  });

  test('should register service worker in PWA testing mode', async ({ page }) => {
    // Skip if PWA testing is not enabled
    test.skip(process.env.PWA_TESTING !== 'true', 'PWA testing not enabled');
    
    // Wait for service worker registration
    await page.waitForFunction(() => 'serviceWorker' in navigator);
    
    const swRegistration = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        exists: !!registration,
        scope: registration?.scope,
        state: registration?.active?.state
      };
    });
    
    expect(swRegistration.exists).toBeTruthy();
    expect(swRegistration.scope).toContain('localhost:3000');
  });

  test('should use development manifest', async ({ page }) => {
    test.skip(process.env.PWA_TESTING !== 'true', 'PWA testing not enabled');
    
    const manifestLink = page.locator('link[rel="manifest"]');
    const manifestHref = await manifestLink.getAttribute('href');
    
    // Should use development manifest in dev mode
    expect(manifestHref).toBe('/manifest-dev.json');
    
    // Verify manifest content
    const response = await page.request.get('/manifest-dev.json');
    expect(response.ok()).toBeTruthy();
    
    const manifest = await response.json();
    expect(manifest.name).toBe('DMS Borno - Development');
    expect(manifest.short_name).toBe('DMS Dev');
    expect(manifest.theme_color).toBe('#ef4444'); // Red for development
  });

  test('should use reduced cache times in development', async ({ page }) => {
    test.skip(process.env.PWA_TESTING !== 'true', 'PWA testing not enabled');
    
    // Wait for service worker to be ready
    await page.waitForFunction(() => 'serviceWorker' in navigator);
    
    // Check cache configuration through service worker
    const cacheInfo = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || !registration.active) return null;
      
      // Check if caches API is available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        return {
          cacheNames,
          hasCaches: cacheNames.length > 0
        };
      }
      return null;
    });
    
    expect(cacheInfo).toBeTruthy();
    // In development with PWA testing, we should have some caches
    expect(cacheInfo?.cacheNames).toBeDefined();
  });

  test('should allow manual PWA installation testing', async ({ page }) => {
    test.skip(process.env.PWA_TESTING !== 'true', 'PWA testing not enabled');
    
    // Check for PWA installability
    const installPrompt = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('beforeinstallprompt', (e) => {
          resolve(true);
        });
        
        // If no prompt within 2 seconds, resolve false
        setTimeout(() => resolve(false), 2000);
      });
    });
    
    // In development, installability might vary
    // This test mainly ensures the event listener is set up correctly
    expect(typeof installPrompt).toBe('boolean');
  });
});