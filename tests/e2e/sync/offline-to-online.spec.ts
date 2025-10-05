import { test, expect, Page } from '@playwright/test';

// Mock data for testing
const mockAssessmentData = {
  assessmentType: 'rapid',
  responses: {
    question1: 'Test response 1',
    question2: 'Test response 2'
  },
  gpsLocation: {
    latitude: 9.0579,
    longitude: 7.4951,
    accuracy: 10
  }
};

const mockResponseData = {
  responseType: 'emergency',
  status: 'planned',
  resources: ['ambulance', 'medical_team'],
  estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
};

test.describe('Offline-to-Online Sync Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Initialize the sync system
    await page.evaluate(() => {
      // This would normally be done by the app initialization
      return (window as any).initializeSync?.();
    });
  });

  test('should queue items offline and sync when online', async () => {
    // Step 1: Simulate going offline
    await page.context().setOffline(true);
    
    // Verify offline status
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();
    await expect(offlineIndicator).toContainText('Offline');

    // Step 2: Create data while offline
    await page.evaluate((assessmentData) => {
      // Add assessment to offline queue
      return (window as any).syncEngine?.addToQueue(
        'assessment',
        'create',
        'test_entity_1',
        assessmentData,
        8 // High priority
      );
    }, mockAssessmentData);

    await page.evaluate((responseData) => {
      // Add response to offline queue
      return (window as any).syncEngine?.addToQueue(
        'response',
        'create',
        'test_entity_2',
        responseData,
        5 // Normal priority
      );
    }, mockResponseData);

    // Step 3: Verify items are queued
    const syncQueue = page.locator('[data-testid="sync-queue"]');
    await expect(syncQueue).toBeVisible();
    
    const queueItems = page.locator('[data-testid="queue-item"]');
    await expect(queueItems).toHaveCount(2);

    // Check queue status shows pending items
    const queueStatus = page.locator('[data-testid="queue-status"]');
    await expect(queueStatus).toContainText('2 pending');

    // Step 4: Verify sync doesn't happen while offline
    const syncButton = page.locator('[data-testid="manual-sync-button"]');
    await expect(syncButton).toBeDisabled();

    // Step 5: Go back online
    await page.context().setOffline(false);

    // Wait for online detection
    await page.waitForFunction(() => navigator.onLine);

    // Verify online status
    const onlineIndicator = page.locator('[data-testid="sync-indicator"]');
    await expect(onlineIndicator).toBeVisible();
    
    // Step 6: Trigger manual sync
    await syncButton.click();

    // Wait for sync to complete
    await page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="sync-indicator"]');
      return indicator && !indicator.textContent?.includes('Syncing');
    }, { timeout: 10000 });

    // Step 7: Verify sync results
    const syncIndicator = page.locator('[data-testid="sync-indicator"]');
    await expect(syncIndicator).toContainText('Synced');

    // Queue should be empty after successful sync
    await expect(queueStatus).toContainText('All synced');
    
    // Queue items should be removed
    await expect(queueItems).toHaveCount(0);
  });

  test('should handle sync conflicts automatically', async () => {
    // Step 1: Create conflicting data
    await page.evaluate(() => {
      // Simulate a conflict by creating data with an old version number
      return (window as any).syncEngine?.addToQueue(
        'assessment',
        'update',
        'conflicting_entity',
        {
          id: 'conflicting_entity',
          value: 'local_value',
          version: 1, // Old version to trigger conflict
          lastModified: new Date('2024-01-01T10:00:00Z').toISOString()
        },
        9 // High priority
      );
    });

    // Step 2: Mock server response with conflict
    await page.route('**/api/v1/sync/batch', async (route) => {
      const response = [
        {
          offlineId: 'conflicting_entity',
          serverId: 'server_123',
          status: 'conflict',
          message: 'Version conflict detected',
          conflictData: {
            id: 'conflicting_entity',
            value: 'server_value',
            version: 2,
            lastModified: new Date('2024-01-01T11:00:00Z').toISOString()
          }
        }
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Step 3: Trigger sync
    const syncButton = page.locator('[data-testid="manual-sync-button"]');
    await syncButton.click();

    // Step 4: Wait for conflict resolution
    await page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="sync-indicator"]');
      return indicator && !indicator.textContent?.includes('Syncing');
    }, { timeout: 10000 });

    // Step 5: Verify conflict was resolved
    const conflictNotification = page.locator('[data-testid="conflict-resolved"]');
    await expect(conflictNotification).toBeVisible();
    await expect(conflictNotification).toContainText('1 conflicts were resolved automatically');

    // Queue should be clear
    const queueStatus = page.locator('[data-testid="queue-status"]');
    await expect(queueStatus).toContainText('All synced');
  });

  test('should handle sync failures with retry', async () => {
    // Step 1: Add item to queue
    await page.evaluate(() => {
      return (window as any).syncEngine?.addToQueue(
        'assessment',
        'create',
        'failing_entity',
        { id: 'failing_entity', data: 'test' },
        5
      );
    });

    // Step 2: Mock server to return failure
    let requestCount = 0;
    await page.route('**/api/v1/sync/batch', async (route) => {
      requestCount++;
      
      if (requestCount < 3) {
        // Fail first 2 attempts
        const response = [
          {
            offlineId: 'failing_entity',
            serverId: '',
            status: 'failed',
            message: 'Temporary server error'
          }
        ];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      } else {
        // Succeed on 3rd attempt
        const response = [
          {
            offlineId: 'failing_entity',
            serverId: 'server_success_123',
            status: 'success',
            message: 'Synced successfully after retry'
          }
        ];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      }
    });

    // Step 3: Trigger initial sync (will fail)
    const syncButton = page.locator('[data-testid="manual-sync-button"]');
    await syncButton.click();

    // Wait for first failure
    await page.waitForTimeout(1000);

    // Step 4: Verify retry scheduling
    const queueStatus = page.locator('[data-testid="queue-status"]');
    await expect(queueStatus).toContainText('1 pending'); // Still in queue for retry

    // Step 5: Wait for automatic retry (or trigger manual retry)
    const retryButton = page.locator('[data-testid="retry-failed-button"]');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }

    // Step 6: Wait for eventual success
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="queue-status"]');
      return status && status.textContent?.includes('All synced');
    }, { timeout: 15000 });

    // Verify final success
    const syncIndicator = page.locator('[data-testid="sync-indicator"]');
    await expect(syncIndicator).toContainText('Synced');
  });

  test('should show sync progress during large batches', async () => {
    // Step 1: Add multiple items to create a larger sync batch
    await page.evaluate(() => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          (window as any).syncEngine?.addToQueue(
            'assessment',
            'create',
            `entity_${i}`,
            { id: `entity_${i}`, data: `test_data_${i}` },
            5
          )
        );
      }
      return Promise.all(promises);
    });

    // Step 2: Mock server with delayed response to see progress
    await page.route('**/api/v1/sync/batch', async (route) => {
      // Delay response to show progress
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = Array.from({ length: 10 }, (_, i) => ({
        offlineId: `entity_${i}`,
        serverId: `server_${i}`,
        status: 'success',
        message: 'Synced successfully'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Step 3: Trigger sync and verify progress indication
    const syncButton = page.locator('[data-testid="manual-sync-button"]');
    await syncButton.click();

    // Step 4: Verify sync progress is shown
    const progressBar = page.locator('[data-testid="sync-progress"]');
    await expect(progressBar).toBeVisible();

    const syncStatus = page.locator('[data-testid="sync-status"]');
    await expect(syncStatus).toContainText('Syncing');

    // Step 5: Wait for completion
    await page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="sync-indicator"]');
      return indicator && !indicator.textContent?.includes('Syncing');
    }, { timeout: 15000 });

    // Step 6: Verify completion
    await expect(syncStatus).toContainText('Synced 10 items successfully');
    await expect(progressBar).not.toBeVisible();
  });

  test('should maintain queue priority during sync', async () => {
    // Step 1: Add items with different priorities
    await page.evaluate(() => {
      const promises = [
        (window as any).syncEngine?.addToQueue('assessment', 'create', 'low_priority', { data: 'low' }, 2),
        (window as any).syncEngine?.addToQueue('assessment', 'create', 'high_priority', { data: 'high' }, 9),
        (window as any).syncEngine?.addToQueue('assessment', 'create', 'medium_priority', { data: 'medium' }, 5)
      ];
      return Promise.all(promises);
    });

    // Step 2: Mock server to capture sync order
    const syncOrder: string[] = [];
    await page.route('**/api/v1/sync/batch', async (route) => {
      const request = await route.request().postDataJSON();
      
      // Record the order of entities being synced
      request.changes.forEach((change: any) => {
        syncOrder.push(change.entityUuid);
      });
      
      const response = request.changes.map((change: any) => ({
        offlineId: change.offlineId || change.entityUuid,
        serverId: `server_${change.entityUuid}`,
        status: 'success',
        message: 'Synced successfully'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Step 3: Trigger sync
    const syncButton = page.locator('[data-testid="manual-sync-button"]');
    await syncButton.click();

    // Step 4: Wait for completion
    await page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="sync-indicator"]');
      return indicator && !indicator.textContent?.includes('Syncing');
    }, { timeout: 10000 });

    // Step 5: Verify priority order (high -> medium -> low)
    expect(syncOrder).toEqual(['high_priority', 'medium_priority', 'low_priority']);
  });
});

