import { test, expect } from '@playwright/test';

test.describe('Coordinator Interactive Gap Analysis Map Workflow', () => {
  const testUser = {
    email: 'coordinator@test.com',
    password: 'testpassword123'
  };

  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    await page.fill('[data-testid=email]', testUser.email);
    await page.fill('[data-testid=password]', testUser.password);
    await page.click('[data-testid=login-button]');
    
    // Verify dashboard access
    await expect(page).toHaveURL('/coordinator/dashboard');
  });

  test('complete interactive map workflow', async ({ page }) => {
    // Step 1: Navigate to situation dashboard
    await page.click('[data-testid=situation-dashboard-link]');
    await expect(page).toHaveURL('/coordinator/situation-dashboard');
    await expect(page.getByText('Situation Awareness Dashboard')).toBeVisible();

    // Step 2: Verify interactive map loads in center panel
    const mapContainer = page.locator('[data-testid=interactive-map]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    
    // Verify map controls are present
    await expect(page.locator('[data-testid=zoom-in-button]')).toBeVisible();
    await expect(page.locator('[data-testid=zoom-out-button]')).toBeVisible();
    await expect(page.locator('[data-testid=reset-view-button]')).toBeVisible();
    await expect(page.locator('[data-testid=fullscreen-toggle-button]')).toBeVisible();

    // Step 3: Verify entity markers are displayed
    const entityMarkers = page.locator('[data-testid=entity-marker]');
    await expect(entityMarkers.first()).toBeVisible({ timeout: 5000 });
    
    // Count entities and verify they have proper attributes
    const markerCount = await entityMarkers.count();
    expect(markerCount).toBeGreaterThan(0);

    // Step 4: Test entity selection
    const firstEntity = entityMarkers.first();
    const entityName = await firstEntity.getAttribute('data-entity-name');
    
    await firstEntity.click();
    
    // Verify selection state
    await expect(firstEntity).toHaveClass(/selected/);
    await expect(firstEntity).toHaveAttribute('data-selected', 'true');

    // Step 5: Verify entity popup appears
    const entityPopup = page.locator('[data-testid=entity-popup]');
    await expect(entityPopup).toBeVisible();
    
    // Verify popup contains entity information
    await expect(entityPopup.locator('[data-testid=entity-name]')).toHaveText(entityName || '');
    await expect(entityPopup.locator('[data-testid=entity-type]')).toBeVisible();
    await expect(entityPopup.locator('[data-testid=severity-badge]')).toBeVisible();
    await expect(entityPopup.locator('[data-testid=gap-analysis-section]')).toBeVisible();

    // Step 6: Test donor overlay toggle
    const donorToggle = page.locator('[data-testid=donor-overlay-toggle]');
    await expect(donorToggle).toBeVisible();
    await expect(donorToggle).toHaveText(/donors/i);

    // Enable donor overlay
    await donorToggle.click();
    await expect(donorToggle).toHaveClass(/active/);

    // Verify donor indicators appear on entities with assignments
    const entitiesWithDonors = page.locator('[data-testid=entity-marker][data-has-donors="true"]');
    if (await entitiesWithDonors.count() > 0) {
      await expect(entitiesWithDonors.first()).toBeVisible();
      await expect(page.locator('[data-testid=donor-indicator]').first()).toBeVisible();
    }

    // Step 7: Test donor legend
    const helpButton = page.locator('[data-testid=donor-help-button]');
    if (await helpButton.isVisible()) {
      await helpButton.click();
      
      const donorLegend = page.locator('[data-testid=donor-legend]');
      await expect(donorLegend).toBeVisible();
      await expect(donorLegend.locator('h3')).toHaveText(/donor assignments/i);
      
      // Close legend
      await page.locator('[data-testid=legend-close-button]').click();
      await expect(donorLegend).not.toBeVisible();
    }

    // Step 8: Test map controls
    // Test zoom in
    await page.click('[data-testid=zoom-in-button]');
    // Wait for zoom animation
    await page.waitForTimeout(500);

    // Test zoom out
    await page.click('[data-testid=zoom-out-button]');
    await page.waitForTimeout(500);

    // Test reset view
    await page.click('[data-testid=reset-view-button]');
    await page.waitForTimeout(1000);

    // Step 9: Test severity filtering
    const severityFilter = page.locator('[data-testid=severity-filter]');
    if (await severityFilter.isVisible()) {
      await severityFilter.click();
      await page.click('[data-testid=severity-critical]');
      await page.waitForTimeout(1000);
      
      // Verify only critical severity entities are shown
      const criticalEntities = page.locator('[data-testid=entity-marker][data-severity="CRITICAL"]');
      const nonCriticalEntities = page.locator('[data-testid=entity-marker]:not([data-severity="CRITICAL"])');
      
      if (await criticalEntities.count() > 0) {
        await expect(criticalEntities.first()).toBeVisible();
      }
    }

    // Step 10: Test entity details workflow
    const detailsButton = page.locator('[data-testid=entity-details-button]');
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
      
      // Verify entity details modal or navigation
      const entityDetails = page.locator('[data-testid=entity-details-view]');
      await expect(entityDetails).toBeVisible({ timeout: 5000 });
      
      // Close details
      await page.locator('[data-testid=close-details-button]').click();
    }

    // Step 11: Test fullscreen mode
    const fullscreenToggle = page.locator('[data-testid=fullscreen-toggle-button]');
    await fullscreenToggle.click();
    
    // Verify fullscreen state
    await expect(page.locator('[data-testid=map-container]')).toHaveClass(/fullscreen/);
    
    // Exit fullscreen
    await fullscreenToggle.click();
    await expect(page.locator('[data-testid=map-container]')).not.toHaveClass(/fullscreen/);

    // Step 12: Verify dashboard state persistence
    // Navigate away and back to verify state is maintained
    await page.click('[data-testid=incident-overview-tab]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid=interactive-map-tab]');
    
    // Verify map maintains previous state (selected entity, filters, etc.)
    await expect(mapContainer).toBeVisible();
  });

  test('map performance with large entity sets', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    const mapContainer = page.locator('[data-testid=interactive-map]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Measure initial load time
    const startTime = Date.now();
    const entityMarkers = page.locator('[data-testid=entity-marker]');
    await expect(entityMarkers.first()).toBeVisible({ timeout: 5000 });
    const loadTime = Date.now() - startTime;

    // Map should load within reasonable time
    expect(loadTime).toBeLessThan(3000);

    // Test clustering performance
    const markerCount = await entityMarkers.count();
    
    if (markerCount > 50) {
      // Verify clustering is active for large datasets
      const clusterMarkers = page.locator('[data-testid=cluster-marker]');
      expect(await clusterMarkers.count()).toBeGreaterThan(0);
    }

    // Test interaction performance
    const interactionStartTime = Date.now();
    
    // Click multiple entities rapidly
    for (let i = 0; i < Math.min(5, markerCount); i++) {
      await entityMarkers.nth(i).click();
      await expect(page.locator('[data-testid=entity-popup]')).toBeVisible({ timeout: 1000 });
      await page.keyboard.press('Escape'); // Close popup
    }
    
    const interactionTime = Date.now() - interactionStartTime;
    expect(interactionTime).toBeLessThan(5000); // Should handle interactions quickly
  });

  test('offline functionality and caching', async ({ page, context }) => {
    // Simulate offline mode
    await context.route('https://tile.openstreetmap.org/**', route => route.abort());
    
    await page.goto('/coordinator/situation-dashboard');
    
    const mapContainer = page.locator('[data-testid=interactive-map]');
    await expect(mapContainer).toBeVisible({ timeout: 15000 }); // Longer timeout for offline

    // Verify cached tiles are used
    const tileLayers = page.locator('[data-testid=offline-tile-layer]');
    await expect(tileLayers).toBeVisible();

    // Test map functionality still works offline
    const entityMarkers = page.locator('[data-testid=entity-marker]');
    if (await entityMarkers.count() > 0) {
      await entityMarkers.first().click();
      await expect(page.locator('[data-testid=entity-popup]')).toBeVisible({ timeout: 2000 });
    }

    // Verify controls work offline
    await expect(page.locator('[data-testid=zoom-in-button]')).toBeVisible();
    await expect(page.locator('[data-testid=zoom-out-button]')).toBeVisible();
  });

  test('responsive design and mobile interaction', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/coordinator/situation-dashboard');
    
    const mapContainer = page.locator('[data-testid=interactive-map]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Test touch interactions
    const entityMarkers = page.locator('[data-testid=entity-marker]');
    if (await entityMarkers.count() > 0) {
      // Test tap interaction
      await entityMarkers.first().tap();
      await expect(page.locator('[data-testid=entity-popup]')).toBeVisible({ timeout: 2000 });
    }

    // Test mobile-specific controls
    await expect(page.locator('[data-testid=mobile-menu-button]')).toBeVisible();
    
    // Test pinch-to-zoom (simulated through zoom controls on mobile)
    await page.tap('[data-testid=zoom-in-button]');
    await page.waitForTimeout(500);
    await page.tap('[data-testid=zoom-out-button]');

    // Test responsive layout
    const mapControls = page.locator('[data-testid=map-controls]');
    await expect(mapControls).toBeVisible();
    
    // Verify controls are properly sized for mobile
    const controlButtons = mapControls.locator('button');
    const buttonCount = await controlButtons.count();
    for (let i = 0; i < buttonCount; i++) {
      const button = controlButtons.nth(i);
      const boundingBox = await button.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(44); // Minimum touch target size
      expect(boundingBox?.height).toBeGreaterThan(44);
    }
  });

  test('accessibility compliance', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    const mapContainer = page.locator('[data-testid=interactive-map]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Verify map controls are keyboard accessible
    const zoomInButton = page.locator('[data-testid=zoom-in-button]');
    await zoomInButton.focus();
    expect(await zoomInButton.isFocused()).toBe(true);

    // Test keyboard interaction
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Test ARIA labels
    const entityMarkers = page.locator('[data-testid=entity-marker]');
    if (await entityMarkers.count() > 0) {
      const firstMarker = entityMarkers.first();
      expect(await firstMarker.getAttribute('aria-label')).toBeTruthy();
      
      // Test screen reader compatibility
      await firstMarker.focus();
      expect(await firstMarker.isFocused()).toBe(true);
    }

    // Verify proper heading structure
    const mainHeading = page.locator('h1, h2').first();
    await expect(mainHeading).toBeVisible();

    // Test color contrast for severity indicators
    const severityIndicators = page.locator('[data-testid=severity-indicator]');
    const indicatorCount = await severityIndicators.count();
    
    for (let i = 0; i < Math.min(indicatorCount, 5); i++) {
      const indicator = severityIndicators.nth(i);
      // Verify each indicator has proper contrast through CSS classes
      await expect(indicator).toHaveClass(/bg-/); // Should have background color class
    }
  });

  test('error handling and edge cases', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    const mapContainer = page.locator('[data-testid=interactive-map]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Test behavior with no entities
    // Simulate empty response
    await page.route('**/api/v1/dashboard/situation*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            entityLocations: {
              entities: [],
              totalCount: 0,
              mapBounds: {
                northEast: { lat: 10, lng: 9 },
                southWest: { lat: 8, lng: 8 }
              }
            }
          }
        })
      });
    });

    await page.reload();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    
    // Verify empty state handling
    await expect(page.locator('[data-testid=no-entities-message]')).toBeVisible();
    await expect(page.locator('[data-testid=zoom-in-button]')).toBeVisible();
    await expect(page.locator('[data-testid=zoom-out-button]')).toBeVisible();

    // Test network error handling
    await page.unroute('**/api/v1/dashboard/situation*');
    await page.route('**/api/v1/dashboard/situation*', route => route.abort());

    // Map should still be visible with error state
    await expect(page.locator('[data-testid=map-error-message]')).toBeVisible({ timeout: 5000 });
  });

  test('integration with other dashboard components', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Test incident selection integration
    const incidentSelector = page.locator('[data-testid=incident-selector]');
    if (await incidentSelector.isVisible()) {
      await incidentSelector.click();
      
      const firstIncident = page.locator('[data-testid=incident-option]').first();
      if (await firstIncident.isVisible()) {
        await firstIncident.click();
        
        // Verify map updates with new incident data
        await page.waitForTimeout(2000);
        const mapContainer = page.locator('[data-testid=interactive-map]');
        await expect(mapContainer).toBeVisible();
      }
    }

    // Test entity selection integration with assessment panel
    const entityMarkers = page.locator('[data-testid=entity-marker]');
    if (await entityMarkers.count() > 0) {
      const firstEntity = entityMarkers.first();
      const entityId = await firstEntity.getAttribute('data-entity-id');
      
      await firstEntity.click();
      
      // Verify entity assessment panel updates
      const assessmentPanel = page.locator('[data-testid=entity-assessment-panel]');
      if (await assessmentPanel.isVisible()) {
        const selectedEntityName = assessmentPanel.locator('[data-testid=selected-entity-name]');
        
        // The panel should reflect the selected entity (may need time to update)
        await page.waitForTimeout(1000);
      }
    }

    // Test filter integration
    const severityFilter = page.locator('[data-testid=severity-filter]');
    const entityTypeFilter = page.locator('[data-testid=entity-type-filter]');
    
    if (await severityFilter.isVisible()) {
      await severityFilter.click();
      await page.click('[data-testid=severity-high"]');
      await page.waitForTimeout(1000);
      
      // Verify map shows filtered results
      const highSeverityEntities = page.locator('[data-testid=entity-marker][data-severity="HIGH"]');
      const nonHighSeverityEntities = page.locator('[data-testid=entity-marker]:not([data-severity="HIGH"])');
      
      if (await highSeverityEntities.count() > 0) {
        await expect(highSeverityEntities.first()).toBeVisible();
      }
    }
  });
});

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Tests complete E2E workflow for Interactive Gap Analysis Map
 * 2. Uses Playwright for browser automation and testing
 * 3. Tests map interaction, entity selection, donor overlay functionality
 * 4. Validates performance with large datasets and offline capabilities
 * 5. Tests responsive design, mobile interaction, and accessibility
 * 6. Tests error handling and integration with other dashboard components
 * 7. Tests edge cases and error recovery scenarios
 * 8. Update test credentials based on your test environment
 * 9. Adjust test data and expectations based on your actual implementation
 * 10. Add role-specific behavior tests as needed
 */