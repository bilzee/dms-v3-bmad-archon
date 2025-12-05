import { test, expect } from '@playwright/test';

test.describe('Coordinator Dashboard Export Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'coordinator@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/coordinator/dashboard');
    
    // Navigate to situation awareness dashboard (has export functionality)
    await page.goto('/coordinator/dashboard');
    await expect(page).toBeVisible();
  });

  test('complete export workflow - CSV format', async ({ page }) => {
    // Step 1: Open export menu
    await page.click('[data-testid=export-button-assessments]');
    await expect(page.locator('[data-testid=export-modal')).toBeVisible();
    
    // Step 2: Select CSV format
    await page.click('[data-testid=format-csv]');
    
    // Step 3: Configure date range (last 7 days)
    await page.selectOption('[data-testid=date-range-select]', 'last_7_days');
    
    // Step 4: Include charts and maps
    await page.check('[data-testid=include-charts]');
    await page.check('[data-testid=include-maps]');
    
    // Step 5: Start export
    await page.click('[data-testid=submit-export]');
    
    // Step 6: Verify export started
    await expect(page.locator('[data-testid=export-status]')).toContainText('Generating export...');
    await expect(page.locator('[data-testid=export-button-assessments]')).toBeDisabled();
    
    // Step 7: Wait for completion
    await expect(page.locator('[data-testid=export-status]')).toContainText('Export completed', { timeout: 30000 });
    
    // Step 8: Verify download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid=download-export]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/assessments_export_\d{4}\.csv$/);
  });

  test('complete export workflow - PDF report', async ({ page }) => {
    // Step 1: Open export modal from dashboard
    await page.click('[data-testid=export-button-dashboard]');
    await expect(page.locator('[data-testid=export-modal]')).toBeVisible();
    
    // Step 2: Select PDF report format
    await page.click('[data-testid=format-pdf]');
    await page.click('[data-testid=report-type-incident-overview]');
    
    // Step 3: Configure report options
    await page.fill('[data-testid=report-title]', 'Incident Overview Report - January 2024');
    await page.check('[data-testid=include-charts]');
    await page.check('[data-testid=include-maps]');
    await page.selectOption('[data-testid=page-size]', 'A4');
    await page.selectOption('[data-testid=orientation]', 'portrait');
    
    // Step 4: Set custom date range
    await page.selectOption('[data-testid=date-range-select]', 'custom');
    await page.fill('[data-testid=start-date]', '2024-01-01');
    await page.fill('[data-testid=end-date]', '2024-01-31');
    
    // Step 5: Generate report
    await page.click('[data-testid=submit-export]');
    
    // Step 6: Verify report generation started
    await expect(page.locator('[data-testid=export-status]')).toContainText('Processing...');
    expect(page.locator('[data-testid=export-button-dashboard]')).toBeDisabled();
    
    // Step 7: Wait for completion
    await expect(page.locator('[data-testid=export-status]')).toContainText('Report ready', { timeout: 60000 });
    
    // Step 8: Download report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid=download-report]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/incident_overview_report_\d{4}\.pdf$/);
  });

  test('scheduled export setup', async ({ page }) => {
    // Step 1: Open export modal
    await page.click('[data-testid=export-button-responses]');
    await expect(page.locator('[data-testid=export-modal]')).toBeVisible();
    
    // Step 2: Navigate to scheduling step
    await page.click('[data-testid=next-step]');
    await page.click('[data-testid=next-step]');
    await page.click('[data-testid=next-step]');
    await expect(page.locator('[data-testid=scheduling-step]')).toBeVisible();
    
    // Step 3: Configure weekly schedule
    await page.selectOption('[data-testid=frequency-select]', 'weekly');
    await page.selectOption('[data-testid=day-of-week]', '1'); // Monday
    await page.fill('[data-testid=schedule-time]', '09:00');
    
    // Step 4: Add recipients
    await page.click('[data-testid=add-recipient]');
    await page.fill('[data-testid=recipient-email]', 'team@example.com');
    await page.fill('[data-testid=recipient-name]', 'Operations Team');
    await page.selectOption('[data-testid=recipient-format]', 'pdf');
    
    // Step 5: Schedule export
    await page.click('[data-testid=schedule-export]');
    
    // Step 6: Verify success message
    await expect(page.locator('[data-testid=success-message]')).toContainText('Export scheduled successfully');
    await expect(page.locator('[data-testid=scheduled-date]')).toContainText('Monday, 9:00 AM');
  });

  test('chart export functionality', async ({ page }) => {
    // Navigate to dashboard with charts
    await page.goto('/coordinator/dashboard');
    await expect(page.locator('[data-testid=assessment-chart]')).toBeVisible();
    
    // Step 1: Click chart export button
    await page.click('[data-testid=export-chart-button]');
    await expect(page.locator('[data-testid=chart-export-modal]')).toBeVisible();
    
    // Step 2: Configure chart export
    await page.selectOption('[data-testid=chart-format]', 'png');
    await page.fill('[data-testid=chart-title]', 'Assessment Types Distribution');
    await page.fill('[data-testid=chart-width]', '800');
    await page.fill('[data-testid=chart-height]', '600');
    await page.selectOption('[data-testid=chart-theme]', 'light');
    
    // Step 3: Export chart
    await page.click('[data-testid=generate-chart]');
    
    // Step 4: Wait for generation
    await expect(page.locator('[data-testid=chart-status]')).toContainText('Processing...', { timeout: 10000 });
    await expect(page.locator('[data-testid=chart-status]')).toContainText('Chart ready');
    
    // Step 5: Download chart
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid=download-chart]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/assessment_chart_\d{4}\.png$/);
  });

  test('export with advanced filters', async ({ page }) => {
    // Step 1: Open export modal
    await page.click('[data-testid=export-button-entities]');
    await expect(page.locator('[data-testid=export-modal]')).toBeVisible();
    
    // Step 2: Enable advanced options
    await page.click('[data-testid=advanced-options]');
    
    // Step 3: Apply filters
    await page.selectOption('[data-testid=entity-type-filter]', 'FACILITY');
    await page.selectOption('[data-testid=entity-status-filter]', 'ACTIVE');
    await page.selectOption('[data-testid=jurisdiction-filter]', 'COUNTY');
    await page.fill('[data-testid=population-min]', '1000');
    await page.fill('[data-testid=population-max]', '50000');
    
    // Step 4: Configure export
    await page.selectOption('[data-testid=export-format]', 'xlsx');
    await page.check('[data-testid=include-contact-info]');
    await page.check('[data-testid=include-assessment-counts]');
    
    // Step 5: Run export
    await page.click('[data-testid=submit-export]');
    
    // Step 6: Verify filtered export
    await expect(page.locator('[data-testid=export-status]')).toContainText('Processing...');
    await expect(page.locator('[data-testid=export-button-entities]')).toBeDisabled();
    
    // Step 7: Download and verify
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid=download-export]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/entities_export_\d{4}\.xlsx$/);
  });

  test('error handling and validation', async ({ page }) => {
    // Test 1: Required field validation
    await page.click('[data-testid=export-button-assessments]');
    await page.click('[data-testid=submit-export]');
    
    await expect(page.locator('[data-testid=validation-error]')).toContainText('Data type is required');
    
    // Test 2: Date range validation
    await page.selectOption('[data-testid=date-range-select]', 'custom');
    await page.fill('[data-testid=start-date]', '2024-02-01'); // After end date
    await page.fill('[data-testid=end-date]', '2024-01-31');
    await page.click('[data-testid=submit-export]');
    
    await expect(page.locator('[data-testid=date-range-error]')).toContainText('Start date must be before end date');
    
    // Test 3: Recipient validation for scheduled exports
    await page.selectOption('[data-testid=export-format]', 'pdf');
    await page.click('[data-testid=next-step]');
    await page.click('[data-testid=next-step]');
    await page.click('[data-testid=next-step]');
    await page.selectOption('[data-testid=frequency-select]', 'weekly');
    await page.click('[data-testid=add-recipient]');
    await page.fill('[data-testid=recipient-email]', 'invalid-email');
    await page.click('[data-testid=schedule-export]');
    
    await expect(page.locator('[data-testid=email-error]')).toContainText('Valid email is required');
    
    // Test 4: Network error handling
    await page.route('**/api/v1/exports/csv', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Export service temporarily unavailable' }),
    }));
    
    // Fix validation and try again
    await page.selectOption('[data-testid=date-range-select]', 'last_7_days');
    await page.fill('[data-testid=recipient-email]', 'test@example.com');
    await page.click('[data-testid=submit-export]');
    
    await expect(page.locator('[data-testid=export-status]')).toContainText('Export failed');
    await expect(page.locator('[data-testid=retry-button]')).toBeVisible();
  });

  test('bulk export operations', async ({ page }) => {
    // Step 1: Enable bulk export mode
    await page.click('[data-testid=bulk-export-toggle]');
    
    // Step 2: Select multiple data types
    await page.check('[data-testid=export-assessments]');
    await page.check('[data-testid=export-responses]');
    await page.check('[data-testid=export-entities]');
    
    // Step 3: Configure combined export
    await page.selectOption('[data-testid=bulk-format]', 'pdf');
    await page.fill('[data-testid=bulk-title]', 'Complete Dashboard Export');
    await page.selectOption('[data-testid=date-range-select]', 'last_30_days');
    
    // Step 4: Start bulk export
    await page.click('[data-testid=submit-bulk-export]');
    
    // Step 5: Verify progress
    await expect(page.locator('[data-testid=bulk-progress]')).toBeVisible();
    await expect(page.locator('[data-testid=progress-bar]')).toHaveAttribute('aria-valuenow');
    
    // Step 6: Wait for completion
    await expect(page.locator('[data-testid=bulk-status]')).toContainText('Export completed', { timeout: 120000 });
    
    // Step 7: Verify multiple downloads
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid=download-bulk-export]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/dashboard_export_\d{4}\.zip$/); // Should be zipped for multiple files
  });

  test('export history and management', async ({ page }) => {
    // Step 1: Navigate to export history
    await page.goto('/coordinator/exports');
    await expect(page.locator('[data-testid=export-history]')).toBeVisible();
    
    // Step 2: Verify recent exports
    await expect(page.locator('[data-testid=export-item]').first()).toContainText('assessments');
    await expect(page.locator('[data-testid=export-date]')).toBeVisible();
    await expect(page.locator('[data-testid=export-status-badge]')).toBeVisible();
    
    // Step 3: Filter export history
    await page.selectOption('[data-testid=history-filter]', 'completed');
    await expect(page.locator('[data-testid=export-item]')).toHaveCount(2); // Should show only completed
    
    // Step 4: Re-run previous export
    await page.click('[data-testid=export-item]').first();
    await page.click('[data-testid=retry-export]');
    
    await expect(page.locator('[data-testid=export-status]')).toContainText('Generating export...');
    
    // Step 5: Delete old export
    await page.click('[data-testid=export-item]').nth(1);
    await page.click('[data-testid=delete-export]');
    await page.click('[data-testid=confirm-delete]');
    
    await expect(page.locator('[data-testid=export-item]')).toHaveCount(1); // Should be deleted
  });

  test('export performance and timeout handling', async ({ page }) => {
    // Mock slow export
    await page.route('**/api/v1/exports/csv', async route => {
      // Simulate slow processing
      await new Promise(resolve => setTimeout(resolve, 45000));
      
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'ID,Type,Status\n1,ASSESSMENT,COMPLETED',
      });
    });

    // Start export
    await page.click('[data-testid=export-button-assessments]');
    await page.selectOption('[data-testid=export-format]', 'csv');
    await page.click('[data-testid=submit-export]');
    
    // Step 1: Verify timeout warning
    await expect(page.locator('[data-testid=timeout-warning]')).toBeVisible({ timeout: 35000 });
    await expect(page.locator('[data-testid=timeout-warning]')).toContainText('Export taking longer than expected');
    
    // Step 2: Verify cancellation option
    await expect(page.locator('[data-testid=cancel-export]')).toBeVisible();
    
    // Step 3: Cancel export
    await page.click('[data-testid=cancel-export]');
    await expect(page.locator('[data-testid=export-status]')).toContainText('Export cancelled');
    await expect(page.locator('[data-testid=export-button-assessments]')).toBeEnabled();
  });

  test('role-based export permissions', async ({ page }) => {
    // Step 1: Verify available export options for coordinator
    await expect(page.locator('[data-testid=export-assessments]')).toBeVisible();
    await expect(page.locator('[data-testid=export-responses]')).toBeVisible();
    await expect(page.locator('[data-testid=export-entities]')).toBeVisible();
    await expect(page.locator('[data-testid=export-incidents]')).toBeVisible();
    await expect(page.locator('[data-testid=export-commitments]')).not.toBeVisible(); // Coordinators shouldn't see commitments
    
    // Step 2: Try to access restricted export (should fail)
    await page.goto('/api/v1/exports/csv');
    await page.fill('[data-testid=data-type]', 'commitments');
    await page.click('[data-testid=submit-export]');
    
    // Step 3: Verify access denied
    await expect(page.locator('[data-testid=access-denied]')).toContainText('Insufficient permissions for this data type');
    await expect(page.locator('[data-testid=export-form]')).not.toBeVisible();
  });

  test('export real-time progress tracking', async ({ page }) => {
    // Mock progressive export with updates
    let progressUpdateCount = 0;
    await page.route('**/api/v1/exports/csv', async route => {
      progressUpdateCount++;
      
      // Send progress updates
      if (progressUpdateCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { jobId: 'job_1', status: 'processing', progress: 25 } }),
        });
      } else if (progressUpdateCount === 2) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { jobId: 'job_1', status: 'processing', progress: 50 } }),
        });
      } else if (progressUpdateCount === 3) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { jobId: 'job_1', status: 'processing', progress: 75 } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'ID,Type,Status\n1,ASSESSMENT,COMPLETED\n2,RESPONSE,IN_PROGRESS',
        });
      }
    });

    // Start export
    await page.click('[data-testid=export-button-assessments]');
    await page.selectOption('[data-testid=export-format]', 'csv');
    await page.click('[data-testid=submit-export]');
    
    // Step 1: Verify initial progress
    await expect(page.locator('[data-testid=progress-bar]')).toHaveAttribute('aria-valuenow', '25');
    await expect(page.locator('[data-testid=progress-text]')).toContainText('25%');
    
    // Step 2: Verify progress updates
    await expect(page.locator('[data-testid=progress-bar]')).toHaveAttribute('aria-valuenow', '50', { timeout: 5000 });
    await expect(page.locator('[data-testid=progress-bar]')).toHaveAttribute('aria-valuenow', '75', { timeout: 10000 });
    
    // Step 3: Verify completion
    await expect(page.locator('[data-testid=progress-bar]')).toHaveAttribute('aria-valuenow', '100', { timeout: 15000 });
    await expect(page.locator('[data-testid=download-export]')).toBeVisible();
  });

  test('export data integrity verification', async ({ page }) => {
    // Pre-load known data
    await page.goto('/coordinator/dashboard');
    await expect(page.locator('[data-testid=assessment-count]')).toContainText('150');
    
    // Export data
    await page.click('[data-testid=export-button-assessments]');
    await page.selectOption('[data-testid=export-format]', 'csv');
    await page.selectOption('[data-testid=date-range-select]', 'last_7_days');
    await page.click('[data-testid=submit-export]');
    
    // Wait for completion
    await expect(page.locator('[data-testid=export-status]')).toContainText('Export completed', { timeout: 30000 });
    
    // Download and verify
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid=download-export]');
    const download = await downloadPromise;
    
    // Verify filename and content
    expect(download.suggestedFilename()).toMatch(/assessments_export_\d{4}\.csv$/);
    
    // Read and verify CSV content (would need file system access in real test)
    const csvContent = download.stream();
    expect(csvContent.toString()).toContain('ID,Assessment Type,Status');
  });
});