test.describe('Sync Queue Management UI', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/sync-queue'); // Assuming there's a dedicated sync queue page
    await page.waitForLoadState('networkidle');
  });

  test('should display queue metrics correctly', async () => {
    // Add some test items
    await page.evaluate(() => {
      const promises = [
        (window as any).syncEngine?.addToQueue('assessment', 'create', 'entity_1', {}, 5),
        (window as any).syncEngine?.addToQueue('response', 'update', 'entity_2', {}, 3),
        (window as any).syncEngine?.addToQueue('entity', 'delete', 'entity_3', {}, 8)
      ];
      return Promise.all(promises);
    });

    // Verify metrics display
    const totalMetric = page.locator('[data-testid="metric-total"]');
    await expect(totalMetric).toContainText('3');

    const pendingMetric = page.locator('[data-testid="metric-pending"]');
    await expect(pendingMetric).toContainText('3');

    const typeBreakdown = page.locator('[data-testid="type-breakdown"]');
    await expect(typeBreakdown).toContainText('assessment: 1');
    await expect(typeBreakdown).toContainText('response: 1');
    await expect(typeBreakdown).toContainText('entity: 1');
  });

  test('should allow manual queue item management', async () => {
    // Add a test item
    await page.evaluate(() => {
      return (window as any).syncEngine?.addToQueue(
        'assessment',
        'create',
        'manageable_entity',
        { data: 'test' },
        5
      );
    });

    // Find the queue item
    const queueItem = page.locator('[data-testid="queue-item"]').first();
    await expect(queueItem).toBeVisible();

    // Test priority change
    const priorityInput = queueItem.locator('[data-testid="priority-input"]');
    await priorityInput.fill('9');
    await priorityInput.press('Enter');

    // Verify priority was updated
    await expect(queueItem).toContainText('Priority 9');

    // Test item removal
    const removeButton = queueItem.locator('[data-testid="remove-item-button"]');
    await removeButton.click();

    // Confirm removal
    const confirmButton = page.locator('[data-testid="confirm-remove"]');
    await confirmButton.click();

    // Verify item was removed
    await expect(queueItem).not.toBeVisible();
  });
});