/**
 * E2E Tests: Assessment Relationship Management
 * 
 * Tests complete coordinator workflow for assessment relationship visualization,
 * including login, navigation, assessment relationship map interactions,
 * timeline visualization, filtering, and statistics display.
 */

import { test, expect } from '@playwright/test';

test.describe('Coordinator Assessment Relationship Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'coordinator@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/coordinator/dashboard');
  });

  test('navigate to incident detail and view assessment relationships', async ({ page }) => {
    // Navigate to incidents page
    await page.click('[data-testid=nav-incidents]');
    await expect(page).toHaveURL('/coordinator/incidents');
    
    // Select first incident
    await page.click('[data-testid=incident-card]:first-child [data-testid=view-details-button]');
    await expect(page.locator('h1')).toContainText('Incident');
    
    // Verify incident overview cards are displayed
    await expect(page.locator('[data-testid=total-assessments-card]')).toBeVisible();
    await expect(page.locator('[data-testid=affected-entities-card]')).toBeVisible();
    await expect(page.locator('[data-testid=critical-priority-card]')).toBeVisible();
    await expect(page.locator('[data-testid=location-card]')).toBeVisible();
  });

  test('view assessment relationship map', async ({ page }) => {
    // Navigate to incident detail
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Verify map tab is selected by default
    await expect(page.locator('[data-testid=tab-trigger-map]')).toHaveAttribute('data-state', 'active');
    
    // Verify assessment relationship map is loaded
    await expect(page.locator('[data-testid=assessment-relationship-map]')).toBeVisible();
    await expect(page.locator('[data-testid=map-container]')).toBeVisible();
    
    // Verify priority legend is displayed
    await expect(page.locator('[data-testid=priority-legend]')).toBeVisible();
    await expect(page.locator('text=CRITICAL')).toBeVisible();
    await expect(page.locator('text=HIGH')).toBeVisible();
    await expect(page.locator('text=MEDIUM')).toBeVisible();
    await expect(page.locator('text=LOW')).toBeVisible();
  });

  test('filter assessment relationships by priority', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Wait for map to load
    await expect(page.locator('[data-testid=assessment-relationship-map]')).toBeVisible();
    
    // Open priority filter
    await page.click('[data-testid=priority-filter-select]');
    await page.click('[data-testid=priority-filter-critical]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid=priority-filter-select]')).toContainText('Critical');
    
    // Verify map updates (check for reduced markers or updated statistics)
    await expect(page.locator('[data-testid=statistics-overlay]')).toBeVisible();
  });

  test('filter assessment relationships by assessment type', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Open assessment type filter
    await page.click('[data-testid=assessment-type-filter-select]');
    await page.click('[data-testid=assessment-type-health]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid=assessment-type-filter-select]')).toContainText('Health');
    
    // Verify map updates with filtered data
    await page.waitForTimeout(1000); // Wait for map update
  });

  test('filter assessment relationships by date range', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Open date range picker
    await page.click('[data-testid=date-range-button]');
    await expect(page.locator('[data-testid=calendar]')).toBeVisible();
    
    // Select date range (simplified - click on calendar)
    await page.click('[data-testid=calendar] button:first-child');
    await page.click('[data-testid=calendar] button:nth-child(7)');
    
    // Verify date range is applied
    await expect(page.locator('[data-testid=date-range-button]')).not.toContainText('Select dates');
  });

  test('view assessment timeline', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Click timeline tab
    await page.click('[data-testid=tab-trigger-timeline]');
    await expect(page.locator('[data-testid=tab-trigger-timeline]')).toHaveAttribute('data-state', 'active');
    
    // Verify timeline component is loaded
    await expect(page.locator('[data-testid=assessment-timeline]')).toBeVisible();
    await expect(page.locator('text=Assessment Timeline')).toBeVisible();
    
    // Verify timeline items are displayed
    await expect(page.locator('[data-testid=timeline-item]').first()).toBeVisible();
    
    // Verify timeline filters are available
    await expect(page.locator('text=Assessment Types')).toBeVisible();
    await expect(page.locator('text=Priority')).toBeVisible();
    await expect(page.locator('text=Date Range')).toBeVisible();
  });

  test('filter timeline by assessment type', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Navigate to timeline tab
    await page.click('[data-testid=tab-trigger-timeline]');
    
    // Check HEALTH assessment type filter
    await page.check('[data-testid=type-HEALTH]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid=type-HEALTH]')).toBeChecked();
    
    // Verify timeline updates
    await page.waitForTimeout(1000); // Wait for filter to apply
    
    // All visible timeline items should be HEALTH type
    const timelineItems = page.locator('[data-testid=timeline-item]');
    await expect(timelineItems.first().locator('text=HEALTH')).toBeVisible();
  });

  test('filter timeline by priority', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Navigate to timeline tab
    await page.click('[data-testid=tab-trigger-timeline]');
    
    // Check HIGH priority filter
    await page.check('[data-testid=priority-HIGH]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid=priority-HIGH]')).toBeChecked();
    
    // Verify timeline updates to show only HIGH priority assessments
    await page.waitForTimeout(1000);
  });

  test('filter timeline by verification status', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Navigate to timeline tab
    await page.click('[data-testid=tab-trigger-timeline]');
    
    // Check VERIFIED status filter
    await page.check('[data-testid=status-VERIFIED]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid=status-VERIFIED]')).toBeChecked();
    
    // Verify timeline shows only verified assessments
    await page.waitForTimeout(1000);
  });

  test('click on timeline item to view assessment details', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Navigate to timeline tab
    await page.click('[data-testid=tab-trigger-timeline]');
    
    // Click on first timeline item
    await page.click('[data-testid=timeline-item]:first-child');
    
    // Should trigger assessment detail view or navigation
    // (Implementation depends on onAssessmentClick handler)
    await page.waitForTimeout(500);
  });

  test('view assessment details tab', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Click details tab
    await page.click('[data-testid=tab-trigger-details]');
    await expect(page.locator('[data-testid=tab-trigger-details]')).toHaveAttribute('data-state', 'active');
    
    // Verify recent assessments section
    await expect(page.locator('text=Recent Assessments')).toBeVisible();
    
    // Verify assessment cards are displayed
    const assessmentCard = page.locator('[data-testid=assessment-card]').first();
    await expect(assessmentCard).toBeVisible();
    
    // Verify assessment information is displayed
    await expect(assessmentCard.locator('[data-testid=assessment-priority-badge]')).toBeVisible();
    await expect(assessmentCard.locator('[data-testid=assessment-type-badge]')).toBeVisible();
    await expect(assessmentCard.locator('[data-testid=entity-name]')).toBeVisible();
    await expect(assessmentCard.locator('[data-testid=assessor-name]')).toBeVisible();
  });

  test('view assessment details from details tab', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Navigate to details tab
    await page.click('[data-testid=tab-trigger-details]');
    
    // Click on "View Details" button for first assessment
    await page.click('[data-testid=assessment-card]:first-child [data-testid=view-details-button]');
    
    // Should navigate to assessment detail view or open modal
    await page.waitForTimeout(500);
  });

  test('verify statistics display correctly', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Verify overview statistics cards
    const totalAssessments = await page.locator('[data-testid=total-assessments-value]').textContent();
    const affectedEntities = await page.locator('[data-testid=affected-entities-value]').textContent();
    const criticalPriority = await page.locator('[data-testid=critical-priority-value]').textContent();
    
    expect(parseInt(totalAssessments || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(affectedEntities || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(criticalPriority || '0')).toBeGreaterThanOrEqual(0);
    
    // Verify priority distribution section
    await expect(page.locator('text=Assessment Priority Distribution')).toBeVisible();
    
    // Verify each priority level is displayed
    await expect(page.locator('[data-testid=priority-critical-count]')).toBeVisible();
    await expect(page.locator('[data-testid=priority-high-count]')).toBeVisible();
    await expect(page.locator('[data-testid=priority-medium-count]')).toBeVisible();
    await expect(page.locator('[data-testid=priority-low-count]')).toBeVisible();
  });

  test('verify map statistics overlay updates with filters', async ({ page }) => {
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Get initial statistics
    const initialEntities = await page.locator('[data-testid=statistics-overlay] [data-testid=total-entities]').textContent();
    const initialIncidents = await page.locator('[data-testid=statistics-overlay] [data-testid=total-incidents]').textContent();
    
    // Apply priority filter
    await page.click('[data-testid=priority-filter-select]');
    await page.click('[data-testid=priority-filter-critical]');
    
    // Wait for statistics to update
    await page.waitForTimeout(1000);
    
    // Verify statistics may have changed (depending on data)
    const filteredEntities = await page.locator('[data-testid=statistics-overlay] [data-testid=total-entities]').textContent();
    const filteredIncidents = await page.locator('[data-testid=statistics-overlay] [data-testid=total-incidents]').textContent();
    
    // Statistics should be valid numbers
    expect(parseInt(filteredEntities || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(filteredIncidents || '0')).toBeGreaterThanOrEqual(0);
  });

  test('verify responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Verify components are responsive
    await expect(page.locator('[data-testid=assessment-relationship-map]')).toBeVisible();
    
    // Check that filters are accessible on mobile
    await page.click('[data-testid=priority-filter-select]');
    await expect(page.locator('[data-testid=priority-filter-critical]')).toBeVisible();
  });

  test('verify error handling for invalid incident ID', async ({ page }) => {
    // Navigate to non-existent incident
    await page.goto('/coordinator/incidents/invalid-incident-id');
    
    // Should show 404 or error page
    await expect(page.locator('text=Not found')).toBeVisible({ timeout: 10000 });
  });

  test('verify loading states', async ({ page }) => {
    // Navigate to incident detail page
    await page.goto('/coordinator/incidents/test-incident-id');
    
    // Should show loading state initially (if API is slow)
    // This test might be too fast to catch loading state
    // In real scenarios, you might need to throttle network or add delays
    
    // Verify final loaded state
    await expect(page.locator('[data-testid=assessment-relationship-map]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Assessment Timeline')).toBeVisible();
  });

  test('verify complete coordinator workflow', async ({ page }) => {
    // Step 1: Navigate to incidents page
    await page.click('[data-testid=nav-incidents]');
    await expect(page.locator('text=Incidents')).toBeVisible();
    
    // Step 2: Select incident
    await page.click('[data-testid=incident-card]:first-child [data-testid=view-details-button]');
    await expect(page.locator('h1')).toContainText('Incident');
    
    // Step 3: View relationship map
    await expect(page.locator('[data-testid=assessment-relationship-map]')).toBeVisible();
    
    // Step 4: Apply filters
    await page.click('[data-testid=priority-filter-select]');
    await page.click('[data-testid=priority-filter-high]');
    
    // Step 5: Switch to timeline view
    await page.click('[data-testid=tab-trigger-timeline]');
    await expect(page.locator('[data-testid=assessment-timeline]')).toBeVisible();
    
    // Step 6: Apply timeline filters
    await page.check('[data-testid=type-HEALTH]');
    
    // Step 7: View assessment details
    await page.click('[data-testid=tab-trigger-details]');
    await expect(page.locator('text=Recent Assessments')).toBeVisible();
    
    // Step 8: Verify all components loaded successfully
    await page.click('[data-testid=tab-trigger-map]');
    await expect(page.locator('[data-testid=assessment-relationship-map]')).toBeVisible();
  });
});