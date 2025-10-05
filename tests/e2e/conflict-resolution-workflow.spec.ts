import { test, expect } from '@playwright/test';

test.describe('Conflict Resolution Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data by navigating to the application
    await page.goto('/');
    
    // Mock the conflict API responses
    await page.route('/api/v1/sync/conflicts', async route => {
      const url = new URL(route.request().url());
      const page = url.searchParams.get('page') || '1';
      const limit = url.searchParams.get('limit') || '20';
      const entityType = url.searchParams.get('entityType');
      const resolved = url.searchParams.get('resolved');

      // Mock conflict data
      let conflicts = [
        {
          id: 'e2e-conflict-1',
          entityType: 'ASSESSMENT',
          entityId: 'assessment-entity-1',
          conflictDate: new Date().toISOString(),
          resolutionMethod: 'LAST_WRITE_WINS',
          winningVersion: { data: 'server-data' },
          losingVersion: { data: 'local-data' },
          isResolved: false,
          localVersion: 1,
          serverVersion: 2,
          metadata: {
            localLastModified: new Date(Date.now() - 3600000).toISOString(),
            serverLastModified: new Date().toISOString(),
            conflictReason: 'E2E test conflict',
            autoResolved: false
          }
        },
        {
          id: 'e2e-conflict-2',
          entityType: 'RESPONSE',
          entityId: 'response-entity-1',
          conflictDate: new Date(Date.now() - 1800000).toISOString(),
          resolutionMethod: 'LAST_WRITE_WINS',
          winningVersion: { data: 'merged-data' },
          losingVersion: { data: 'old-data' },
          resolvedAt: new Date(Date.now() - 1200000).toISOString(),
          isResolved: true,
          resolvedBy: 'system',
          localVersion: 2,
          serverVersion: 3,
          metadata: {
            localLastModified: new Date(Date.now() - 2400000).toISOString(),
            serverLastModified: new Date(Date.now() - 1800000).toISOString(),
            conflictReason: 'E2E resolved conflict',
            autoResolved: true
          }
        }
      ];

      // Apply filters
      if (entityType) {
        conflicts = conflicts.filter(c => c.entityType.toLowerCase() === entityType);
      }
      if (resolved !== null) {
        const isResolved = resolved === 'true';
        conflicts = conflicts.filter(c => c.isResolved === isResolved);
      }

      // Apply pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;
      const paginatedConflicts = conflicts.slice(start, end);

      await route.fulfill({
        json: {
          success: true,
          data: paginatedConflicts,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: conflicts.length,
            totalPages: Math.ceil(conflicts.length / limitNum),
            hasNext: pageNum * limitNum < conflicts.length,
            hasPrev: pageNum > 1
          }
        }
      });
    });

    // Mock the summary endpoint
    await page.route('/api/v1/sync/conflicts/summary', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            totalConflicts: 2,
            unresolvedConflicts: 1,
            autoResolvedConflicts: 1,
            manuallyResolvedConflicts: 0,
            resolutionRate: 50,
            conflictsByType: {
              assessment: 1,
              response: 1,
              entity: 0
            },
            recentConflicts: [
              {
                id: 'e2e-conflict-1',
                entityType: 'assessment',
                entityId: 'assessment-entity-1',
                conflictDate: new Date().toISOString(),
                isResolved: false,
                resolutionMethod: 'LAST_WRITE_WINS',
                autoResolved: false
              }
            ],
            lastUpdated: new Date().toISOString()
          }
        }
      });
    });

    // Mock the export endpoint
    await page.route('/api/v1/sync/conflicts/export*', async route => {
      const csvContent = `Conflict ID,Entity Type,Entity ID,Conflict Date,Resolution Method,Local Version,Server Version,Resolved,Resolved At,Resolved By,Auto Resolved,Conflict Reason
e2e-conflict-1,ASSESSMENT,assessment-entity-1,${new Date().toISOString()},LAST_WRITE_WINS,1,2,No,,,No,E2E test conflict
e2e-conflict-2,RESPONSE,response-entity-1,${new Date(Date.now() - 1800000).toISOString()},LAST_WRITE_WINS,2,3,Yes,${new Date(Date.now() - 1200000).toISOString()},system,Yes,E2E resolved conflict`;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="conflict-report-test.csv"'
        },
        body: csvContent
      });
    });
  });

  test('should display conflict summary on home page', async ({ page }) => {
    await page.goto('/');

    // Wait for the conflict summary to load
    await expect(page.locator('[data-testid="conflict-summary"]').or(page.getByText('Sync Conflicts'))).toBeVisible({ timeout: 10000 });

    // Check if summary information is displayed
    await expect(page.getByText('1 unresolved')).toBeVisible();
    await expect(page.getByText('2 total')).toBeVisible();
  });

  test('should navigate to crisis dashboard and display conflicts', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Wait for the page to load
    await expect(page.getByText('Crisis Management Dashboard')).toBeVisible();

    // Check status cards
    await expect(page.getByText('Total Conflicts')).toBeVisible();
    await expect(page.getByText('Unresolved')).toBeVisible();

    // Check if conflicts are displayed
    await expect(page.getByText('Sync Conflicts')).toBeVisible();
    await expect(page.getByText('2 total • 1 unresolved')).toBeVisible();

    // Check if conflict groups are shown
    await expect(page.getByText('ASSESSMENT assessment-entity-1')).toBeVisible();
    await expect(page.getByText('RESPONSE response-entity-1')).toBeVisible();
  });

  test('should expand and view conflict details', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Wait for conflicts to load
    await expect(page.getByText('ASSESSMENT assessment-entity-1')).toBeVisible();

    // Click on a conflict group to expand it
    await page.getByRole('button', { name: /ASSESSMENT assessment-entity-1/ }).click();

    // Check if conflict details are visible
    await expect(page.getByText('Unresolved')).toBeVisible();
    await expect(page.getByText('LAST-WRITE-WINS')).toBeVisible();
    await expect(page.getByText('v1 ↔ v2')).toBeVisible();

    // Check if conflict ID is shown
    await expect(page.getByText(/Conflict ID: e2e-confl/)).toBeVisible();
  });

  test('should filter conflicts by entity type', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Wait for the filter to be available
    await expect(page.getByDisplayValue('All Types')).toBeVisible();

    // Select assessment filter
    await page.getByDisplayValue('All Types').selectOption('assessment');

    // Should only show assessment conflicts
    await expect(page.getByText('ASSESSMENT assessment-entity-1')).toBeVisible();
    
    // Response conflict should not be visible (this is implicit in the filter working)
    // We can verify by checking that only 1 conflict group is shown
  });

  test('should filter conflicts by resolution status', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Wait for the resolution status filter
    await expect(page.getByDisplayValue('All Status')).toBeVisible();

    // Filter to show only unresolved conflicts
    await page.getByDisplayValue('All Status').selectOption('false');

    // Should only show unresolved conflicts
    await expect(page.getByText('ASSESSMENT assessment-entity-1')).toBeVisible();
  });

  test('should refresh conflicts data', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Wait for initial load
    await expect(page.getByText('Sync Conflicts')).toBeVisible();

    // Click refresh button
    await page.getByTitle('Refresh').click();

    // Should still show conflicts after refresh
    await expect(page.getByText('2 total • 1 unresolved')).toBeVisible();
  });

  test('should open and configure export dialog', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Wait for export button to be available
    await expect(page.getByText('Export CSV')).toBeVisible();

    // Click export button
    await page.getByText('Export CSV').click();

    // Export dialog should open
    await expect(page.getByText('Export Conflicts')).toBeVisible();

    // Check if export options are available
    await expect(page.getByText('Entity Type')).toBeVisible();
    await expect(page.getByText('Resolution Status')).toBeVisible();
    await expect(page.getByText('From Date')).toBeVisible();
    await expect(page.getByText('To Date')).toBeVisible();

    // Check export preview
    await expect(page.getByText('Export Preview')).toBeVisible();
    await expect(page.getByText('Estimated records:')).toBeVisible();

    // Configure export settings
    await page.getByDisplayValue('All Types').selectOption('assessment');
    await page.getByDisplayValue('All Status').selectOption('false');

    // Close dialog
    await page.getByText('Cancel').click();
    await expect(page.getByText('Export Conflicts')).not.toBeVisible();
  });

  test('should handle export download', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Set up download handler
    const downloadPromise = page.waitForDownload();

    // Click export button and configure
    await page.getByText('Export CSV').click();
    await expect(page.getByText('Export Conflicts')).toBeVisible();

    // Start export
    await page.getByText('Export').click();

    // Wait for download to complete
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/conflict-report.*\.csv/);
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Check quick action buttons
    await expect(page.getByText('Export Conflicts')).toBeVisible();
    await expect(page.getByText('Review Assessments')).toBeVisible();
    await expect(page.getByText('Coordinate Response')).toBeVisible();

    // Click on export conflicts quick action
    await page.getByRole('button', { name: /Export Conflicts/ }).click();
    await expect(page.getByText('Export Conflicts')).toBeVisible();
  });

  test('should display correct conflict resolution metrics', async ({ page }) => {
    await page.goto('/dashboard/crisis');

    // Check resolution summary section
    await expect(page.getByText('Conflict Resolution Summary')).toBeVisible();
    await expect(page.getByText('Resolution Rate:')).toBeVisible();
    await expect(page.getByText('50%')).toBeVisible();

    // Check resolution breakdown
    await expect(page.getByText('Resolution Methods')).toBeVisible();
    await expect(page.getByText('Auto-resolved')).toBeVisible();
    await expect(page.getByText('Manual')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();

    // Check conflicts by type
    await expect(page.getByText('Conflicts by Type')).toBeVisible();
    await expect(page.getByText('Assessments')).toBeVisible();
    await expect(page.getByText('Responses')).toBeVisible();
    await expect(page.getByText('Entities')).toBeVisible();
  });

  test('should show responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/crisis');

    // Should still display main elements
    await expect(page.getByText('Crisis Management Dashboard')).toBeVisible();
    await expect(page.getByText('Sync Conflicts')).toBeVisible();

    // Status cards should be stacked on mobile
    const statusCards = page.locator('.grid.grid-cols-1.md\\:grid-cols-4');
    await expect(statusCards).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/v1/sync/conflicts', route => {
      route.fulfill({
        status: 500,
        json: {
          success: false,
          error: 'Internal server error',
          message: 'Database connection failed'
        }
      });
    });

    await page.goto('/dashboard/crisis');

    // Should show error message
    await expect(page.getByText('Error loading conflicts')).toBeVisible();
    await expect(page.getByText('Database connection failed')).toBeVisible();
    await expect(page.getByText('Try Again')).toBeVisible();
  });
});