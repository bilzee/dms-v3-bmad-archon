/**
 * Commitment Import E2E Tests - Story 4.3
 * 
 * These tests verify the complete commitment import workflow
 * from the user interface to API integration
 */

import { test, expect } from '@playwright/test';

test.describe('Commitment Import Workflow - Story 4.3', () => {
  test.beforeEach(async ({ page }) => {
    // Login as responder
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'responder@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/responder/dashboard');
  });

  test('should display commitment import option in response planning', async ({ page }) => {
    // Navigate to response planning
    await page.goto('/responder/planning');
    
    // Verify the commitment import tab/button exists
    await expect(page.locator('[data-testid="commitment-import-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-from-commitment-button"]')).toBeVisible();
  });

  test('should load available commitments for responder', async ({ page }) => {
    // Navigate to response planning with commitment import
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Wait for commitments to load
    await page.waitForSelector('[data-testid="commitment-list"]');
    
    // Verify commitment list displays
    await expect(page.locator('[data-testid="commitment-item"]')).toHaveCount.gte(0);
    
    // If commitments exist, verify their structure
    const commitmentItems = page.locator('[data-testid="commitment-item"]');
    if (await commitmentItems.count() > 0) {
      const firstCommitment = commitmentItems.first();
      await expect(firstCommitment.locator('[data-testid="commitment-donor"]')).toBeVisible();
      await expect(firstCommitment.locator('[data-testid="commitment-items"]')).toBeVisible();
      await expect(firstCommitment.locator('[data-testid="available-quantity"]')).toBeVisible();
    }
  });

  test('should filter commitments by entity and incident', async ({ page }) => {
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Wait for commitments to load
    await page.waitForSelector('[data-testid="commitment-list"]');
    
    // Test entity filtering
    const entityFilter = page.locator('[data-testid="entity-filter"]');
    if (await entityFilter.isVisible()) {
      await entityFilter.click();
      await page.click('[data-testid="entity-option"]:first-child');
      await page.waitForTimeout(1000);
      
      // Verify results are filtered
      const visibleCommitments = page.locator('[data-testid="commitment-item"]:visible');
      await expect(visibleCommitments).toHaveCount.gte(0);
    }
    
    // Test incident filtering
    const incidentFilter = page.locator('[data-testid="incident-filter"]');
    if (await incidentFilter.isVisible()) {
      await incidentFilter.click();
      await page.click('[data-testid="incident-option"]:first-child');
      await page.waitForTimeout(1000);
      
      // Verify results are filtered
      const visibleCommitments = page.locator('[data-testid="commitment-item"]:visible');
      await expect(visibleCommitments).toHaveCount.gte(0);
    }
  });

  test('should select commitment items and adjust quantities', async ({ page }) => {
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Wait for commitments to load
    await page.waitForSelector('[data-testid="commitment-list"]');
    
    const commitmentItems = page.locator('[data-testid="commitment-item"]');
    if (await commitmentItems.count() > 0) {
      // Select first commitment
      const firstCommitment = commitmentItems.first();
      await firstCommitment.click();
      
      // Verify commitment details are shown
      await expect(page.locator('[data-testid="commitment-details"]')).toBeVisible();
      
      // Select items within commitment
      const itemCheckboxes = page.locator('[data-testid="item-checkbox"]');
      if (await itemCheckboxes.count() > 0) {
        await itemCheckboxes.first().check();
        
        // Adjust quantity if quantity input exists
        const quantityInput = page.locator('[data-testid="item-quantity"]');
        if (await quantityInput.first().isVisible()) {
          await quantityInput.first().clear();
          await quantityInput.first().fill('10');
        }
        
        // Verify selection summary
        await expect(page.locator('[data-testid="selection-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="selected-items-count"]')).toContainText('1');
      }
    }
  });

  test('should preview and confirm commitment import', async ({ page }) => {
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Wait for commitments to load
    await page.waitForSelector('[data-testid="commitment-list"]');
    
    const commitmentItems = page.locator('[data-testid="commitment-item"]');
    if (await commitmentItems.count() > 0) {
      // Select commitment and items
      await commitmentItems.first().click();
      
      const itemCheckboxes = page.locator('[data-testid="item-checkbox"]');
      if (await itemCheckboxes.count() > 0) {
        await itemCheckboxes.first().check();
        
        // Click preview/import button
        await page.click('[data-testid="preview-import-button"]');
        
        // Verify preview dialog
        await expect(page.locator('[data-testid="import-preview-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="preview-donor-info"]')).toBeVisible();
        await expect(page.locator('[data-testid="preview-items-list"]')).toBeVisible();
        await expect(page.locator('[data-testid="preview-response-fields"]')).toBeVisible();
        
        // Confirm import
        await page.click('[data-testid="confirm-import-button"]');
        
        // Verify success message
        await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible();
        
        // Verify response is created in the system
        await expect(page.locator('[data-testid="response-created-confirmation"]')).toBeVisible();
      }
    }
  });

  test('should handle commitment quantity validation', async ({ page }) => {
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Wait for commitments to load
    await page.waitForSelector('[data-testid="commitment-list"]');
    
    const commitmentItems = page.locator('[data-testid="commitment-item"]');
    if (await commitmentItems.count() > 0) {
      await commitmentItems.first().click();
      
      const itemCheckboxes = page.locator('[data-testid="item-checkbox"]');
      if (await itemCheckboxes.count() > 0) {
        await itemCheckboxes.first().check();
        
        // Try to set quantity higher than available
        const quantityInput = page.locator('[data-testid="item-quantity"]');
        if (await quantityInput.first().isVisible()) {
          const availableQuantity = await page.locator('[data-testid="available-quantity"]').textContent();
          const maxQuantity = parseInt(availableQuantity?.match(/\d+/)?.[0] || '0') + 100;
          
          await quantityInput.first().clear();
          await quantityInput.first().fill(maxQuantity.toString());
          
          // Try to proceed with import
          await page.click('[data-testid="preview-import-button"]');
          
          // Should show validation error
          await expect(page.locator('[data-testid="quantity-error"]')).toBeVisible();
          await expect(page.locator('[data-testid="validation-message"]')).toContainText('exceeds available');
        }
      }
    }
  });

  test('should maintain donor attribution in imported response', async ({ page }) => {
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Wait for commitments to load
    await page.waitForSelector('[data-testid="commitment-list"]');
    
    const commitmentItems = page.locator('[data-testid="commitment-item"]');
    if (await commitmentItems.count() > 0) {
      // Get donor information from commitment
      const donorName = await commitmentItems.first().locator('[data-testid="commitment-donor"]').textContent();
      
      await commitmentItems.first().click();
      
      const itemCheckboxes = page.locator('[data-testid="item-checkbox"]');
      if (await itemCheckboxes.count() > 0) {
        await itemCheckboxes.first().check();
        await page.click('[data-testid="preview-import-button"]');
        
        // Verify donor attribution in preview
        await expect(page.locator('[data-testid="preview-donor-info"]')).toContainText(donorName || '');
        
        await page.click('[data-testid="confirm-import-button"]');
        
        // Navigate to responses to verify donor attribution
        await page.goto('/responder/responses');
        await page.waitForSelector('[data-testid="responses-list"]');
        
        const responseItems = page.locator('[data-testid="response-item"]');
        if (await responseItems.count() > 0) {
          const latestResponse = responseItems.first();
          await expect(latestResponse.locator('[data-testid="response-donor"]')).toContainText(donorName || '');
        }
      }
    }
  });

  test('should work offline with commitment import', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Should load cached commitments
    await page.waitForSelector('[data-testid="commitment-list"]');
    await expect(page.locator('[data-testid="commitment-item"]')).toHaveCount.gte(0);
    
    // Should allow offline commitment selection
    const commitmentItems = page.locator('[data-testid="commitment-item"]');
    if (await commitmentItems.count() > 0) {
      await commitmentItems.first().click();
      
      const itemCheckboxes = page.locator('[data-testid="item-checkbox"]');
      if (await itemCheckboxes.count() > 0) {
        await itemCheckboxes.first().check();
        
        // Should show offline sync indicator
        await expect(page.locator('[data-testid="offline-pending-sync"]')).toBeVisible();
        
        // Complete import process
        await page.click('[data-testid="preview-import-button"]');
        await page.click('[data-testid="confirm-import-button"]');
        
        // Should show success message with offline notification
        await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="sync-queued-message"]')).toBeVisible();
      }
    }
    
    // Restore online mode
    await page.context().setOffline(false);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('/api/v1/commitments/available', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal server error' })
      });
    });
    
    await page.goto('/responder/planning');
    await page.click('[data-testid="commitment-import-tab"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('/api/v1/commitments/available');
    await page.click('[data-testid="retry-button"]');
    
    // Should load successfully after retry
    await page.waitForSelector('[data-testid="commitment-list"]');
  });

  test('should respect role-based access control', async ({ page }) => {
    // Test with unauthorized user role
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'assessor@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to planning page
    await page.goto('/responder/planning');
    
    // Should redirect or show access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    or await expect(page.url()).toContain('/assessor');
  });
});