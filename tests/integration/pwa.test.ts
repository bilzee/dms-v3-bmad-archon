/**
 * PWA Integration Tests
 * Tests PWA installation, service worker, and offline functionality
 */

import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the app successfully', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Disaster Management System');
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
  });

  test('should have PWA manifest', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
    
    // Check manifest content
    const response = await page.request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();
    
    const manifest = await response.json();
    expect(manifest.name).toBe('Disaster Management System - Borno State');
    expect(manifest.short_name).toBe('DMS Borno');
    expect(manifest.display).toBe('standalone');
  });

  test('should register service worker', async ({ page }) => {
    // Wait for service worker registration
    await page.waitForFunction(() => 'serviceWorker' in navigator);
    
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistration();
    });
    
    expect(swRegistration).toBeTruthy();
  });

  test('should show offline status when network is disabled', async ({ page, context }) => {
    // Initially should show online
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Online');
    
    // Simulate going offline
    await context.setOffline(true);
    
    // Should show offline status
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline');
  });

  test('should cache assets for offline use', async ({ page, context }) => {
    // Load page online first
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Reload page - should still work from cache
    await page.reload();
    await expect(page.locator('h1')).toContainText('Disaster Management System');
  });

  test('should load offline fallback page for non-cached routes', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate to non-cached route
    await page.goto('/non-existent-route', { waitUntil: 'networkidle' });
    
    // Should show offline fallback
    await expect(page.locator('body')).toContainText('You\'re Offline');
  });
});

test.describe('Offline Storage', () => {
  test('should initialize IndexedDB', async ({ page }) => {
    // Check if IndexedDB is available and initialized
    const dbExists = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('DisasterManagementDB');
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    });
    
    expect(dbExists).toBeTruthy();
  });

  test('should create and store test assessment offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Click create test assessment button
    await page.click('button:has-text("Create Test Assessment")');
    
    // Should show pending operation
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('pending');
    
    // Verify data is stored in IndexedDB
    const assessmentCount = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('DisasterManagementDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const transaction = db.transaction(['assessments'], 'readonly');
      const store = transaction.objectStore('assessments');
      const countRequest = store.count();
      
      return new Promise<number>((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
      });
    });
    
    expect(assessmentCount).toBeGreaterThan(0);
  });

  test('should encrypt sensitive data in storage', async ({ page }) => {
    // Create test data
    await page.click('button:has-text("Create Test Assessment")');
    
    // Check that stored data is encrypted (not plain text)
    const isEncrypted = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('DisasterManagementDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const transaction = db.transaction(['assessments'], 'readonly');
      const store = transaction.objectStore('assessments');
      const getAllRequest = store.getAll();
      
      return new Promise<boolean>((resolve) => {
        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result;
          if (records.length > 0) {
            const data = records[0].data;
            // Encrypted data should not contain readable JSON
            resolve(typeof data === 'string' && !data.includes('{'));
          }
          resolve(false);
        };
      });
    });
    
    expect(isEncrypted).toBeTruthy();
  });
});

test.describe('Sync Functionality', () => {
  test('should auto-sync when coming back online', async ({ page, context }) => {
    // Start offline and create test data
    await context.setOffline(true);
    await page.click('button:has-text("Create Test Assessment")');
    
    // Verify pending sync
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('pending');
    
    // Go back online
    await context.setOffline(false);
    
    // Should start syncing automatically
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('Syncing');
    
    // Wait for sync to complete
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('Synced');
  });

  test('should handle sync failures gracefully', async ({ page, context }) => {
    // Mock network failure for sync requests
    await page.route('**/api/**', route => route.abort());
    
    // Create test data offline
    await context.setOffline(true);
    await page.click('button:has-text("Create Test Assessment")');
    
    // Go online but with failing API
    await context.setOffline(false);
    
    // Sync should fail but app should remain functional
    await page.waitForTimeout(3000);
    await expect(page.locator('h1')).toContainText('Disaster Management System');
  });
});

test.describe('Performance', () => {
  test('should load within 3 seconds offline', async ({ page, context }) => {
    // Load page online first to cache assets
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Measure offline load time
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('h1');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile-friendly elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    
    // Check touch-friendly button sizes
    const buttonHeight = await page.locator('button').first().evaluate(el => (el as HTMLElement).offsetHeight);
    expect(buttonHeight).toBeGreaterThanOrEqual(44); // iOS minimum touch target
  });
});