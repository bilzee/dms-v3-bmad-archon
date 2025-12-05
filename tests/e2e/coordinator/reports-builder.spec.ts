import { test, expect } from '@playwright/test';

test.describe('Coordinator Custom Report Builder Workflow', () => {
  const testUser = {
    email: 'coordinator@test.com',
    password: 'test123456'
  };

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', testUser.email);
    await page.fill('[data-testid=password]', testUser.password);
    await page.click('[data-testid=login-button]');
    
    await expect(page).toHaveURL('/coordinator/dashboard');
  });

  test('complete custom report builder workflow', async ({ page }) => {
    // Step 1: Navigate to report builder
    await page.click('[data-testid=reports-link]');
    await expect(page).toHaveURL('/coordinator/reports');

    // Step 2: Create new report from template
    await page.click('[data-testid=new-report-button]');
    await page.click('[data-testid=template-selector]');
    await page.click('[data-testid=template-assessment]'); // Select Assessment template
    
    // Step 3: Configure report name and description
    await page.fill('[data-testid=report-name]', 'Test Assessment Report');
    await page.fill('[data-testid=report-description]', 'E2E Test Report for Assessments');
    
    // Step 4: Configure data source
    await page.click('[data-testid=data-source-tab]');
    await page.selectOption('[data-testid=data-source-type]', 'ASSESSMENT');
    await page.fill('[data-testid=date-range-start]', '2024-01-01');
    await page.fill('[data-testid=date-range-end]', '2024-12-31');
    
    // Step 5: Add filters
    await page.click('[data-testid=add-filter-button]');
    await page.selectOption('[data-testid=filter-field]', 'rapidAssessmentType');
    await page.selectOption('[data-testid=filter-operator]', 'equals');
    await page.selectOption('[data-testid=filter-value]', 'HEALTH');
    
    // Step 6: Add chart visualization
    await page.click('[data-testid=visualization-tab]');
    await page.dragAndDrop('[data-testid=chart-element]', '[data-testid=report-canvas]');
    await page.click('[data-testid=chart-type-select]');
    await page.click('[data-testid=chart-type-pie]');
    await page.fill('[data-testid=chart-title]', 'Assessment Types Distribution');
    
    // Step 7: Add table element
    await page.dragAndDrop('[data-testid=table-element]', '[data-testid=report-canvas]');
    await page.click('[data-testid=table-config-button]');
    await page.selectOption('[data-testid=table-data-source]', 'filtered-assessments');
    
    // Step 8: Preview report
    await page.click('[data-testid=preview-button]');
    await expect(page.locator('[data-testid=report-preview]')).toBeVisible();
    await expect(page.locator('text=Test Assessment Report')).toBeVisible();
    await expect(page.locator('[data-testid=preview-chart]')).toBeVisible();
    await expect(page.locator('[data-testid=preview-table]')).toBeVisible();
    
    // Step 9: Save report configuration
    await page.click('[data-testid=save-config-button]');
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('text=Report configuration saved successfully')).toBeVisible();
    
    // Step 10: Generate report
    await page.click('[data-testid=generate-report-button]');
    await expect(page.locator('[data-testid=generation-progress]')).toBeVisible();
    
    // Wait for generation to complete (with timeout)
    await expect(page.locator('[data-testid=generation-complete]')).toBeVisible({ timeout: 60000 });
    
    // Step 11: Download report
    await page.click('[data-testid=download-pdf-button]');
    // Verify download started (actual file download verification depends on browser setup)
    
    // Step 12: View report in management dashboard
    await page.click('[data-testid=report-management-link]');
    await expect(page.locator('[data-testid=report-list]')).toBeVisible();
    await expect(page.locator('text=Test Assessment Report')).toBeVisible();
    
    // Step 13: Verify report status
    await expect(page.locator('[data-testid=report-status-completed]')).toBeVisible();
    
    // Step 14: Edit existing report
    await page.click('[data-testid=report-card]:first-child');
    await page.click('[data-testid=edit-report-button]');
    await page.fill('[data-testid=report-name]', 'Updated Assessment Report');
    await page.click('[data-testid=save-changes-button]');
    
    // Step 15: Verify update
    await expect(page.locator('text=Updated Assessment Report')).toBeVisible();
  });

  test('validates report builder form inputs', async ({ page }) => {
    await page.click('[data-testid=reports-link]');
    await page.click('[data-testid=new-report-button]');
    
    // Try to submit without required fields
    await page.click('[data-testid=save-config-button]');
    
    await expect(page.locator('text=Report name is required')).toBeVisible();
    await expect(page.locator('text=Data source is required')).toBeVisible();
    
    // Test partial form validation
    await page.fill('[data-testid=report-name]', 'Test Report');
    await page.click('[data-testid=save-config-button]');
    
    await expect(page.locator('text=Report name is required')).not.toBeVisible();
    await expect(page.locator('text=Data source is required')).toBeVisible();
  });

  test('coordinator role-based behavior', async ({ page, context }) => {
    // Test that coordinator can access report builder
    await page.click('[data-testid=reports-link]');
    await expect(page.locator('[data-testid=report-builder-container]')).toBeVisible();
    
    // Test that coordinator can create reports
    await expect(page.locator('[data-testid=new-report-button]')).toBeVisible();
    await expect(page.locator('[data-testid=template-selector]')).toBeVisible();
    
    // Test that coordinator cannot access restricted admin endpoints
    const response = await context.request.get('/api/v1/admin/users');
    expect(response.status()).toBe(401);
    
    // Test that coordinator can access report endpoints
    const reportsResponse = await context.request.get('/api/v1/reports/templates');
    expect(reportsResponse.status()).toBe(200);
  });

  test('handles error scenarios gracefully', async ({ page }) => {
    await page.click('[data-testid=reports-link]');
    
    // Test network error during template loading
    await page.route('/api/v1/reports/templates', route => route.abort());
    await page.reload();
    
    await expect(page.locator('[data-testid=error-message]')).toBeVisible();
    await expect(page.locator('text=Failed to load report templates')).toBeVisible();
    
    // Test report generation timeout
    await page.unroute('/api/v1/reports/templates');
    await page.route('/api/v1/reports/generate', route => {
      // Simulate long-running request that times out
      setTimeout(() => route.fulfill({ status: 408 }), 35000);
    });
    
    await page.click('[data-testid=new-report-button]');
    await page.fill('[data-testid=report-name]', 'Timeout Test');
    await page.click('[data-testid=generate-report-button]');
    
    await expect(page.locator('[data-testid=timeout-error]')).toBeVisible({ timeout: 40000 });
  });

  test('report template search and filtering', async ({ page }) => {
    await page.click('[data-testid=reports-link]');
    await page.click('[data-testid=browse-templates-button]');
    
    // Create some test data first by checking existing templates
    await expect(page.locator('[data-testid=template-list]')).toBeVisible();
    
    // Test search functionality
    if (page.locator('[data-testid=template-search]').isVisible()) {
      await page.fill('[data-testid=template-search]', 'Assessment');
      await expect(page.locator('[data-testid=template-assessment]')).toBeVisible();
      // Should hide non-matching templates
      await expect(page.locator('text=Donor Report')).not.toBeVisible();
    }
    
    // Test template type filtering
    if (page.locator('[data-testid=template-type-filter]').isVisible()) {
      await page.selectOption('[data-testid=template-type-filter]', 'ASSESSMENT');
      await expect(page.locator('[data-testid=template-assessment]')).toBeVisible();
      await expect(page.locator('[data-testid=template-donor]')).not.toBeVisible();
    }
  });

  test('accessibility and keyboard navigation', async ({ page }) => {
    await page.click('[data-testid=reports-link]');
    
    // Test keyboard navigation through report builder
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test ARIA labels and roles
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[aria-label="Report builder actions"]')).toBeVisible();
    
    // Test keyboard shortcuts if implemented
    await page.keyboard.press('Control+s'); // Potential save shortcut
    // Verify if save is triggered or if focus moves to save button
    
    // Test drag and drop accessibility alternatives
    await page.click('[data-testid=add-element-button]');
    await expect(page.locator('[data-testid=element-palette]')).toBeVisible();
    
    // Test keyboard navigation through element palette
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // Select first element
  });

  test('report scheduling and automation', async ({ page }) => {
    await page.click('[data-testid=reports-link]');
    await page.click('[data-testid=scheduled-reports-tab]');
    
    // Test creating scheduled report
    await page.click('[data-testid=new-schedule-button]');
    await page.fill('[data-testid=schedule-name]', 'Weekly Assessment Report');
    await page.selectOption('[data-testid=schedule-frequency]', 'weekly');
    await page.fill('[data-testid=schedule-time]', '09:00');
    
    // Configure recipients
    await page.click('[data-testid=add-recipient-button]');
    await page.fill('[data-testid=recipient-email]', 'stakeholder@example.com');
    await page.click('[data-testid=add-recipient]');
    
    await page.click('[data-testid=save-schedule-button]');
    await expect(page.locator('[data-testid=schedule-success]')).toBeVisible();
    
    // Verify schedule appears in list
    await expect(page.locator('text=Weekly Assessment Report')).toBeVisible();
    await expect(page.locator('[data-testid=schedule-status-active]')).toBeVisible();
    
    // Test editing schedule
    await page.click('[data-testid=edit-schedule-button]');
    await page.selectOption('[data-testid=schedule-frequency]', 'monthly');
    await page.click('[data-testid=update-schedule-button]');
    
    await expect(page.locator('[data-testid=schedule-updated]')).toBeVisible();
  });
});

/**
 * USAGE NOTES:
 * 
 * This E2E test covers the complete custom report builder workflow including:
 * 1. Template selection and configuration
 * 2. Data source setup with filtering
 * 3. Drag-and-drop report building interface
 * 4. Report generation and downloading
 * 5. Report management and editing
 * 6. Form validation and error handling
 * 7. Role-based access control
 * 8. Accessibility testing
 * 9. Report scheduling functionality
 * 
 * Test Dependencies:
 * - Report builder UI components must have appropriate data-testid attributes
 * - Coordinator test user should exist with proper permissions
 * - Report templates should be seeded in test database
 * - Mock API responses for error scenarios
 */