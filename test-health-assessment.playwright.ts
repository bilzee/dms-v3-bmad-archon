/**
 * Playwright Test Script for Health Assessment Form
 * Tests the infinite loop fix and form functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Health Assessment Form - Infinite Loop Fix Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page first
    await page.goto('http://localhost:3001/login');
    
    // Login as assessor (adjust credentials as needed)
    await page.fill('input[name="email"]', 'assessor@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
  });

  test('Page loads without infinite loop errors', async ({ page }) => {
    // Navigate to Health Assessment page
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that page title is correct
    await expect(page.locator('h1')).toContainText('Health Assessment');
    
    // Check that no infinite loop error occurred (page should be stable)
    await page.waitForTimeout(5000); // Wait 5 seconds to ensure no continuous re-renders
    
    // Verify the page is responsive and not frozen
    await expect(page.locator('body')).toBeVisible();
    
    // Check console for infinite loop errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Navigate to the page again and monitor console
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for maximum update depth exceeded errors
    const infiniteLoopErrors = consoleMessages.filter(msg => 
      msg.includes('Maximum update depth exceeded') || 
      msg.includes('infinite update loop')
    );
    
    expect(infiniteLoopErrors).toHaveLength(0);
  });

  test('Form can be opened and rendered correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    await page.waitForLoadState('networkidle');
    
    // Click "Create New Assessment" button
    await page.click('text=Create New Assessment');
    
    // Wait for form to appear
    await expect(page.locator('text=Health Assessment Form')).toBeVisible();
    
    // Check that form fields are rendered
    await expect(page.locator('text=Affected Entity *')).toBeVisible();
    await expect(page.locator('text=Health Facility Assessment')).toBeVisible();
    await expect(page.locator('text=Functional Clinic Available')).toBeVisible();
    await expect(page.locator('text=Common Health Issues')).toBeVisible();
    
    // Verify gap analysis badges are rendered correctly
    const gapBadges = page.locator('[class*="badge"]');
    await expect(gapBadges.first()).toBeVisible();
  });

  test('Draft saving functionality works', async ({ page }) => {
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    await page.waitForLoadState('networkidle');
    
    // Open the form
    await page.click('text=Create New Assessment');
    
    // Fill in some form fields
    await page.selectOption('select[placeholder="Select affected entity"]', 'test-entity');
    await page.check('input[type="checkbox"]:has-text("Functional Clinic Available")');
    await page.fill('input[placeholder="0"]', '5');
    
    // Click "Save Draft" button
    await page.click('text=Save Draft');
    
    // Wait for save operation
    await page.waitForTimeout(2000);
    
    // Check for success message
    await expect(page.locator('text=Draft saved successfully')).toBeVisible();
    
    // Verify draft count increased
    await page.click('button:has-text("Cancel")');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that drafts section shows updated count
    const draftCount = page.locator('text=Saved Drafts').locator('../..').locator('.badge');
    await expect(draftCount).toContainText(/[1-9]/);
  });

  test('Form submission functionality works', async ({ page }) => {
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    await page.waitForLoadState('networkidle');
    
    // Open the form
    await page.click('text=Create New Assessment');
    
    // Fill all required fields
    await page.selectOption('select[placeholder="Select affected entity"]', 'test-entity');
    await page.check('input[type="checkbox"]:has-text("Functional Clinic Available")');
    await page.check('input[type="checkbox"]:has-text("Medicine Supply Available")');
    await page.check('input[type="checkbox"]:has-text("Medical Supplies Available")');
    await page.check('input[type="checkbox"]:has-text("Maternal & Child Services")');
    
    // Fill numeric fields
    await page.fill('input[placeholder="0"]:has-text("Number of Health Facilities")', '3');
    await page.fill('input[placeholder="0"]:has-text("Qualified Health Workers")', '10');
    
    // Select facility type
    await page.selectOption('select:has-text("Primary Health Facility Type")', 'primary_health_center');
    
    // Add some health issues
    await page.check('input[type="checkbox"]:has-text("Malaria")');
    await page.check('input[type="checkbox"]:has-text("Diarrhea")');
    
    // Add additional details
    await page.fill('textarea[placeholder*="additional health-related information"]', 'Test assessment details');
    
    // Submit the form
    await page.click('text=Submit Assessment');
    
    // Wait for submission
    await page.waitForTimeout(3000);
    
    // Check for success message
    await expect(page.locator('text=Health assessment submitted successfully')).toBeVisible();
    
    // Verify redirect to assessments list
    await page.waitForURL('**/assessor/rapid-assessments');
  });

  test('Gap analysis badges update correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    await page.waitForLoadState('networkidle');
    
    // Open the form
    await page.click('text=Create New Assessment');
    
    // Check initial gap status (should show "Gap Identified" when unchecked)
    const clinicBadge = page.locator('text=Functional Clinic Available').locator('../..').locator('.badge');
    await expect(clinicBadge).toContainText('Gap Identified');
    
    // Check the clinic checkbox
    await page.check('input[type="checkbox"]:has-text("Functional Clinic Available")');
    
    // Badge should now show "No Gap"
    await expect(clinicBadge).toContainText('No Gap');
    
    // Test other checkboxes
    const medicineBadge = page.locator('text=Medicine Supply Available').locator('../..').locator('.badge');
    await expect(medicineBadge).toContainText('Gap Identified');
    
    await page.check('input[type="checkbox"]:has-text("Medicine Supply Available")');
    await expect(medicineBadge).toContainText('No Gap');
  });

  test('Form handles offline mode correctly', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    await page.waitForLoadState('networkidle');
    
    // Check offline indicator
    await expect(page.locator('text=Offline')).toBeVisible();
    
    // Open form and fill it
    await page.click('text=Create New Assessment');
    await page.selectOption('select[placeholder="Select affected entity"]', 'test-entity');
    await page.check('input[type="checkbox"]:has-text("Functional Clinic Available")');
    
    // Save draft (should work offline)
    await page.click('text=Save Draft');
    await page.waitForTimeout(2000);
    
    // Check for offline success message
    await expect(page.locator('text=Draft saved successfully')).toBeVisible();
    
    // Restore online mode
    await page.context().setOffline(false);
  });

  test('No memory leaks or performance issues', async ({ page }) => {
    // Monitor memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    await page.goto('http://localhost:3001/assessor/rapid-assessments/new/health');
    await page.waitForLoadState('networkidle');
    
    // Perform multiple form interactions
    for (let i = 0; i < 10; i++) {
      await page.click('text=Create New Assessment');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(500);
    }
    
    // Check memory usage after interactions
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory increase should be reasonable (less than 50MB)
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
    
    expect(memoryIncreaseMB).toBeLessThan(50);
  });
});

// Instructions to run this test:
// 1. Ensure the development server is running: pnpm dev
// 2. Install Playwright: npx playwright install
// 3. Run tests: npx playwright test test-health-assessment.playwright.ts
// 4. For headed mode: npx playwright test test-health-assessment.playwright.ts --headed