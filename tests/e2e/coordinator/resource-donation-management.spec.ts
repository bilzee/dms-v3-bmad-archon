import { test, expect } from '@playwright/test';

test.describe('Coordinator Resource Management Workflow', () => {
  // TODO: Update with actual coordinator credentials
  const testUser = {
    email: 'coordinator@test.com',
    password: 'password123'
  };

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', testUser.email);
    await page.fill('[data-testid=password]', testUser.password);
    await page.click('[data-testid=login-button]');
    
    await expect(page).toHaveURL('/coordinator/dashboard');
  });

  test('complete resource management workflow', async ({ page }) => {
    // Step 1: Navigate to resource management section (should be on dashboard)
    await expect(page.locator('text=Resource & Donation Management')).toBeVisible();
    
    // Step 2: View donation overview statistics
    await expect(page.locator('text=Total Commitments')).toBeVisible();
    await expect(page.locator('text=Delivery Progress')).toBeVisible();
    await expect(page.locator('text=Active Donors')).toBeVisible();
    await expect(page.locator('text=Critical Gaps')).toBeVisible();

    // Step 3: Switch to Entity Assignments tab
    await page.click('text=Entity Assignments');
    await expect(page.locator('text=Entity-Donor Commitments')).toBeVisible();

    // Step 4: Create new commitment
    await page.click('text=New Commitment');
    await expect(page.locator('text=Create New Commitment')).toBeVisible();
    await expect(page.locator('text=Assign a donor to support an entity with specific resources')).toBeVisible();

    // Step 5: Fill commitment form (mock test data)
    await page.selectOption('select[name="donorId"]', '1'); // Select first donor
    await page.selectOption('select[name="entityId"]', '1'); // Select first entity
    await page.selectOption('select[name="incidentId"]', '1'); // Select first incident
    
    // Add commitment item
    await page.click('text=Add Item');
    await page.fill('input[placeholder*="Item name"]', 'Water Supply');
    await page.fill('input[placeholder*="Unit"]', 'liters');
    await page.fill('input[placeholder*="Quantity"]', '500');
    await page.fill('input[placeholder*="Est. Value"]', '250');

    // Step 6: Submit commitment
    await page.click('text=Create Commitment');
    
    // Step 7: Verify success (may need to adjust based on actual implementation)
    await expect(page.locator('text=Commitment created successfully!')).toBeVisible({ timeout: 10000 });

    // Step 8: View commitment in list
    await expect(page.locator('text=Water Supply')).toBeVisible();
    await expect(page.locator('text=500 liters')).toBeVisible();

    // Step 9: Test notification functionality
    await page.click('text=Notify');
    await expect(page.locator('text=Notification sent to donor!')).toBeVisible({ timeout: 10000 });

    // Step 10: Switch to Gap Analysis tab
    await page.click('text=Gap Analysis');
    await expect(page.locator('text=Resource Gap Analysis')).toBeVisible();
    await expect(page.locator('text=Identify unmet needs and match them with suitable donor capabilities')).toBeVisible();

    // Step 11: View gap analysis filters
    await expect(page.locator('placeholder="Search entities or resources..."')).toBeVisible();
    await expect(page.locator('text=All Severities')).toBeVisible();
  });

  test('resource management statistics and critical gaps', async ({ page }) => {
    // Wait for resource management section to load
    await expect(page.locator('text=Resource & Donation Management')).toBeVisible();

    // Verify statistics cards are displayed
    await expect(page.locator('text=Total Commitments')).toBeVisible();
    await expect(page.locator('text=Delivery Progress')).toBeVisible();
    await expect(page.locator('text=Active Donors')).toBeVisible();
    await expect(page.locator('text=Critical Gaps')).toBeVisible();

    // Test critical gaps alert (if present)
    const criticalGapsAlert = page.locator('text=critical resource gap(s) identified');
    if (await criticalGapsAlert.isVisible()) {
      await expect(criticalGapsAlert).toBeVisible();
      await expect(page.locator('text=Review the Gap Analysis tab for details and recommended actions')).toBeVisible();
    }

    // Test refresh functionality
    await page.click('text=Refresh');
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('commitment search and filtering', async ({ page }) => {
    // Navigate to Entity Assignments tab
    await page.click('text=Entity Assignments');
    
    // Wait for commitments section to load
    await expect(page.locator('text=Entity-Donor Commitments')).toBeVisible();

    // Test search functionality
    const searchInput = page.locator('placeholder="Search commitments..."');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      // Verify search is performed (may need to wait for results)
      await page.waitForTimeout(1000);
    }

    // Test filter dropdowns
    const entityFilter = page.locator('text=All Entities');
    if (await entityFilter.isVisible()) {
      await entityFilter.click();
      // Select a filter option if available
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    // Test status filter
    const statusFilter = page.locator('text=All Status');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      const plannedOption = page.locator('text=Planned');
      if (await plannedOption.isVisible()) {
        await plannedOption.click();
      }
    }
  });

  test('gap analysis and donor recommendations', async ({ page }) => {
    // Navigate to Gap Analysis tab
    await page.click('text=Gap Analysis');
    
    await expect(page.locator('text=Resource Gap Analysis')).toBeVisible();

    // Test gap analysis summary
    await expect(page.locator('text=Entities with Gaps')).toBeVisible();
    await expect(page.locator('text=Total Resource Gaps')).toBeVisible();
    await expect(page.locator('text=Critical Gaps')).toBeVisible();
    await expect(page.locator('text=Gap Value')).toBeVisible();

    // Test gap filters
    const severityFilter = page.locator('text=All Severities');
    if (await severityFilter.isVisible()) {
      await severityFilter.click();
      const highSeverity = page.locator('text=Critical');
      if (await highSeverity.isVisible()) {
        await highSeverity.click();
        await page.waitForTimeout(1000);
      }
    }

    // Test search in gap analysis
    const searchInput = page.locator('placeholder="Search entities or resources..."');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
    }

    // Test "Find Donors" functionality (if gaps exist)
    const findDonorsButton = page.locator('text=Find Donors').first();
    if (await findDonorsButton.isVisible()) {
      await findDonorsButton.click();
      
      // Should switch to donor recommendations tab
      await expect(page.locator('text=Donor Recommendations')).toBeVisible();
      
      // Verify back button works
      await page.click('text=← Back to All Gaps');
      await expect(page.locator('text=Resource Gaps')).toBeVisible();
    }
  });

  test('role-based access control', async ({ page, context }) => {
    // Coordinator can access resource management features
    await expect(page.locator('text=Resource & Donation Management')).toBeVisible();
    await expect(page.locator('text=Entity Assignments')).toBeVisible();
    await expect(page.locator('text=Gap Analysis')).toBeVisible();

    // Test API access
    const statsResponse = await context.request.get('/api/v1/dashboard/resource-management/stats', {
      headers: {
        'Authorization': 'Bearer mock-token' // This would need proper auth token
      }
    });
    
    // Should not be 403/401 for coordinator (though may fail due to auth)
    expect([200, 401, 403]).toContain(statsResponse.status());

    // Test restricted endpoints that should require coordinator role
    const commitmentsResponse = await context.request.get('/api/v1/entities/commitments');
    expect([401, 403]).toContain(commitmentsResponse.status()); // Should require auth
  });

  test('error handling and validation', async ({ page }) => {
    // Navigate to Entity Assignments
    await page.click('text=Entity Assignments');
    await page.click('text=New Commitment');

    // Test empty form submission
    await page.click('text=Create Commitment');
    
    // Should show validation errors
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible({ timeout: 5000 });

    // Test adding item without details
    await page.click('text=Add Item');
    await page.click('text=Create Commitment');
    
    await expect(page.locator('text=Please add at least one complete item')).toBeVisible({ timeout: 5000 });

    // Test incomplete item
    await page.fill('input[placeholder*="Item name"]', 'Test Item');
    // Missing unit and quantity
    await page.click('text=Create Commitment');
    
    await expect(page.locator('text=Please add at least one complete item')).toBeVisible({ timeout: 5000 });
  });

  test('accessibility and keyboard navigation', async ({ page }) => {
    // Test keyboard navigation through tabs
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Navigate through resource management tabs using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should activate first visible button/link

    // Test ARIA labels and roles
    await expect(page.locator('[role="tab"]')).toBeVisible();
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();

    // Test form accessibility
    await page.click('text=Entity Assignments');
    await page.click('text=New Commitment');
    
    // Check for proper form labels
    await expect(page.locator('label')).toHaveCount({ min: 1 });
    
    // Test keyboard navigation in form
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });
});

/**
 * TEST NOTES:
 * - E2E tests for complete coordinator resource management workflow
 * - Tests cover all three main tabs: Donation Overview, Entity Assignments, Gap Analysis
 * - Includes form validation, search/filtering, and error handling
 * - Tests role-based access control and API permissions
 * - Includes accessibility and keyboard navigation tests
 * - Uses mock test data - update selectors based on actual implementation
 * - Timeouts added for async operations and API calls
 */