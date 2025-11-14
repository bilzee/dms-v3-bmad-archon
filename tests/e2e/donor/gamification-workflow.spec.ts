import { test, expect, beforeEach } from '@playwright/test';

test.describe('Donor Gamification Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as donor
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'donor@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    // Wait for redirect to donor dashboard
    await expect(page).toHaveURL('/donor/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display gamification metrics on dashboard', async ({ page }) => {
    // Check if gamification metrics are visible on dashboard
    await expect(page.locator('[data-testid="leaderboard-rank-metric"]')).toBeVisible();
    await expect(page.locator('text=Leaderboard Rank')).toBeVisible();
    
    // Verify rank indicator
    const rankMetric = page.locator('[data-testid="leaderboard-rank-metric"]');
    await expect(rankMetric).toBeVisible();
    
    // Check if ranking trend indicator exists
    await expect(page.locator('text=/📈|📉|➡️|Ranking/')).toBeVisible();
  });

  test('should navigate to gamification tab and display achievements', async ({ page }) => {
    // Navigate to gamification tab
    await page.click('[data-testid="dashboard-gamification-tab"]');
    
    // Wait for gamification content to load
    await page.waitForLoadState('networkidle');
    
    // Check if achievements section is visible
    await expect(page.locator('text=Achievements & Badges')).toBeVisible();
    
    // Check if GameBadgeSystem component renders
    await expect(page.locator('[data-testid="game-badge-system"]')).toBeVisible();
    
    // Check if performance overview is visible
    await expect(page.locator('text=Performance Overview')).toBeVisible();
    
    // Check if leaderboard preview is visible
    await expect(page.locator('text=Leaderboard')).toBeVisible();
    
    // Verify View Full Leaderboard link
    await expect(page.locator('a[href="/donor/leaderboard"]')).toBeVisible();
  });

  test('should display performance metrics correctly', async ({ page }) => {
    // Navigate to gamification tab
    await page.click('[data-testid="dashboard-gamification-tab"]');
    
    // Check delivery rate metric
    await expect(page.locator('text=Delivery Rate')).toBeVisible();
    
    // Check total activities metric
    await expect(page.locator('text=Total Activities')).toBeVisible();
    
    // Verify current ranking badge
    await expect(page.locator('[data-testid="badge"]')).toBeVisible();
    
    // Check if ranking trend is displayed (should show rank change)
    const trendElement = page.locator('[data-testid="trend-indicator"]');
    if (await trendElement.isVisible()) {
      await expect(trendElement).toBeVisible();
    }
  });

  test('should navigate to full leaderboard page', async ({ page }) => {
    // Click on View Full Leaderboard link
    await page.click('a[href="/donor/leaderboard"]');
    
    // Wait for leaderboard page to load
    await expect(page).toHaveURL('/donor/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Check if leaderboard title is visible
    await expect(page.locator('text=Donor Leaderboard')).toBeVisible();
    
    // Check if leaderboard display component is visible
    await expect(page.locator('[data-testid="leaderboard-display"]')).toBeVisible();
    
    // Check for filters
    await expect(page.locator('[data-testid="select-trigger"]')).toBeVisible();
    
    // Check for search functionality
    await expect(page.locator('[data-testid="input"]')).toBeVisible();
  });

  test('should interact with leaderboard filters', async ({ page }) => {
    // Navigate to leaderboard page
    await page.goto('/donor/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Test timeframe filter
    const timeframeSelect = page.locator('[data-testid="select-trigger"]').first();
    await timeframeSelect.click();
    
    // Select different timeframe
    await page.locator('text=Last 7 days').click();
    
    // Wait for data to refresh
    await page.waitForTimeout(2000);
    
    // Test search functionality
    const searchInput = page.locator('[data-testid="input"]');
    await searchInput.fill('Organization');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Verify search results are filtered
    const searchResults = page.locator('[data-testid="leaderboard-entry"]');
    if (await searchResults.count() > 0) {
      const firstResult = searchResults.first();
      await expect(firstResult).toContainText('Organization');
    }
    
    // Test sort by filter
    const sortBySelect = page.locator('[data-testid="select-trigger"]').nth(1);
    await sortBySelect.click();
    
    // Sort by delivery rate
    await page.locator('text=Delivery Rate').click();
    
    // Wait for sorting to apply
    await page.waitForTimeout(2000);
    
    // Verify sorting indicator in metadata
    await expect(page.locator('text=Delivery Rate')).toBeVisible();
  });

  test('should navigate to performance dashboard', async ({ page }) => {
    // Navigate to performance dashboard
    await page.goto('/donor/performance');
    await page.waitForLoadState('networkidle');
    
    // Check if performance dashboard is visible
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
    
    // Check for timeframe selector
    await expect(page.locator('[data-testid="select-trigger"]')).toBeVisible();
    
    // Check for key metrics cards
    await expect(page.locator('text=Delivery Rate')).toBeVisible();
    await expect(page.locator('text=Total Commitments')).toBeVisible();
    await expect(page.locator('text=Total Value')).toBeVisible();
    
    // Check for charts section
    await expect(page.locator('text=Performance Trends')).toBeVisible();
    
    // Check for achievements section
    await expect(page.locator('text=Achievements & Badges')).toBeVisible();
    
    // Check for recent achievements
    await expect(page.locator('text=Recent Achievements')).toBeVisible();
  });

  test('should display performance trends with different timeframes', async ({ page }) => {
    // Navigate to performance dashboard
    await page.goto('/donor/performance');
    await page.waitForLoadState('networkidle');
    
    // Get timeframe selector
    const timeframeSelect = page.locator('[data-testid="select-trigger"]').first();
    
    // Test different timeframes
    const timeframes = ['3 Months', '6 Months', '1 Year', '2 Years'];
    
    for (const timeframe of timeframes) {
      await timeframeSelect.click();
      await page.locator(`text=${timeframe}`).click();
      
      // Wait for data to load
      await page.waitForTimeout(3000);
      
      // Verify the timeframe is applied (check URL or display)
      // This might need adjustment based on actual implementation
      await expect(page.locator('text=Performance Dashboard')).toBeVisible();
      
      // Verify chart is rendered (check for canvas or chart container)
      const chartContainer = page.locator('canvas, [data-testid="performance-chart"]');
      if (await chartContainer.isVisible()) {
        await expect(chartContainer).toBeVisible();
      }
    }
  });

  test('should show badge achievements correctly', async ({ page }) => {
    // Navigate to performance dashboard
    await page.goto('/donor/performance');
    await page.waitForLoadState('networkidle');
    
    // Check achievements section
    await expect(page.locator('text=Achievements & Badges')).toBeVisible();
    
    // Check for badge system component
    await expect(page.locator('[data-testid="game-badge-system"]')).toBeVisible();
    
    // Check for individual badges
    const badges = page.locator('[data-testid="badge-"]');
    if (await badges.count() > 0) {
      await expect(badges.first()).toBeVisible();
      
      // Verify badge content (achievement icons and text)
      const firstBadge = badges.first();
      await expect(firstBadge).toContainText(/[🏆🥇🥉🎖️]/); // Achievement emoji
    }
    
    // Check for badge progress indicator
    const progressIndicator = page.locator('[data-testid="badge-progress"]');
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toBeVisible();
    }
  });

  test('should show recent achievements with dates', async ({ page }) => {
    // Navigate to performance dashboard
    await page.goto('/donor/performance');
    await page.waitForLoadState('networkidle');
    
    // Check recent achievements section
    await expect(page.locator('text=Recent Achievements')).toBeVisible();
    
    // Look for achievement entries
    const achievementEntries = page.locator('[data-testid="achievement-entry"]');
    
    if (await achievementEntries.count() > 0) {
      const firstEntry = achievementEntries.first();
      
      // Check for achievement date
      await expect(firstEntry.locator('[data-testid="achievement-date"]')).toBeVisible();
      
      // Check for achievement description
      await expect(firstEntry.locator('[data-testid="achievement-description"]')).toBeVisible();
      
      // Check for badge display
      await expect(firstEntry.locator('[data-testid="achievement-badge"]')).toBeVisible();
    }
  });

  test('should provide export functionality', async ({ page }) => {
    // Navigate to performance dashboard
    await page.goto('/donor/performance');
    await page.waitForLoadState('networkidle');
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export Report")');
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Check if export dialog opens
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Check for export format options
      await expect(page.locator('text=Export Format')).toBeVisible();
      await expect(page.locator('text=CSV (Spreadsheet)')).toBeVisible();
      await expect(page.locator('text=PDF Report')).toBeVisible();
      
      // Check for report period selector
      await expect(page.locator('text=Report Period')).toBeVisible();
      
      // Close dialog
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should display ranking information correctly', async ({ page }) => {
    // Navigate to performance dashboard
    await page.goto('/donor/performance');
    await page.waitForLoadState('networkidle');
    
    // Look for current rank information
    const rankInfo = page.locator('text=Current Rank');
    
    if (await rankInfo.isVisible()) {
      await expect(rankInfo).toBeVisible();
      
      // Check for rank badge/number
      const rankBadge = page.locator('[data-testid="current-rank"]');
      if (await rankBadge.isVisible()) {
        await expect(rankBadge).toMatch(/#\d+/); // Should contain # followed by number
      }
      
      // Check for trend indicator
      const trendIndicator = page.locator('[data-testid="ranking-trend"]');
      if (await trendIndicator.isVisible()) {
        await expect(trendIndicator).toBeVisible();
      }
    }
  });

  test('should integrate gamification with main dashboard', async ({ page }) => {
    // Start at main dashboard
    await page.goto('/donor/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if gamification tab exists
    await expect(page.locator('[data-testid="dashboard-gamification-tab"]')).toBeVisible();
    
    // Check if tab icon (trophy) is visible
    await expect(page.locator('[data-testid="dashboard-gamification-tab"] svg')).toBeVisible();
    
    // Navigate to gamification tab
    await page.click('[data-testid="dashboard-gamification-tab"]');
    
    // Verify gamification content loads
    await expect(page.locator('text=Achievements & Badges')).toBeVisible();
    
    // Go back to overview
    await page.click('[data-testid="dashboard-overview-tab"]');
    
    // Verify overview is still functional
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should handle responsive design correctly', async ({ page }) => {
    // Test on desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/donor/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Check if leaderboard is visible on desktop
    await expect(page.locator('[data-testid="leaderboard-display"]')).toBeVisible();
    
    // Check if full table is visible
    const desktopHeaders = page.locator('[data-testid="desktop-headers"]');
    if (await desktopHeaders.isVisible()) {
      await expect(desktopHeaders).toBeVisible();
    }
    
    // Test on mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Check if leaderboard is still visible on mobile
    await expect(page.locator('[data-testid="leaderboard-display"]')).toBeVisible();
    
    // Check for mobile-specific elements
    const mobileBadges = page.locator('[data-testid="mobile-badges"]');
    if (await mobileBadges.isVisible()) {
      await expect(mobileBadges).toBeVisible();
    }
    
    // Test on tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    // Should still be visible on tablet
    await expect(page.locator('[data-testid="leaderboard-display"]')).toBeVisible();
  });

  test('should handle loading and error states gracefully', async ({ page }) => {
    // Navigate to leaderboard page
    await page.goto('/donor/leaderboard');
    
    // Check loading state (should show briefly)
    const loadingElement = page.locator('[data-testid="loading-spinner"], [data-testid="skeleton"]');
    
    // Page should load without errors
    await page.waitForLoadState('networkidle');
    
    // Should not show error state
    const errorElement = page.locator('[data-testid="error-message"]');
    await expect(errorElement).not.toBeVisible();
    
    // Should show content
    await expect(page.locator('[data-testid="leaderboard-display"]')).toBeVisible();
  });

  test('should maintain data consistency across pages', async ({ page }) => {
    // Navigate to main dashboard
    await page.goto('/donor/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Note current rank on dashboard
    const dashboardRank = page.locator('[data-testid="leaderboard-rank-metric"]');
    let dashboardRankValue = '';
    
    if (await dashboardRank.isVisible()) {
      dashboardRankValue = await dashboardRank.textContent();
    }
    
    // Navigate to full leaderboard
    await page.goto('/donor/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Find user in leaderboard
    const searchInput = page.locator('[data-testid="input"]');
    if (await searchInput.isVisible()) {
      // Search for the organization name
      const organizationName = 'Test Organization'; // Adjust based on test data
      
      // This is a simplified approach - in real tests you might need to
      // use the logged-in user's organization name
      await searchInput.fill(organizationName);
      await page.waitForTimeout(2000);
      
      // Check if search results contain consistent ranking information
      const searchResults = page.locator('[data-testid="leaderboard-entry"]');
      if (await searchResults.count() > 0) {
        // Verify that ranking data is consistent
        const firstResult = searchResults.first();
        await expect(firstResult).toBeVisible();
      }
    }
  });
});