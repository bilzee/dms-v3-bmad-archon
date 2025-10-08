import { test, expect } from '@playwright/test';

test.describe('Rapid Assessment Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as assessor
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'assessor@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login and redirect to assessor dashboard
    await expect(page).toHaveURL('/assessor');
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('Complete health assessment workflow', async ({ page }) => {
    // Navigate to rapid assessments
    await page.click('[data-testid="rapid-assessments-nav"]');
    await expect(page).toHaveURL('/assessor/rapid-assessments');

    // Click "New Assessment" button
    await page.click('[data-testid="new-assessment-button"]');
    
    // Select assessment type
    await page.click('[data-testid="assessment-type-health"]');
    await page.click('[data-testid="start-assessment-button"]');

    // Wait for health assessment form to load
    await expect(page.locator('[data-testid="health-assessment-form"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Health Assessment');

    // Fill in basic information
    await page.fill('[data-testid="assessor-name"]', 'John Assessor');
    await page.selectOption('[data-testid="affected-entity"]', 'entity-1');

    // Test GPS capture
    await page.click('[data-testid="capture-gps"]');
    await expect(page.locator('[data-testid="gps-status"]')).toContainText('Location captured');

    // Fill in health facility information
    await page.check('[data-testid="has-functional-clinic"]');
    await page.fill('[data-testid="number-health-facilities"]', '2');
    await page.selectOption('[data-testid="health-facility-type"]', 'Primary Health Center');
    await page.fill('[data-testid="qualified-health-workers"]', '3');

    // Check medical supplies
    await page.check('[data-testid="has-medicine-supply"]');
    await page.check('[data-testid="has-medical-supplies"]');
    await page.check('[data-testid="has-maternal-child-services"]');

    // Select health issues
    await page.check('[data-testid="health-issue-diarrhea"]');
    await page.check('[data-testid="health-issue-malaria"]');

    // Add additional details
    await page.fill('[data-testid="additional-health-details"]', 'Community needs additional malaria medication');

    // Test gap analysis visualization
    await expect(page.locator('[data-testid="gap-status-functional-clinic"]')).toContainText('No Gap');
    await expect(page.locator('[data-testid="gap-status-medicine-supply"]')).toContainText('No Gap');

    // Test photo upload (if in online mode)
    const isOnline = await page.evaluate(() => navigator.onLine);
    if (isOnline) {
      await page.setInputFiles('[data-testid="photo-upload"]', 'test-assets/health-facility.jpg');
      await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible();
    }

    // Save assessment
    await page.click('[data-testid="save-assessment-button"]');
    
    // Wait for save confirmation
    await expect(page.locator('[data-testid="success-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-alert"]')).toContainText('Health assessment created successfully');

    // Verify assessment appears in the list
    await page.goto('/assessor/rapid-assessments');
    await expect(page.locator('[data-testid="assessment-list"]')).toContainText('Health Assessment');
    await expect(page.locator('[data-testid="assessment-list"]')).toContainText('entity-1');
  });

  test('Complete WASH assessment workflow', async ({ page }) => {
    // Navigate to WASH assessment
    await page.click('[data-testid="rapid-assessments-nav"]');
    await page.click('[data-testid="new-assessment-button"]');
    await page.click('[data-testid="assessment-type-wash"]');
    await page.click('[data-testid="start-assessment-button"]');

    // Fill in WASH assessment form
    await expect(page.locator('[data-testid="wash-assessment-form"]')).toBeVisible();
    
    await page.fill('[data-testid="assessor-name"]', 'Jane Assessor');
    await page.selectOption('[data-testid="affected-entity"]', 'entity-2');

    // Water supply assessment
    await page.uncheck('[data-testid="water-sufficient"]');
    await page.check('[data-testid="water-source-borehole"]');
    await page.check('[data-testid="water-source-truck"]');

    // Sanitation assessment
    await page.fill('[data-testid="functional-latrines"]', '5');
    await page.uncheck('[data-testid="latrines-sufficient"]');
    await page.check('[data-testid="open-defecation-concerns"]');

    // Test critical gap indicators
    await expect(page.locator('[data-testid="wash-critical-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="wash-critical-alert"]')).toContainText('Critical WASH Issues');

    // Save assessment
    await page.click('[data-testid="save-assessment-button"]');
    await expect(page.locator('[data-testid="success-alert"]')).toBeVisible();
  });

  test('Offline functionality test', async ({ page, context }) => {
    // Simulate offline mode
    await context.setOffline(true);
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Create assessment offline
    await page.goto('/assessor/rapid-assessments');
    await page.click('[data-testid="new-assessment-button"]');
    await page.click('[data-testid="assessment-type-population"]');
    await page.click('[data-testid="start-assessment-button"]');

    // Fill population assessment
    await page.fill('[data-testid="assessor-name"]', 'Offline Assessor');
    await page.selectOption('[data-testid="affected-entity"]', 'entity-3');
    
    await page.fill('[data-testid="total-households"]', '50');
    await page.fill('[data-testid="total-population"]', '250');
    await page.fill('[data-testid="population-male"]', '130');
    await page.fill('[data-testid="population-female"]', '120');
    await page.fill('[data-testid="population-under5"]', '60');

    // Should see offline save message
    await page.click('[data-testid="save-assessment-button"]');
    await expect(page.locator('[data-testid="offline-save-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-save-alert"]')).toContainText('Assessment saved for offline sync');

    // Check that assessment appears in drafts
    await page.goto('/assessor/rapid-assessments');
    await expect(page.locator('[data-testid="draft-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-sync-count"]')).toContainText('1');
  });

  test('Entity assignment validation', async ({ page }) => {
    // Navigate to assessment creation
    await page.goto('/assessor/rapid-assessments');
    await page.click('[data-testid="new-assessment-button"]');
    await page.click('[data-testid="assessment-type-shelter"]');
    await page.click('[data-testid="start-assessment-button"]');

    // Test entity selector - should only show assigned entities
    await expect(page.locator('[data-testid="entity-selector"]')).toBeVisible();
    
    // Should not show unauthorized entities
    const entityOptions = await page.locator('[data-testid="entity-option"]').all();
    expect(entityOptions.length).toBeGreaterThan(0);
    
    // Select valid entity
    await page.selectOption('[data-testid="entity-selector"]', 'entity-1');
    await expect(page.locator('[data-testid="entity-status"]')).toContainText('Assigned');

    // Fill shelter assessment
    await page.uncheck('[data-testid="shelters-sufficient"]');
    await page.fill('[data-testid="shelters-required"]', '10');
    await page.check('[data-testid="weather-protection-needed"]');

    // Save successfully
    await page.click('[data-testid="save-assessment-button"]');
    await expect(page.locator('[data-testid="success-alert"]')).toBeVisible();
  });

  test('Form validation and progressive validation', async ({ page }) => {
    // Navigate to food assessment
    await page.goto('/assessor/rapid-assessments');
    await page.click('[data-testid="new-assessment-button"]');
    await page.click('[data-testid="assessment-type-food"]');
    await page.click('[data-testid="start-assessment-button"]');

    // Try to save without required fields
    await page.click('[data-testid="save-assessment-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Assessor name is required');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Entity is required');

    // Fill in required fields progressively
    await page.fill('[data-testid="assessor-name"]', 'Progressive Assessor');
    await page.selectOption('[data-testid="affected-entity"]', 'entity-1');

    // Should clear entity validation error
    await expect(page.locator('[data-testid="validation-error"]:has-text("Entity is required")')).not.toBeVisible();

    // Add at least one food source
    await page.check('[data-testid="food-source-community"]');
    
    // Fill food duration
    await page.fill('[data-testid="available-food-days"]', '2');

    // Should show food security warning
    await expect(page.locator('[data-testid="food-security-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="food-security-warning"]')).toContainText('Urgent food assistance needed');

    // Save should now work
    await page.click('[data-testid="save-assessment-button"]');
    await expect(page.locator('[data-testid="success-alert"]')).toBeVisible();
  });

  test('Gap analysis visualization', async ({ page }) => {
    // Create security assessment to test gap analysis
    await page.goto('/assessor/rapid-assessments');
    await page.click('[data-testid="new-assessment-button"]');
    await page.click('[data-testid="assessment-type-security"]');
    await page.click('[data-testid="start-assessment-button"]');

    // Fill in security assessment with gaps
    await page.fill('[data-testid="assessor-name"]', 'Security Assessor');
    await page.selectOption('[data-testid="affected-entity"]', 'entity-1');
    
    // Report GBV cases (creates critical gap)
    await page.check('[data-testid="gbv-cases-reported"]');
    
    // No protection mechanism (creates critical gap)
    // Leave unchecked by default

    // Vulnerable groups access issues
    await page.uncheck('[data-testid="vulnerable-groups-access"]');

    // Should show critical security issues alert
    await expect(page.locator('[data-testid="security-critical-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="security-critical-alert"]')).toContainText('GBV cases reported');
    await expect(page.locator('[data-testid="security-critical-alert"]')).toContainText('No protection reporting mechanism');

    // Check gap status badges
    await expect(page.locator('[data-testid="gap-status-gbv"]')).toContainText('Cases Reported');
    await expect(page.locator('[data-testid="gap-status-reporting"]')).toContainText('No Mechanism');
    await expect(page.locator('[data-testid="gap-status-access"]')).toContainText('Access Barriers');

    // Risk level should be high
    await expect(page.locator('[data-testid="risk-level"]')).toContainText('High Risk');

    // Save assessment
    await page.click('[data-testid="save-assessment-button"]');
    await expect(page.locator('[data-testid="success-alert"]')).toBeVisible();
  });

  test('Media attachment workflow', async ({ page }) => {
    // Test media attachments with location stamping
    await page.goto('/assessor/rapid-assessments');
    await page.click('[data-testid="new-assessment-button"]');
    await page.click('[data-testid="assessment-type-health"]');
    await page.click('[data-testid="start-assessment-button"]');

    // Fill basic info
    await page.fill('[data-testid="assessor-name"]', 'Media Assessor');
    await page.selectOption('[data-testid="affected-entity"]', 'entity-1');

    // Capture GPS location first (for location stamping)
    await page.click('[data-testid="capture-gps"]');
    await expect(page.locator('[data-testid="gps-status"]')).toContainText('Location captured');

    // Test photo upload
    await page.click('[data-testid="select-photos-button"]');
    
    // In a real test, we'd need to handle file input
    // For now, test the drag and drop functionality
    const dropZone = page.locator('[data-testid="media-drop-zone"]');
    
    // Test drag over visual feedback
    await dropZone.dispatchEvent('dragenter');
    await expect(dropZone).toHaveClass(/drag-active/);
    
    await dropZone.dispatchEvent('dragleave');
    await expect(dropZone).not.toHaveClass(/drag-active/);

    // Test photo limit
    await expect(page.locator('[data-testid="photo-counter"]')).toContainText('0 / 5');

    // Save assessment without photos (should still work)
    await page.check('[data-testid="has-functional-clinic"]');
    await page.fill('[data-testid="number-health-facilities"]', '1');
    await page.selectOption('[data-testid="health-facility-type"]', 'Clinic');
    await page.fill('[data-testid="qualified-health-workers"]', '2');
    await page.check('[data-testid="has-medicine-supply"]');

    await page.click('[data-testid="save-assessment-button"]');
    await expect(page.locator('[data-testid="success-alert"]')).toBeVisible();
  });
});