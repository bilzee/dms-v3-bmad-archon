import { test, expect } from '@playwright/test'

test.describe('Donor Registration and Dashboard Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to registration page
    await page.goto('http://localhost:3001/register')
    
    // Use unique identifiers for each test run
    const timestamp = Date.now()
    await page.evaluate(() => {
      (window as any).__testTimestamp = Date.now()
    })
  })

  test('should complete full donor registration workflow', async ({ page }) => {
    // Step 1: Verify registration page loads
    await expect(page.getByTestId('donor-registration-form-title')).toBeVisible()
    await expect(page.getByTestId('organization-info-title')).toBeVisible()
    
    // Step 2: Fill organization information
    const timestamp = await page.evaluate(() => (window as any).__testTimestamp)
    
    // Fill in the form fields with proper event triggering
    await page.fill('[data-testid="donor-name-input"]', `Test Donor Organization ${timestamp}`)
    
    // Handle the select component using keyboard navigation (more reliable than click)
    await page.click('[data-testid="donor-type-select"]')
    await page.waitForTimeout(500)
    
    // Use keyboard navigation to select Organization
    try {
      await page.keyboard.press('ArrowDown') // Navigate to first option
      await page.keyboard.press('Enter') // Select it
      console.log('Selected option via keyboard')
    } catch (error) {
      // Alternative: Use force click with specific option text
      await page.locator('div[role="option"]:has-text("Organization")').first().click({ force: true })
      console.log('Selected option via force click')
    }
    
    await page.fill('[data-testid="donor-contact-email-input"]', `test-${timestamp}@donor.org`)
    await page.fill('[data-testid="donor-contact-phone-input"]', '+1234567890')
    await page.fill('[data-testid="donor-organization-details-input"]', 'Test Organization Details')
    
    // Step 3: Click next to go to user account step
    await page.click('[data-testid="registration-next-button"]')
    await page.waitForTimeout(2000) // Wait for form transition and validation
    
    // Verify we're on step 2 - use more specific selectors to avoid strict mode violations
    try {
      await expect(page.getByRole('heading', { name: 'User Account' })).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Create the primary user account for your organization')).toBeVisible()
      console.log('Successfully moved to step 2')
    } catch (error) {
      console.log('Step 2 verification failed, checking current page state...')
      await page.screenshot({ path: 'step2-failed.png' })
      
      // Check if we're still on step 1 (validation failed)
      if (await page.getByTestId('organization-info-title').isVisible()) {
        console.log('Still on step 1 - validation likely failed')
        throw new Error('Form validation failed - could not proceed to step 2')
      }
      
      throw error
    }
    
    // Step 4: Fill user account information
    await page.fill('input[name="userCredentials.name"]', `Test User ${timestamp}`)
    await page.fill('input[name="userCredentials.email"]', `user-${timestamp}@testdonor.org`)
    await page.fill('input[name="userCredentials.username"]', `testdonoruser${timestamp}`)
    await page.fill('input[name="userCredentials.password"]', 'TestPassword123')
    await page.fill('input[name="userCredentials.confirmPassword"]', 'TestPassword123')
    
    // Verify password strength indicator appears
    await expect(page.getByText('Password strength')).toBeVisible()
    
    // Step 5: Complete registration
    const submitButton = page.locator('[data-testid="registration-next-button"]:has-text("Complete Registration")')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
    
    console.log('🔘 Clicking Complete Registration button...')
    await submitButton.click()
    
    // Wait for registration to complete - check for either success message or redirect
    await page.waitForTimeout(5000)
    
    // Wait for registration completion and verify redirect to donor dashboard
    try {
      // Wait for redirect to donor dashboard
      await page.waitForURL('**/donor/dashboard', { timeout: 10000 })
      
      const currentUrl = page.url()
      console.log('Current URL after registration:', currentUrl)
      
      // Verify we're on the donor dashboard
      expect(currentUrl).toContain('/donor/dashboard')
      
      // Verify authentication state - token should be in localStorage
      const authToken = await page.evaluate(() => {
        return localStorage.getItem('auth_token')
      })
      
      expect(authToken).toBeTruthy()
      expect(authToken?.length).toBeGreaterThan(20) // JWT tokens are substantial
      
      // Verify donor dashboard content is visible
      await expect(page.getByTestId('donor-dashboard-container')).toBeVisible({ timeout: 5000 })
      
      console.log('✅ Registration successful - redirected to donor dashboard with authenticated session')
      
    } catch (error) {
      console.log('Registration redirect verification failed:', error)
      
      // Check for error messages first
      const errorMessage = page.getByText(/error|failed|incorrect/i)
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        console.log('❌ Registration failed - error message found')
        await page.screenshot({ path: 'donor-registration-error.png' })
        throw new Error('Registration failed - error message shown')
      }
      
      // If no redirect, check current URL and take screenshot
      const currentUrl = page.url()
      console.log('Current URL after timeout:', currentUrl)
      await page.screenshot({ path: 'donor-registration-no-redirect.png' })
      
      // The registration might have succeeded but redirect failed
      // Check if we have auth token even if redirect didn't work
      const hasToken = await page.evaluate(() => {
        return !!localStorage.getItem('auth_token')
      })
      
      if (hasToken) {
        console.log('⚠️ Registration likely succeeded but redirect failed - token present')
        throw new Error('Registration succeeded but redirect to donor dashboard failed')
      } else {
        console.log('❌ Registration failed - no authentication token found')
        throw new Error('Registration failed - no authentication token created')
      }
    }
  })

  test('should validate form inputs correctly', async ({ page }) => {
    // Test empty form validation
    await page.click('[data-testid="registration-next-button"]')
    
    // Should still be on step 1 (validation prevented progression)
    await expect(page.getByTestId('organization-info-title')).toBeVisible()
    
    // Fill only name - should still fail due to missing type
    await page.fill('[data-testid="donor-name-input"]', 'Test Donor')
    await page.click('[data-testid="registration-next-button"]')
    await page.waitForTimeout(1000)
    
    // Should still be on step 1
    await expect(page.getByTestId('organization-info-title')).toBeVisible()
    
    // Fill required fields and proceed
    await page.click('[data-testid="donor-type-select"]')
    await page.waitForTimeout(500)
    
    // Use keyboard navigation for select
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    
    await page.click('[data-testid="registration-next-button"]')
    await page.waitForTimeout(2000)
    
    // Should now be on step 2
    await expect(page.getByRole('heading', { name: 'User Account' })).toBeVisible()
  })

  test('should handle navigation between steps', async ({ page }) => {
    // Fill step 1 and go to step 2
    await page.fill('[data-testid="donor-name-input"]', 'Test Donor')
    
    await page.click('[data-testid="donor-type-select"]')
    await page.waitForTimeout(500)
    
    // Use keyboard navigation for select
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    
    await page.click('[data-testid="registration-next-button"]')
    await page.waitForTimeout(2000)
    
    // Verify step 2 is active
    await expect(page.getByRole('heading', { name: 'User Account' })).toBeVisible()
    
    // Go back to step 1
    const previousButton = page.locator('[data-testid="registration-previous-button"]')
    if (await previousButton.isVisible()) {
      await previousButton.click()
      await page.waitForTimeout(1000)
      
      // Verify back on step 1
      await expect(page.getByTestId('organization-info-title')).toBeVisible()
    }
  })
})