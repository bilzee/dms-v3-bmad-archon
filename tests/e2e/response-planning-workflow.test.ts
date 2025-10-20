import { test, expect } from '@playwright/test'

test.describe('Response Planning Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as responder
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'responder@test.com')
    await page.fill('[data-testid="password-input"]', 'test-password')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
  })

  test('should create response plan successfully online', async ({ page }) => {
    // Navigate to response planning
    await page.click('[data-testid="nav-planning"]')
    await page.waitForURL('/responder/planning')

    // Click create new plan button
    await page.click('[data-testid="create-plan-button"]')
    await page.waitForURL('/responder/planning/new')

    // Verify form is loaded
    await expect(page.locator('h1')).toContainText('Create Response Plan')
    await expect(page.locator('[data-testid="online-status"]')).toContainText('Online')

    // Select entity
    await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
    await page.waitForSelector('[data-testid="assessment-select"]')

    // Select assessment
    await page.selectOption('[data-testid="assessment-select"]', 'test-assessment-1')

    // Fill response details
    await page.selectOption('[data-testid="response-type"]', 'HEALTH')
    await page.selectOption('[data-testid="priority"]', 'HIGH')
    await page.fill('[data-testid="description"]', 'Medical response plan for affected area')

    // Fill first item
    await page.fill('[data-testid="item-name-0"]', 'First Aid Kits')
    await page.fill('[data-testid="item-unit-0"]', 'kits')
    await page.fill('[data-testid="item-quantity-0"]', '50')
    await page.fill('[data-testid="item-category-0"]', 'Medical')
    await page.fill('[data-testid="item-notes-0"]', 'For emergency medical treatment')

    // Add second item
    await page.click('[data-testid="add-item-button"]')
    await expect(page.locator('[data-testid="item-name-1"]')).toBeVisible()

    await page.fill('[data-testid="item-name-1"]', 'Medical Gloves')
    await page.fill('[data-testid="item-unit-1"]', 'boxes')
    await page.fill('[data-testid="item-quantity-1"]', '100')
    await page.fill('[data-testid="item-category-1"]', 'Medical')

    // Submit form
    await page.click('[data-testid="submit-button"]')
    
    // Should show success message and redirect
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Response plan saved successfully')
    
    // Verify response appears in planning dashboard
    await page.waitForURL('/responder/planning')
    await expect(page.locator('[data-testid="response-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="response-card"]')).toContainText('HEALTH')
    await expect(page.locator('[data-testid="response-card"]')).toContainText('HIGH PRIORITY')
  })

  test('should create response plan offline and sync when online', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true)

    // Navigate to response planning
    await page.click('[data-testid="nav-planning"]')
    await page.waitForURL('/responder/planning')

    // Click create new plan button
    await page.click('[data-testid="create-plan-button"]')
    await page.waitForURL('/responder/planning/new')

    // Verify offline status
    await expect(page.locator('[data-testid="offline-status"]')).toContainText('Offline')
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Will Sync Later')

    // Fill form (same as online test)
    await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
    await page.selectOption('[data-testid="assessment-select"]', 'test-assessment-1')
    await page.selectOption('[data-testid="response-type"]', 'WASH')
    await page.selectOption('[data-testid="priority"]', 'MEDIUM')
    
    await page.fill('[data-testid="item-name-0"]', 'Water Purification Tablets')
    await page.fill('[data-testid="item-unit-0"]', 'bottles')
    await page.fill('[data-testid="item-quantity-0"]', '200')

    // Submit form offline
    await page.click('[data-testid="submit-button"]')
    
    // Should show offline success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('saved locally. Will sync when you reconnect')
    
    // Verify response appears with offline indicator
    await page.waitForURL('/responder/planning')
    await expect(page.locator('[data-testid="response-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="response-card"]')).toContainText('WASH')
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Pending Sync')

    // Go back online
    await page.context().setOffline(false)
    
    // Should show sync progress
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-progress"]')).toContainText('Syncing your response plan')
    
    // Wait for sync to complete
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 })
    
    // Verify offline indicator is gone
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
  })

  test('should edit existing response plan', async ({ page }) => {
    // First create a response plan
    await page.goto('/responder/planning/new')
    
    // Create initial plan
    await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
    await page.selectOption('[data-testid="assessment-select"]', 'test-assessment-1')
    await page.selectOption('[data-testid="response-type"]', 'SHELTER')
    await page.selectOption('[data-testid="priority"]', 'MEDIUM')
    
    await page.fill('[data-testid="item-name-0"]', 'Tents')
    await page.fill('[data-testid="item-unit-0"]', 'units')
    await page.fill('[data-testid="item-quantity-0"]', '25')
    
    await page.click('[data-testid="submit-button"]')
    await page.waitForURL('/responder/planning')
    
    // Edit the created response
    await page.click('[data-testid="edit-response-button"]')
    await page.waitForURL('/responder/planning/edit/*')
    
    // Verify edit mode
    await expect(page.locator('h1')).toContainText('Edit Response Plan')
    await expect(page.locator('[data-testid="entity-select"]')).toBeDisabled()
    
    // Update response details
    await page.selectOption('[data-testid="priority"]', 'HIGH')
    await page.fill('[data-testid="description"]', 'Updated shelter plan with additional resources')
    
    // Update existing item
    await page.fill('[data-testid="item-quantity-0"]', '30')
    await page.fill('[data-testid="item-notes-0"]', 'Family-sized tents for 4-6 people')
    
    // Add new item
    await page.click('[data-testid="add-item-button"]')
    await page.fill('[data-testid="item-name-1"]', 'Sleeping Bags')
    await page.fill('[data-testid="item-unit-1"]', 'units')
    await page.fill('[data-testid="item-quantity-1"]', '50')
    
    // Submit update
    await page.click('[data-testid="submit-button"]')
    
    // Verify changes saved
    await expect(page.locator('[data-testid="success-message"]')).toContainText('updated successfully')
    await page.waitForURL('/responder/planning')
    
    // Verify updated response in dashboard
    await expect(page.locator('[data-testid="response-card"]')).toContainText('HIGH PRIORITY')
    await expect(page.locator('[data-testid="response-card"]')).toContainText('30 units')
    await expect(page.locator('[data-testid="response-card"]')).toContainText('Sleeping Bags')
  })

  test('should show collaboration features for shared responses', async ({ page, context }) => {
    // Create a second browser context for another user
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    
    try {
      // Login second user
      await page2.goto('/login')
      await page2.fill('[data-testid="email-input"]', 'responder2@test.com')
      await page2.fill('[data-testid="password-input"]', 'test-password')
      await page2.click('[data-testid="login-button"]')
      
      // First user creates and starts editing a response
      await page.goto('/responder/planning/new')
      await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
      await page.selectOption('[data-testid="assessment-select"]', 'test-assessment-1')
      await page.selectOption('[data-testid="response-type"]', 'FOOD')
      
      await page.fill('[data-testid="item-name-0"]', 'Food Rations')
      await page.fill('[data-testid="item-quantity-0"]', '100')
      
      // Second user navigates to same response
      await page2.goto('/responder/planning')
      
      // First user saves draft to make it available for collaboration
      await page.click('[data-testid="save-draft-button"]')
      
      // Second user opens the response for editing
      await page2.click('[data-testid="edit-response-button"]')
      
      // Verify collaboration status is visible
      await expect(page2.locator('[data-testid="collaboration-status"]')).toBeVisible()
      await expect(page2.locator('[data-testid="active-collaborators"]')).toContainText('Test User')
      
      // First user should see second user in collaboration panel
      await expect(page.locator('[data-testid="collaboration-status"]')).toContainText('Test User 2')
      
    } finally {
      await context2.close()
    }
  })

  test('should validate assessment conflicts', async ({ page }) => {
    // Create first response for assessment
    await page.goto('/responder/planning/new')
    await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
    await page.selectOption('[data-testid="assessment-select"]', 'test-assessment-1')
    await page.selectOption('[data-testid="response-type"]', 'SECURITY')
    
    await page.fill('[data-testid="item-name-0"]', 'Security Equipment')
    await page.fill('[data-testid="item-quantity-0"]', '10')
    
    await page.click('[data-testid="submit-button"]')
    await page.waitForURL('/responder/planning')
    
    // Try to create another response for same assessment
    await page.click('[data-testid="create-plan-button"]')
    await page.waitForURL('/responder/planning/new')
    
    await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
    await page.selectOption('[data-testid="assessment-select"]', 'test-assessment-1')
    
    // Should show conflict warning
    await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible()
    await expect(page.locator('[data-testid="conflict-warning"]')).toContainText('Existing response found for this assessment')
    
    // Should still allow creation but with warning
    await page.selectOption('[data-testid="response-type"]', 'POPULATION')
    await page.fill('[data-testid="item-name-0"]', 'Registration Forms')
    await page.fill('[data-testid="item-quantity-0"]', '500')
    
    await page.click('[data-testid="submit-button"]')
    
    // Should show confirmation about potential conflicts
    await expect(page.locator('[data-testid="conflict-confirmation"]')).toBeVisible()
  })

  test('should handle form validation errors gracefully', async ({ page }) => {
    await page.goto('/responder/planning/new')
    
    // Try to submit empty form
    await page.click('[data-testid="submit-button"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Entity is required')
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Assessment is required')
    
    // Fill entity but leave assessment empty
    await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
    await page.click('[data-testid="submit-button"]')
    
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Assessment is required')
    
    // Fill assessment but submit with invalid item
    await page.selectOption('[data-testid="assessment-select"]', 'test-assessment-1')
    await page.fill('[data-testid="item-name-0"]', '') // Empty name
    await page.fill('[data-testid="item-quantity-0"]', '-5') // Negative quantity
    
    await page.click('[data-testid="submit-button"]')
    
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Item name is required')
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Quantity must be positive')
  })

  test('should handle cancellation properly', async ({ page }) => {
    await page.goto('/responder/planning/new')
    
    // Fill form partially
    await page.selectOption('[data-testid="entity-select"]', 'test-entity-1')
    await page.fill('[data-testid="item-name-0"]', 'Test Item')
    
    // Click cancel
    await page.click('[data-testid="cancel-button"]')
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="cancel-confirmation"]')).toBeVisible()
    await expect(page.locator('[data-testid="cancel-confirmation"]')).toContainText('Are you sure you want to cancel?')
    
    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel"]')
    
    // Should redirect back to planning dashboard
    await page.waitForURL('/responder/planning')
    
    // Verify no changes were saved
    await expect(page.locator('[data-testid="response-card"]')).toHaveCount(0)
  })
})