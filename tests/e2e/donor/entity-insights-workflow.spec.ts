import { test, expect } from '@playwright/test';

test.describe('Donor Entity Insights Workflow', () => {
  const testUser = {
    email: 'donor@test.com',
    password: 'password123'
  };

  test.beforeEach(async ({ page }) => {
    // Login as donor
    await page.goto('/login');
    await page.fill('[data-testid=email]', testUser.email);
    await page.fill('[data-testid=password]', testUser.password);
    await page.click('[data-testid=login-button]');
    
    await expect(page).toHaveURL('/donor/dashboard');
  });

  test('complete entity insights workflow', async ({ page }) => {
    // Step 1: Navigate to main dashboard and verify entity insights section
    await expect(page.locator('[data-testid=entity-insights-overview]')).toBeVisible();
    await expect(page.locator('text=Entity Insights Overview')).toBeVisible();
    
    // Step 2: Verify entity cards are displayed
    await expect(page.locator('[data-testid=entity-card]')).toHaveCount.greaterThan(0);
    
    // Step 3: Click on first entity card to view details
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Step 4: Verify entity insights page loads with all tabs
    await expect(page.locator('[data-testid=entity-insights-header]')).toBeVisible();
    await expect(page.locator('[data-testid=assessment-viewer-tab]')).toBeVisible();
    await expect(page.locator('[data-testid=gap-analysis-tab]')).toBeVisible();
    await expect(page.locator('[data-testid=assessment-trends-tab]')).toBeVisible();
    await expect(page.locator('[data-testid=assessment-export-tab]')).toBeVisible();
    
    // Step 5: Test Assessment Viewer tab
    await page.click('[data-testid=assessment-viewer-tab]');
    await expect(page.locator('[data-testid=assessment-viewer]')).toBeVisible();
    
    // Verify assessment cards are displayed
    await expect(page.locator('[data-testid=assessment-card]')).toHaveCount.greaterThanOrEqual(0);
    
    // Test category filtering
    if (await page.locator('[data-testid=category-filter]').isVisible()) {
      await page.click('[data-testid=category-filter]');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000); // Wait for filter to apply
    }
    
    // Test search functionality
    if (await page.locator('[data-testid=assessment-search]').isVisible()) {
      await page.fill('[data-testid=assessment-search]', 'HEALTH');
      await page.waitForTimeout(1000);
    }
    
    // Step 6: Test Gap Analysis tab
    await page.click('[data-testid=gap-analysis-tab]');
    await expect(page.locator('[data-testid=gap-analysis]')).toBeVisible();
    
    // Verify gap analysis components
    await expect(page.locator('[data-testid=gap-overview]')).toBeVisible();
    await expect(page.locator('[data-testid=gap-categories]')).toBeVisible();
    await expect(page.locator('[data-testid=recommended-actions]')).toBeVisible();
    
    // Step 7: Test Assessment Trends tab
    await page.click('[data-testid=assessment-trends-tab]');
    await expect(page.locator('[data-testid=assessment-trends]')).toBeVisible();
    
    // Verify trend visualization
    await expect(page.locator('[data-testid=trend-chart]')).toBeVisible();
    await expect(page.locator('[data-testid=trend-insights]')).toBeVisible();
    
    // Step 8: Test Assessment Export tab
    await page.click('[data-testid=assessment-export-tab]');
    await expect(page.locator('[data-testid=assessment-export]')).toBeVisible();
    
    // Test export options
    await expect(page.locator('[data-testid=export-format-pdf]')).toBeVisible();
    await expect(page.locator('[data-testid=export-format-csv]')).toBeVisible();
    
    // Test PDF export
    await page.click('[data-testid=export-format-pdf]');
    await page.click('[data-testid=generate-export-button]');
    
    // Verify export starts (downloading or generating)
    await expect(page.locator('[data-testid=export-progress]')).toBeVisible({ timeout: 5000 });
    
    // Step 9: Test navigation back to dashboard
    await page.click('[data-testid=back-to-dashboard]');
    await expect(page).toHaveURL('/donor/dashboard');
    
    // Step 10: Verify dashboard navigation shortcuts work
    await page.click('[data-testid=view-all-entities-button]');
    await expect(page).toHaveURL('/donor/entities');
  });

  test('entity cards display correct information', async ({ page }) => {
    // Verify entity insights section on dashboard
    await expect(page.locator('[data-testid=entity-insights-overview]')).toBeVisible();
    
    // Check first entity card for required information
    const firstCard = page.locator('[data-testid=entity-card]:first-child');
    await expect(firstCard).toBeVisible();
    
    // Verify entity name and type are displayed
    await expect(firstCard.locator('[data-testid=entity-name]')).toBeVisible();
    await expect(firstCard.locator('[data-testid=entity-type]')).toBeVisible();
    
    // Verify performance metrics are shown
    await expect(firstCard.locator('[data-testid=entity-score]')).toBeVisible();
    await expect(firstCard.locator('[data-testid=assessment-count]')).toBeVisible();
    await expect(firstCard.locator('[data-testid=gap-count]')).toBeVisible();
    
    // Verify view details button works
    await firstCard.locator('[data-testid=view-details-button]').click();
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
  });

  test('assessment viewer functionality', async ({ page }) => {
    // Navigate to an entity details page
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Go to assessment viewer tab
    await page.click('[data-testid=assessment-viewer-tab]');
    
    // Test assessment card expansion
    if (await page.locator('[data-testid=assessment-card]').count() > 0) {
      const firstAssessment = page.locator('[data-testid=assessment-card]:first-child');
      await expect(firstAssessment).toBeVisible();
      
      // Click to expand details
      await firstAssessment.locator('[data-testid=expand-assessment]').click();
      
      // Verify expanded information
      await expect(firstAssessment.locator('[data-testid=assessment-details]')).toBeVisible();
      await expect(firstAssessment.locator('[data-testid=assessment-summary]')).toBeVisible();
      await expect(firstAssessment.locator('[data-testid=critical-gaps]')).toBeVisible();
      await expect(firstAssessment.locator('[data-testid=recommendations]')).toBeVisible();
    }
    
    // Test filtering by category
    if (await page.locator('[data-testid=category-filter]').isVisible()) {
      const categoryFilter = page.locator('[data-testid=category-filter]');
      await categoryFilter.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Test search functionality
    if (await page.locator('[data-testid=assessment-search]').isVisible()) {
      const searchInput = page.locator('[data-testid=assessment-search]');
      await searchInput.fill('Test');
      await page.waitForTimeout(2000);
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);
    }
  });

  test('gap analysis visualization', async ({ page }) => {
    // Navigate to an entity details page
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Go to gap analysis tab
    await page.click('[data-testid=gap-analysis-tab]');
    
    // Verify gap analysis components
    await expect(page.locator('[data-testid=gap-overview]')).toBeVisible();
    await expect(page.locator('[data-testid=gap-categories]')).toBeVisible();
    await expect(page.locator('[data-testid=recommended-actions]')).toBeVisible();
    
    // Test gap severity indicators
    const gapIndicators = page.locator('[data-testid=gap-indicator]');
    if (await gapIndicators.count() > 0) {
      await expect(gapIndicators.first()).toBeVisible();
      
      // Verify severity colors are applied
      const criticalGap = page.locator('[data-testid=gap-critical]');
      const warningGap = page.locator('[data-testid=gap-warning]');
      const minorGap = page.locator('[data-testid=gap-minor]');
      
      // At least one severity type should be visible
      await expect(
        criticalGap.or(warningGap).or(minorGap)
      ).toHaveCount.greaterThan(0);
    }
    
    // Test recommended actions
    const recommendedActions = page.locator('[data-testid=recommended-action]');
    if (await recommendedActions.count() > 0) {
      await expect(recommendedActions.first()).toBeVisible();
      await expect(recommendedActions.first().locator('[data-testid=action-title]')).toBeVisible();
      await expect(recommendedActions.first().locator('[data-testid=action-description]')).toBeVisible();
    }
  });

  test('assessment trends visualization', async ({ page }) => {
    // Navigate to an entity details page
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Go to assessment trends tab
    await page.click('[data-testid=assessment-trends-tab]');
    
    // Verify trend visualization components
    await expect(page.locator('[data-testid=assessment-trends]')).toBeVisible();
    await expect(page.locator('[data-testid=trend-chart]')).toBeVisible();
    await expect(page.locator('[data-testid=trend-insights]')).toBeVisible();
    
    // Test trend period selector
    if (await page.locator('[data-testid=trend-period]').isVisible()) {
      const periodSelector = page.locator('[data-testid=trend-period]');
      await periodSelector.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Test category filtering in trends
    if (await page.locator('[data-testid=trend-category-filter]').isVisible()) {
      await page.click('[data-testid=trend-category-filter]');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Verify trend insights are displayed
    const trendInsights = page.locator('[data-testid=trend-insight]');
    if (await trendInsights.count() > 0) {
      await expect(trendInsights.first()).toBeVisible();
      await expect(trendInsights.first().locator('[data-testid=insight-title]')).toBeVisible();
      await expect(trendInsights.first().locator('[data-testid=insight-description]')).toBeVisible();
    }
  });

  test('assessment export functionality', async ({ page }) => {
    // Navigate to an entity details page
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Go to export tab
    await page.click('[data-testid=assessment-export-tab]');
    await expect(page.locator('[data-testid=assessment-export]')).toBeVisible();
    
    // Test export format selection
    await expect(page.locator('[data-testid=export-format-pdf]')).toBeVisible();
    await expect(page.locator('[data-testid=export-format-csv]')).toBeVisible();
    
    // Test PDF export
    await page.click('[data-testid=export-format-pdf]');
    
    // Configure export options
    if (await page.locator('[data-testid=include-summary]').isVisible()) {
      await page.click('[data-testid=include-summary]');
    }
    if (await page.locator('[data-testid=include-trends]').isVisible()) {
      await page.click('[data-testid=include-trends]');
    }
    if (await page.locator('[data-testid=include-gap-analysis]').isVisible()) {
      await page.click('[data-testid=include-gap-analysis]');
    }
    
    // Generate export
    await page.click('[data-testid=generate-export-button]');
    
    // Verify export progress
    await expect(page.locator('[data-testid=export-progress]')).toBeVisible({ timeout: 5000 });
    
    // Wait for export to complete or show status
    await page.waitForTimeout(3000);
    
    // Test CSV export
    await page.click('[data-testid=export-format-csv]');
    await page.click('[data-testid=generate-export-button]');
    
    // Verify export starts
    await expect(page.locator('[data-testid=export-progress]')).toBeVisible({ timeout: 5000 });
  });

  test('role-based access control', async ({ page, context }) => {
    // Donor can only see their assigned entities
    await expect(page.locator('[data-testid=entity-card]')).toHaveCount.greaterThan(0);
    
    // Try to access non-assigned entity (should return 403)
    const response = await context.request.get('/api/v1/donors/entities/non-assigned-entity/assessments');
    expect(response.status()).toBe(403);
    
    // Try to access coordinator endpoint (should be forbidden)
    const coordinatorResponse = await context.request.get('/api/v1/coordinator/assignments');
    expect([401, 403]).toContain(coordinatorResponse.status());
    
    // Verify donor cannot access admin functions
    const adminResponse = await context.request.get('/api/v1/admin/users');
    expect([401, 403]).toContain(adminResponse.status());
  });

  test('handles empty states gracefully', async ({ page }) => {
    // This test would need specific test data setup
    // For now, verify error handling components exist
    
    // Navigate to entity details
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Go to assessment viewer
    await page.click('[data-testid=assessment-viewer-tab]');
    
    // If no assessments exist, should show empty state
    if (await page.locator('[data-testid=no-assessments]').isVisible()) {
      await expect(page.locator('text=No assessments found')).toBeVisible();
      await expect(page.locator('text=This entity hasn\'t had any assessments recorded yet')).toBeVisible();
    }
  });

  test('search and filtering functionality', async ({ page }) => {
    // Navigate to entity details
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Go to assessment viewer
    await page.click('[data-testid=assessment-viewer-tab]');
    
    // Test category filtering
    if (await page.locator('[data-testid=category-filter]').isVisible()) {
      const categoryFilter = page.locator('[data-testid=category-filter]');
      await categoryFilter.click();
      
      // Try different categories
      const categories = ['HEALTH', 'SHELTER', 'WASH', 'FOOD', 'SECURITY', 'POPULATION'];
      for (const category of categories.slice(0, 2)) { // Test first 2 categories
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(500);
      }
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Test search functionality
    if (await page.locator('[data-testid=assessment-search]').isVisible()) {
      const searchInput = page.locator('[data-testid=assessment-search]');
      
      // Test with different search terms
      const searchTerms = ['HEALTH', 'verified', 'Test'];
      for (const term of searchTerms) {
        await searchInput.clear();
        await searchInput.fill(term);
        await page.waitForTimeout(1000);
      }
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);
    }
    
    // Test status filtering
    if (await page.locator('[data-testid=status-filter]').isVisible()) {
      await page.click('[data-testid=status-filter]');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
  });

  test('accessibility and keyboard navigation', async ({ page }) => {
    // Navigate to entity insights
    await expect(page.locator('[data-testid=entity-insights-overview]')).toBeVisible();
    
    // Test keyboard navigation through entity cards
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate to entity details
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Test tab navigation through tabs
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid=assessment-viewer-tab]:focus')).toBeVisible();
    
    // Navigate through tabs with keyboard
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid=gap-analysis-tab]')).toHaveClass(/active/);
    
    // Test keyboard navigation in assessment viewer
    await page.click('[data-testid=assessment-viewer-tab]');
    await page.keyboard.press('Tab');
    
    // Test keyboard access to filters and search
    if (await page.locator('[data-testid=category-filter]').isVisible()) {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
  });

  test('mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid=entity-insights-overview]')).toBeVisible();
    
    // Entity cards should stack vertically on mobile
    const entityCards = page.locator('[data-testid=entity-card]');
    if (await entityCards.count() > 1) {
      const firstCard = entityCards.first();
      const secondCard = entityCards.nth(1);
      
      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();
      
      // Cards should be vertically stacked (not side by side)
      expect(firstBox!.y).toBeLessThan(secondBox!.y);
    }
    
    // Navigate to entity details on mobile
    await page.click('[data-testid=entity-card]:first-child');
    await expect(page).toHaveURL(/\/donor\/entities\/[a-zA-Z0-9-]+/);
    
    // Verify mobile menu works if present
    if (await page.locator('[data-testid=mobile-menu-toggle]').isVisible()) {
      await page.click('[data-testid=mobile-menu-toggle]');
      await expect(page.locator('[data-testid=mobile-menu]')).toBeVisible();
    }
    
    // Test tab navigation on mobile
    await expect(page.locator('[data-testid=assessment-viewer-tab]')).toBeVisible();
    await page.click('[data-testid=assessment-viewer-tab]');
    await expect(page.locator('[data-testid=assessment-viewer]')).toBeVisible();
  });
});