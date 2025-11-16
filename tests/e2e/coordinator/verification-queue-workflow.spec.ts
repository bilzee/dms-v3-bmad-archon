import { test, expect } from '@playwright/test';

test.describe('Coordinator Verification Queue Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    
    await page.fill('[data-testid=email]', 'coordinator@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/coordinator/dashboard');
    await expect(page.getByText('Coordinator Dashboard')).toBeVisible();
  });

  test('displays verification queue management interface', async ({ page }) => {
    // Navigate to verification page
    await page.click('[data-testid=verification-link]');
    await expect(page).toHaveURL('/coordinator/verification');
    
    // Check that verification queue management is displayed
    await expect(page.getByText('Verification Queue Management')).toBeVisible();
    await expect(page.getByText('Review and verify assessments and delivery responses')).toBeVisible();
  });

  test('shows queue overview cards with correct data', async ({ page }) => {
    await page.goto('/coordinator/dashboard');
    
    // Check that queue overview cards are displayed
    await expect(page.getByText('Pending Verification')).toBeVisible();
    
    // Should show real data (numbers should be present)
    const pendingVerificationCard = page.locator('text=Pending Verification').locator('..').locator('..');
    await expect(pendingVerificationCard.getByText(/\d+/)).toBeVisible();
  });

  test('can access verification queue management from dashboard', async ({ page }) => {
    await page.goto('/coordinator/dashboard');
    
    // Click verification queue link
    await page.click('text=Verification Queue');
    
    // Should navigate to verification page
    await expect(page).toHaveURL('/coordinator/verification');
    await expect(page.getByText('Verification Queue Management')).toBeVisible();
  });

  test('verification queue tabs function correctly', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Check that all tabs are present
    const assessmentsTab = page.getByRole('tab', { name: /assessments/i });
    const deliveriesTab = page.getByRole('tab', { name: /deliveries/i });
    const analyticsTab = page.getByRole('tab', { name: /analytics/i });
    
    await expect(assessmentsTab).toBeVisible();
    await expect(deliveriesTab).toBeVisible();
    await expect(analyticsTab).toBeVisible();
    
    // Test tab switching
    await deliveriesTab.click();
    await expect(deliveriesTab).toHaveAttribute('aria-selected', 'true');
    await expect(assessmentsTab).toHaveAttribute('aria-selected', 'false');
    
    await analyticsTab.click();
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Verification Analytics')).toBeVisible();
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Find search input
    const searchInput = page.getByPlaceholderText(/search/i);
    await expect(searchInput).toBeVisible();
    
    // Type search query
    await searchInput.fill('hospital');
    
    // Should update the search
    await expect(searchInput).toHaveValue('hospital');
  });

  test('filter panel opens and closes correctly', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Click filters button
    await page.getByRole('button', { name: /filters/i }).click();
    
    // Filter panel should be visible
    await expect(page.getByText('Queue Filters')).toBeVisible();
    
    // Close filters panel
    await page.getByRole('button', { name: /close/i }).click();
    
    // Filter panel should not be visible
    await expect(page.getByText('Queue Filters')).not.toBeVisible();
  });

  test('can apply and clear filters', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Open filters
    await page.getByRole('button', { name: /filters/i }).click();
    
    // Apply status filter
    await page.getByLabel(/critical/i).click();
    await page.getByLabel(/high/i).click();
    
    // Close filters
    await page.getByRole('button', { name: /close/i }).click();
    
    // Should show filter summary
    await expect(page.getByText(/filters applied/i)).toBeVisible();
    
    // Clear filters
    await page.getByRole('button', { name: /clear all/i }).click();
    
    // Filter summary should be hidden
    await expect(page.getByText(/filters applied/i)).not.toBeVisible();
  });

  test('assessment queue displays items correctly', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Ensure assessments tab is active
    await page.getByRole('tab', { name: /assessments/i }).click();
    
    // Check that assessment items are displayed
    await expect(page.locator('[data-testid="assessment-queue"]')).toBeVisible();
    
    // Look for assessment item elements
    const assessmentItems = page.locator('[data-testid^="assessment-item-"]');
    if (await assessmentItems.count() > 0) {
      await expect(assessmentItems.first()).toBeVisible();
    }
  });

  test('delivery queue displays items correctly', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Switch to deliveries tab
    await page.getByRole('tab', { name: /deliveries/i }).click();
    
    // Check that delivery items are displayed
    await expect(page.locator('[data-testid="delivery-queue"]')).toBeVisible();
    
    // Look for delivery item elements
    const deliveryItems = page.locator('[data-testid^="delivery-item-"]');
    if (await deliveryItems.count() > 0) {
      await expect(deliveryItems.first()).toBeVisible();
    }
  });

  test('can select and view assessment details', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Ensure assessments tab is active
    await page.getByRole('tab', { name: /assessments/i }).click();
    
    // Look for clickable assessment items
    const assessmentItems = page.locator('[data-testid^="assessment-item-"]');
    const itemCount = await assessmentItems.count();
    
    if (itemCount > 0) {
      // Click on first assessment
      await assessmentItems.first().click();
      
      // Should show details panel
      await expect(page.getByText('Assessment Details')).toBeVisible();
      
      // Should have verification actions
      await expect(page.getByRole('button', { name: /verify/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /reject/i })).toBeVisible();
    }
  });

  test('can select and view delivery details', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Switch to deliveries tab
    await page.getByRole('tab', { name: /deliveries/i }).click();
    
    // Look for clickable delivery items
    const deliveryItems = page.locator('[data-testid^="delivery-item-"]');
    const itemCount = await deliveryItems.count();
    
    if (itemCount > 0) {
      // Click on first delivery
      await deliveryItems.first().click();
      
      // Should show details panel
      await expect(page.getByText('Delivery Details')).toBeVisible();
      
      // Should have verification actions
      await expect(page.getByRole('button', { name: /verify delivery/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /request more information/i })).toBeVisible();
    }
  });

  test('real-time updates are displayed', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Check connection status indicator
    const connectionStatus = page.getByTestId('connection-status');
    await expect(connectionStatus).toBeVisible();
    
    // Should show last update time
    await expect(page.getByText(/updated:/i)).toBeVisible();
  });

  test('refresh functionality works', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Click refresh button
    await page.getByRole('button', { name: /refresh/i }).click();
    
    // Check that refresh button is present and clickable
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toBeEnabled();
  });

  test('analytics dashboard loads correctly', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Click on analytics tab
    await page.getByRole('tab', { name: /analytics/i }).click();
    
    // Check that analytics components are displayed
    await expect(page.getByText('Verification Analytics')).toBeVisible();
    await expect(page.getByText('Performance metrics and trends for verification queues')).toBeVisible();
    
    // Check for key performance indicators
    await expect(page.getByText(/items processed/i)).toBeVisible();
    await expect(page.getByText(/avg processing time/i)).toBeVisible();
    await expect(page.getByText(/verification rate/i)).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/coordinator/verification');
    
    // Check that key elements are visible on mobile
    await expect(page.getByText('Verification Queue Management')).toBeVisible();
    
    // Tabs should be responsive
    const assessmentsTab = page.getByRole('tab', { name: /assessments/i });
    const deliveriesTab = page.getByRole('tab', { name: /deliveries/i });
    const analyticsTab = page.getByRole('tab', { name: /analytics/i });
    
    await expect(assessmentsTab).toBeVisible();
    await expect(deliveriesTab).toBeVisible();
    await expect(analyticsTab).toBeVisible();
    
    // Tab switching should work on mobile
    await deliveriesTab.click();
    await expect(deliveriesTab).toHaveAttribute('aria-selected', 'true');
  });

  test('role-based access control works', async ({ page }) => {
    // Login as different role to test access control
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'assessor@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    // Try to access verification queue
    await page.goto('/coordinator/verification');
    
    // Should redirect or show access denied
    await expect(page.getByText(/access denied|unauthorized|forbidden/i)).toBeVisible();
    // OR should redirect to their own dashboard
    // await expect(page).toHaveURL('/assessor/dashboard');
  });

  test('error handling displays correctly', async ({ page }) => {
    // Mock network failure by intercepting requests
    await page.route('/api/v1/verification/queue/assessments*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });
    
    await page.goto('/coordinator/verification');
    
    // Should handle error gracefully
    await expect(page.getByText(/error loading queue|failed to fetch/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry|reconnect/i })).toBeVisible();
  });

  test('performance under load', async ({ page }) => {
    // Test with larger dataset simulation
    await page.goto('/coordinator/verification');
    
    // Monitor page load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Test that interactions remain responsive
    await page.getByRole('tab', { name: /deliveries/i }).click();
    await expect(page.getByRole('tab', { name: /deliveries/i })).toHaveAttribute('aria-selected', 'true');
    
    // Test search responsiveness
    const searchInput = page.getByPlaceholderText(/search/i);
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Test tab navigation with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Try to navigate through tabs
    const deliveriesTab = page.getByRole('tab', { name: /deliveries/i });
    await deliveriesTab.focus();
    await page.keyboard.press('Enter');
    
    await expect(deliveriesTab).toHaveAttribute('aria-selected', 'true');
    
    // Test search input focus
    const searchInput = page.getByPlaceholderText(/search/i);
    await searchInput.focus();
    await page.keyboard.type('keyboard test');
    await expect(searchInput).toHaveValue('keyboard test');
  });

  test('export functionality works', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Switch to analytics tab
    await page.getByRole('tab', { name: /analytics/i }).click();
    
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      // Start download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await exportButton.click();
      
      // Wait for download to start
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/verification-analytics.*\.json$/);
    }
  });

  test('connection status indicator updates', async ({ page }) => {
    await page.goto('/coordinator/verification');
    
    // Check initial connection status
    const connectionStatus = page.getByTestId('connection-status');
    await expect(connectionStatus).toBeVisible();
    
    // Should show online status initially
    await expect(connectionStatus.getByText(/live|connected|online/i)).toBeVisible();
    
    // Test reconnection button (if it appears)
    const reconnectButton = page.getByRole('button', { name: /reconnect/i });
    if (await reconnectButton.isVisible()) {
      await reconnectButton.click();
      // Should attempt to reconnect
    }
  });
});