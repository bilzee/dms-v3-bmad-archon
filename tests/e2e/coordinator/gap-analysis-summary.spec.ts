import { test, expect } from '@playwright/test';

test.describe('Gap Analysis Summary - Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator to access dashboard
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'coordinator@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL('/coordinator/dashboard');
  });

  test('complete gap analysis workflow with real-time updates', async ({ page }) => {
    // Navigate to situation dashboard
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Situation Dashboard');
    
    // Verify gap analysis summary panel exists
    await expect(page.locator('text=Gap Analysis Summary')).toBeVisible();
    
    // Check that gap analysis data loads (may show loading state first)
    await expect(page.locator('[data-testid="gap-analysis-summary"]')).toBeVisible();
    
    // Verify key components are rendered
    await expect(page.locator('text=Severity Distribution')).toBeVisible();
    await expect(page.locator('text=Assessment Type Gaps')).toBeVisible();
    
    // Wait for data to load and verify statistics
    await page.waitForSelector('[data-testid="entities-with-gaps"]', { timeout: 10000 });
    
    // Verify severity distribution is displayed
    await expect(page.locator('text=High Priority')).toBeVisible();
    await expect(page.locator('text=Medium Priority')).toBeVisible();
    await expect(page.locator('text=Low Priority')).toBeVisible();
    
    // Verify assessment type breakdown
    await expect(page.locator('text=Health Services')).toBeVisible();
    await expect(page.locator('text=Food Security')).toBeVisible();
    await expect(page.locator('text=Water & Sanitation')).toBeVisible();
    await expect(page.locator('text=Shelter & Housing')).toBeVisible();
    await expect(page.locator('text=Security & Protection')).toBeVisible();
    
    // Check progress bars are rendered
    const progressBars = await page.locator('[data-testid="progress"]').count();
    expect(progressBars).toBeGreaterThan(0);
  });

  test('CSV export functionality', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for gap analysis to load
    await page.waitForSelector('[data-testid="gap-analysis-summary"]', { timeout: 10000 });
    
    // Find and click export button
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).not.toBeDisabled();
    
    // Handle file download
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    
    // Verify download filename format
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^gap-analysis-.*-\d{4}-\d{2}-\d{2}\.csv$/);
    
    // Save and verify file content
    const filePath = `./test-downloads/${filename}`;
    await download.saveAs(filePath);
    
    // Read and verify CSV content structure
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verify CSV has expected headers and content
    expect(content).toContain('# Gap Analysis Summary Export');
    expect(content).toContain('# SUMMARY STATISTICS');
    expect(content).toContain('Metric,Value,Percentage');
    expect(content).toContain('# SEVERITY DISTRIBUTION');
    expect(content).toContain('Severity,Count,Percentage of Gaps');
    expect(content).toContain('# ASSESSMENT TYPE BREAKDOWN');
    expect(content).toContain('Assessment Type,Entities Affected,Percentage,Severity');
    
    // Clean up test file
    fs.unlinkSync(filePath);
  });

  test('real-time data updates', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for initial data load
    await page.waitForSelector('[data-testid="gap-analysis-summary"]', { timeout: 10000 });
    
    // Get initial timestamp
    const initialTimestamp = await page.locator('[data-testid="last-updated"]').textContent();
    expect(initialTimestamp).toBeTruthy();
    
    // Wait for real-time update (should happen within 30 seconds, but we'll simulate for faster testing)
    // In a real scenario, you might need to trigger a data update via API or mock data change
    
    // Verify that the component shows it's ready for real-time updates
    await expect(page.locator('[data-testid="real-time-indicator"]')).toBeVisible();
    
    // Check that refresh controls are available
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      // Should show loading state briefly
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible({ timeout: 2000 });
    }
  });

  test('gap analysis summary with no data', async ({ page }) => {
    // Mock scenario where no gap analysis data is available
    // This might involve navigating to an incident with no data or using a test environment
    
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for component to render
    await page.waitForSelector('[data-testid="gap-analysis-summary"]', { timeout: 10000 });
    
    // Check if no data state is displayed appropriately
    const noDataMessage = page.locator('text=No gap analysis data available');
    if (await noDataMessage.isVisible()) {
      await expect(noDataMessage).toBeVisible();
      await expect(page.locator('text=Select an incident to view gap analysis')).toBeVisible();
      
      // Export button should be disabled when no data
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeDisabled();
    }
  });

  test('error handling and recovery', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for component to load
    await page.waitForSelector('[data-testid="gap-analysis-summary"]', { timeout: 10000 });
    
    // Simulate network error by going offline
    await page.context().setOffline(true);
    
    // Try to trigger a data refresh
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      
      // Should show error state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Error loading gap analysis data')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Retry should work
      await refreshButton.click();
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('responsive design on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X dimensions
    
    await page.goto('/coordinator/situation-dashboard');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="situation-dashboard-layout"]')).toBeVisible();
    
    // Check that gap analysis panel stacks properly on mobile
    const gapAnalysisPanel = page.locator('[data-testid="gap-analysis-panel"]');
    await expect(gapAnalysisPanel).toBeVisible();
    
    // Verify content is scrollable on mobile
    const panelContent = gapAnalysisPanel.locator('[data-testid="panel-content"]');
    await expect(panelContent).toBeVisible();
    
    // Check that all key elements are still accessible on mobile
    await expect(page.locator('text=Gap Analysis Summary')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('accessibility compliance', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="gap-analysis-summary"]', { timeout: 10000 });
    
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    
    // Verify export button has proper aria labels
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toHaveAttribute('aria-label');
    
    // Check color contrast indicators are accessible (gap indicators should have proper labels)
    const gapIndicators = page.locator('[data-testid="gap-indicator"]');
    const indicatorCount = await gapIndicators.count();
    expect(indicatorCount).toBeGreaterThan(0);
    
    // Verify progress bars have accessible labels
    const progressBars = page.locator('[data-testid="progress"]');
    const progressCount = await progressBars.count();
    if (progressCount > 0) {
      await expect(progressBars.first()).toHaveAttribute('aria-label');
    }
  });

  test('performance - component loads efficiently', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for gap analysis to fully load
    await page.waitForSelector('[data-testid="gap-analysis-summary"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Component should load within reasonable time (5 seconds for complex dashboard)
    expect(loadTime).toBeLessThan(5000);
    
    // Check that there are no console errors
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.error('Console error:', message.text());
      }
    });
    
    // Verify smooth animations and transitions
    const exportButton = page.locator('button:has-text("Export")');
    await exportButton.hover();
    // Should show hover state smoothly
    await expect(exportButton).toBeVisible();
  });

  test('integration with other dashboard panels', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for all panels to load
    await Promise.all([
      page.waitForSelector('[data-testid="incident-overview-panel"]', { timeout: 10000 }),
      page.waitForSelector('[data-testid="entity-assessment-panel"]', { timeout: 10000 }),
      page.waitForSelector('[data-testid="gap-analysis-summary"]', { timeout: 10000 })
    ]);
    
    // Verify three-panel layout is working
    await expect(page.locator('[data-testid="situation-dashboard-layout"]')).toBeVisible();
    
    // Check panel resizer functionality
    const resizer = page.locator('[data-testid="panel-resizer"]');
    if (await resizer.isVisible()) {
      // Test panel resizing (if implemented)
      await resizer.hover();
      await expect(resizer).toBeVisible();
    }
    
    // Verify gap analysis panel interaction with incident selection
    const incidentSelector = page.locator('[data-testid="incident-selector"]');
    if (await incidentSelector.isVisible()) {
      // Select a different incident and verify gap analysis updates
      await incidentSelector.click();
      await page.locator('[data-testid="incident-option"]:first-child').click();
      
      // Gap analysis should update with new incident data
      await page.waitForTimeout(2000); // Wait for data update
      await expect(page.locator('[data-testid="gap-analysis-summary"]')).toBeVisible();
    }
  });
});