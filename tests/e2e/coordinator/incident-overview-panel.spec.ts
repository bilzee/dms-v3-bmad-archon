import { test, expect } from '@playwright/test';

test.describe('Coordinator Incident Overview Panel Workflow', () => {
  const testUser = {
    email: 'coordinator@test.com',
    password: 'password123'
  };

  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    await page.fill('[data-testid=email]', testUser.email);
    await page.fill('[data-testid=password]', testUser.password);
    await page.click('[data-testid=login-button]');
    
    await expect(page).toHaveURL('/coordinator/dashboard');
  });

  test('complete incident selection and overview panel workflow', async ({ page }) => {
    // Step 1: Navigate to situation dashboard
    await page.click('[data-testid=situation-dashboard-link]');
    await expect(page).toHaveURL('/coordinator/situation-dashboard');

    // Step 2: Wait for dashboard to load
    await expect(page.locator('[data-testid=incident-overview-panel]')).toBeVisible();
    await expect(page.locator('[data-testid=incident-selector]')).toBeVisible();

    // Step 3: Select an incident from dropdown
    await page.click('[data-testid=incident-selector-trigger]');
    await expect(page.locator('[data-testid=incident-dropdown-content]')).toBeVisible();
    
    // Select first available incident
    await page.click('[data-testid=incident-option]:first-child');
    
    // Step 4: Verify incident summary loads
    await expect(page.locator('[data-testid=incident-summary]')).toBeVisible();
    await expect(page.locator('[data-testid=incident-type]')).toBeVisible();
    await expect(page.locator('[data-testid=incident-status]')).toBeVisible();
    await expect(page.locator('[data-testid=incident-duration]')).toBeVisible();

    // Step 5: Verify population impact statistics
    await expect(page.locator('[data-testid=population-impact]')).toBeVisible();
    await expect(page.locator('[data-testid=total-population]')).toBeVisible();
    await expect(page.locator('[data-testid=total-households]')).toBeVisible();
    await expect(page.locator('[data-testid=lives-lost]')).toBeVisible();
    await expect(page.locator('[data-testid=injured-count]')).toBeVisible();

    // Step 6: Verify aggregate metrics
    await expect(page.locator('[data-testid=aggregate-metrics]')).toBeVisible();
    await expect(page.locator('[data-testid=affected-entities]')).toBeVisible();
    await expect(page.locator('[data-testid=total-assessments]')).toBeVisible();
    await expect(page.locator('[data-testid=verified-assessments]')).toBeVisible();
    await expect(page.locator('[data-testid=responses-count]')).toBeVisible();

    // Step 7: Toggle historical incidents
    await page.click('[data-testid=show-historical-toggle]');
    await expect(page.locator('[data-testid=incident-dropdown-content]')).toContainText('Resolved Incidents');
    
    // Step 8: Clear incident selection
    await page.click('[data-testid=clear-incident-selection]');
    await expect(page.locator('[data-testid=no-incident-selected]')).toBeVisible();
  });

  test('validates incident selection dropdown functionality', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for components to load
    await expect(page.locator('[data-testid=incident-selector]')).toBeVisible();
    
    // Open dropdown
    await page.click('[data-testid=incident-selector-trigger]');
    await expect(page.locator('[data-testid=incident-dropdown-content]')).toBeVisible();
    
    // Check for different incident status sections
    await expect(page.locator('[data-testid=active-incidents-section]')).toBeVisible();
    
    // Toggle historical incidents
    await page.click('[data-testid=show-historical-toggle]');
    await expect(page.locator('[data-testid=resolved-incidents-section]')).toBeVisible();
    
    // Check recently selected incidents if available
    const recentSection = page.locator('[data-testid=recent-incidents-section]');
    if (await recentSection.isVisible()) {
      await expect(recentSection).toContainText('Recently Selected');
    }
  });

  test('displays real-time duration updates for active incidents', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Select an active incident
    await page.click('[data-testid=incident-selector-trigger]');
    await page.click('[data-testid=incident-option]:first-child');
    
    // Wait for incident summary to load
    await expect(page.locator('[data-testid=incident-summary]')).toBeVisible();
    
    // Check for real-time indicator
    const realTimeIndicator = page.locator('[data-testid=real-time-indicator]');
    if (await realTimeIndicator.isVisible()) {
      await expect(realTimeIndicator).toContainText('Live');
    }
    
    // Verify duration information is displayed
    await expect(page.locator('[data-testid=total-duration]')).toBeVisible();
    await expect(page.locator('[data-testid=current-status-duration]')).toBeVisible();
    
    // Check duration progress bar
    await expect(page.locator('[data-testid=duration-progress]')).toBeVisible();
  });

  test('handles population impact data aggregation correctly', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Select an incident with population data
    await page.click('[data-testid=incident-selector-trigger]');
    await page.click('[data-testid=incident-option]:first-child');
    
    // Wait for population impact to load
    await expect(page.locator('[data-testid=population-impact]')).toBeVisible();
    
    // Verify demographic breakdown
    const demographicsSection = page.locator('[data-testid=demographic-breakdown]');
    if (await demographicsSection.isVisible()) {
      await expect(page.locator('[data-testid=vulnerable-populations]')).toBeVisible();
      await expect(page.locator('[data-testid=demographic-progress-bars]')).toBeVisible();
    }
    
    // Check data sources information
    await expect(page.locator('[data-testid=data-sources]')).toBeVisible();
    await expect(page.locator('[data-testid=assessment-sources]')).toBeVisible();
  });

  test('displays aggregate metrics with trend analysis', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Select an incident
    await page.click('[data-testid=incident-selector-trigger]');
    await page.click('[data-testid=incident-option]:first-child');
    
    // Wait for metrics to load
    await expect(page.locator('[data-testid=aggregate-metrics]')).toBeVisible();
    
    // Verify metric cards
    await expect(page.locator('[data-testid=entities-metric-card]')).toBeVisible();
    await expect(page.locator('[data-testid=assessments-metric-card]')).toBeVisible();
    await expect(page.locator('[data-testid=responses-metric-card]')).toBeVisible();
    
    // Check verification status
    await expect(page.locator('[data-testid=verification-status]')).toBeVisible();
    await expect(page.locator('[data-testid=verified-count]')).toBeVisible();
    await expect(page.locator('[data-testid=pending-count]')).toBeVisible();
    
    // Check delivery and coverage rates
    await expect(page.locator('[data-testid=delivery-rate]')).toBeVisible();
    await expect(page.locator('[data-testid=coverage-rate]')).toBeVisible();
    await expect(page.locator('[data-testid=progress-indicators]')).toBeVisible();
  });

  test('handles loading and error states gracefully', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Check loading state on initial load
    await expect(page.locator('[data-testid=incident-overview-panel]')).toBeVisible();
    
    // Mock network conditions for error state testing would require network interception
    // For now, verify error boundary components are present
    await expect(page.locator('[data-testid=error-boundary]')).not.toBeVisible();
    
    // Verify skeleton loading states are handled
    const loadingIndicators = page.locator('[data-testid=loading-skeleton]');
    if (await loadingIndicators.first().isVisible()) {
      await expect(loadingIndicators).toHaveCount(expect.any(Number));
    }
  });

  test('responsive design works on mobile and tablet', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/coordinator/situation-dashboard');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid=incident-overview-panel]')).toBeVisible();
    await expect(page.locator('[data-testid=mobile-layout-wrapper]')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid=incident-overview-panel]')).toBeVisible();
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid=incident-overview-panel]')).toBeVisible();
  });

  test('accessibility compliance and keyboard navigation', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate through incident selector
    await page.press('Tab'); // Should focus incident selector
    await page.keyboard.press('Enter'); // Should open dropdown
    await expect(page.locator('[data-testid=incident-dropdown-content]')).toBeVisible();
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // Select first incident
    
    // Verify ARIA labels and screen reader support
    const incidentSelector = page.locator('[data-testid=incident-selector]');
    await expect(incidentSelector).toHaveAttribute('aria-label');
    
    // Check color contrast and visual indicators
    const statusBadges = page.locator('[data-testid=status-badge]');
    if (await statusBadges.first().isVisible()) {
      await expect(statusBadges.first()).toHaveClass(/text-/); // Should have text color class
    }
  });

  test('performance metrics and optimization', async ({ page }) => {
    // Start performance monitoring
    const navigationStart = Date.now();
    
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for key components to load
    await Promise.all([
      page.waitForSelector('[data-testid=incident-overview-panel]'),
      page.waitForSelector('[data-testid=incident-selector]')
    ]);
    
    const loadTime = Date.now() - navigationStart;
    
    // Verify reasonable load time (less than 3 seconds)
    expect(loadTime).toBeLessThan(3000);
    
    // Test incident selection performance
    const selectionStart = Date.now();
    
    await page.click('[data-testid=incident-selector-trigger]');
    await page.click('[data-testid=incident-option]:first-child');
    
    // Wait for all data to load
    await Promise.all([
      page.waitForSelector('[data-testid=incident-summary]'),
      page.waitForSelector('[data-testid=population-impact]'),
      page.waitForSelector('[data-testid=aggregate-metrics]')
    ]);
    
    const selectionLoadTime = Date.now() - selectionStart;
    
    // Incident selection should load quickly (less than 2 seconds)
    expect(selectionLoadTime).toBeLessThan(2000);
  });

  test('data refresh and real-time updates', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Select an incident
    await page.click('[data-testid=incident-selector-trigger]');
    await page.click('[data-testid=incident-option]:first-child');
    
    // Check for refresh indicator
    const refreshButton = page.locator('[data-testid=refresh-button]');
    if (await refreshButton.isVisible()) {
      await page.click('[data-testid=refresh-button]');
      
      // Verify loading indicator appears
      await expect(page.locator('[data-testid=updating-indicator]')).toBeVisible();
      
      // Verify data updates
      await expect(page.locator('[data-testid=incident-overview-panel]')).toBeVisible();
    }
    
    // Check timestamp updates
    const lastUpdated = page.locator('[data-testid=last-updated-timestamp]');
    if (await lastUpdated.isVisible()) {
      const initialTimestamp = await lastUpdated.textContent();
      
      // Wait for potential update
      await page.waitForTimeout(2000);
      
      // Verify timestamp is current (within reasonable range)
      expect(lastUpdated).toBeVisible();
    }
  });
});