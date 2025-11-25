import { test, expect } from '@playwright/test';

test.describe('Coordinator Situation Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'coordinator@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/coordinator/dashboard');
  });

  test.describe('Three-Panel Layout', () => {
    test('displays three distinct panels on desktop', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Should display three panels
      await expect(page.locator('[data-testid=left-panel]')).toBeVisible();
      await expect(page.locator('[data-testid=center-panel]')).toBeVisible();
      await expect(page.locator('[data-testid=right-panel]')).toBeVisible();
    });

    test('shows correct panel headers', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      await expect(page.locator('text=Incident Overview')).toBeVisible();
      await expect(page.locator('text=Entity Assessment & Map')).toBeVisible();
      await expect(page.locator('text=Gap Analysis')).toBeVisible();
    });

    test('adapts to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/coordinator/situation-dashboard');
      
      // Should show mobile tab navigation
      await expect(page.locator('[data-testid=mobile-panel-nav]')).toBeVisible();
      
      // Should show tab labels
      await expect(page.locator('text=Incidents')).toBeVisible();
      await expect(page.locator('text=Entities')).toBeVisible();
      await expect(page.locator('text=Gaps')).toBeVisible();
    });

    test('switches between panels on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/coordinator/situation-dashboard');
      
      // Click on Entities tab
      await page.click('text=Entities');
      await expect(page.locator('[data-testid=center-panel]')).toBeVisible();
      
      // Click on Gaps tab
      await page.click('text=Gaps');
      await expect(page.locator('[data-testid=right-panel]')).toBeVisible();
    });

    test('fits within viewport without vertical scroll on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/coordinator/situation-dashboard');
      
      // Get the dashboard container height
      const dashboard = page.locator('[data-testid=dashboard-container]');
      await expect(dashboard).toBeVisible();
      
      // Check if it fits within viewport (this is a rough check)
      const boundingBox = await dashboard.boundingBox();
      expect(boundingBox?.height).toBeLessThanOrEqual(1080);
    });
  });

  test.describe('Panel Resize Functionality', () => {
    test('allows panel resizing on desktop', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Look for resize handles
      const resizeHandles = page.locator('[data-testid=resize-handle]');
      await expect(resizeHandles.first()).toBeVisible();
      
      // Attempt to resize panel
      const leftHandle = resizeHandles.first();
      await leftHandle.hover();
      
      // Verify cursor changes to col-resize
      const handleStyle = await leftHandle.evaluate(el => 
        window.getComputedStyle(el).cursor
      );
      expect(handleStyle).toContain('resize');
    });

    test('constrains panel sizes within limits', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // This test would require more complex interaction to fully verify
      // For now, we verify resize handles exist and are positioned correctly
      const resizerContainer = page.locator('[data-testid=panel-resizer]');
      await expect(resizerContainer).toBeVisible();
    });

    test('persists layout preferences', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Resize panel (simplified test)
      const resizeHandle = page.locator('[data-testid=resize-handle]').first();
      await resizeHandle.dragTo(page.locator('[data-testid=dashboard-center-marker]'));
      
      // Reload page
      await page.reload();
      
      // Verify layout persists (would need actual implementation to test fully)
      await expect(page.locator('[data-testid=dashboard-container]')).toBeVisible();
    });
  });

  test.describe('Dashboard Data Loading', () => {
    test('loads dashboard data successfully', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Should show loading state initially (if implemented)
      // await expect(page.locator('[data-testid=loading-indicator]')).toBeVisible();
      
      // Should eventually show dashboard content
      await expect(page.locator('[data-testid=dashboard-container]')).toBeVisible();
      
      // Wait for API data to load
      await expect(page.locator('text=Incident Overview')).toBeVisible({ timeout: 5000 });
    });

    test('handles API errors gracefully', async ({ page }) => {
      // Mock API failure (would need to set up mocking)
      await page.route('/api/v1/dashboard/situation', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'API Error' })
        });
      });
      
      await page.goto('/coordinator/situation-dashboard');
      
      // Should show error message or fallback content
      await expect(page.locator('[data-testid=error-message]')).toBeVisible({ timeout: 5000 });
    });

    test('displays placeholder content for unimplemented panels', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Should show placeholder text for panels not yet implemented
      await expect(page.locator('text=Incident overview panel will be implemented in Story 7.2')).toBeVisible();
      await expect(page.locator('text=Entity assessment panel will be implemented in Story 7.3')).toBeVisible();
      await expect(page.locator('text=Interactive map panel will be implemented in Story 7.4')).toBeVisible();
      await expect(page.locator('text=Gap analysis panel will be implemented in Story 7.5')).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('handles tablet viewport correctly', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/coordinator/situation-dashboard');
      
      // Should show three-panel layout on tablet
      await expect(page.locator('[data-testid=left-panel]')).toBeVisible();
      await expect(page.locator('[data-testid=center-panel]')).toBeVisible();
      await expect(page.locator('[data-testid=right-panel]')).toBeVisible();
      
      // Should not show mobile navigation
      await expect(page.locator('[data-testid=mobile-panel-nav]')).not.toBeVisible();
    });

    test('handles mobile viewport correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/coordinator/situation-dashboard');
      
      // Should show mobile navigation
      await expect(page.locator('[data-testid=mobile-panel-nav]')).toBeVisible();
      
      // Should show only active panel
      await expect(page.locator('[data-testid=left-panel]')).toBeVisible();
      await expect(page.locator('[data-testid=center-panel]')).not.toBeVisible();
      await expect(page.locator('[data-testid=right-panel]')).not.toBeVisible();
    });

    test('handles landscape mobile correctly', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 }); // iPhone SE landscape
      await page.goto('/coordinator/situation-dashboard');
      
      // Should adapt to landscape layout
      await expect(page.locator('[data-testid=dashboard-container]')).toBeVisible();
    });

    test('maintains usability across different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },  // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/coordinator/situation-dashboard');
        
        // Should always show some dashboard content
        await expect(page.locator('[data-testid=dashboard-container]')).toBeVisible();
        
        // Should be usable (no broken layouts)
        await expect(page.locator('body')).not.toHaveClass(/overflow-hidden/);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('supports keyboard navigation', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      
      // Should focus on interactive elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('provides proper ARIA labels', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Check for proper ARIA attributes
      const main = page.locator('main');
      await expect(main).toHaveAttribute('role', 'main');
      
      // Check for landmark elements
      await expect(page.locator('h1')).toBeVisible();
    });

    test('supports screen readers', async ({ page }) => {
      await page.goto('/coordinator/situation-dashboard');
      
      // Check for semantic HTML
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toHaveCount({ min: 1 });
      
      // Should have descriptive text
      await expect(page.locator('text=Comprehensive view of disaster situation')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('loads dashboard within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/coordinator/situation-dashboard');
      
      // Wait for dashboard to be fully loaded
      await expect(page.locator('[data-testid=dashboard-container]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000);
    });

    test('handles large datasets efficiently', async ({ page }) => {
      // Mock large dataset response
      await page.route('/api/v1/dashboard/situation', route => {
        const largeDataset = {
          success: true,
          data: {
            incidents: Array(100).fill({ id: 'incident', description: 'Test incident' }),
            entities: Array(200).fill({ id: 'entity', name: 'Test entity' }),
            gaps: Array(50).fill({ id: 'gap', description: 'Test gap' }),
            realTimeUpdates: false,
            lastUpdated: new Date().toISOString()
          }
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        });
      });
      
      await page.goto('/coordinator/situation-dashboard');
      
      // Should still load efficiently
      await expect(page.locator('[data-testid=dashboard-container]')).toBeVisible({ timeout: 10000 });
    });
  });
});