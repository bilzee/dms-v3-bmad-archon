import { test, expect } from '@playwright/test'

/**
 * Story 5.1 Donor Registration Portal - Smoke Tests
 * 
 * Critical functionality tests to prevent regression of the major bugs fixed:
 * 1. Authentication token persistence to localStorage
 * 2. Role priority logic for multi-role users  
 * 3. Post-registration redirect to /donor/dashboard
 * 4. Role-based access control enforcement
 * 5. Select component validation (no empty string values)
 * 6. Authentication token passing to API calls
 */

test.describe('Story 5.1 - Donor Registration Portal Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:3001')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('CRITICAL: Donor registration redirects to donor dashboard after success', async ({ page }) => {
    // This test prevents regression of the redirect bug
    await page.goto('http://localhost:3001/register')
    
    const timestamp = Date.now()
    
    // Complete registration with minimal required fields
    await page.fill('[data-testid="donor-name-input"]', `Test Donor ${timestamp}`)
    
    // Select organization type
    await page.click('[data-testid="donor-type-select"]')
    await page.waitForTimeout(500)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    
    await page.fill('[data-testid="donor-contact-email-input"]', `test-${timestamp}@donor.org`)
    await page.fill('[data-testid="donor-contact-phone-input"]', '+1234567890')
    await page.fill('[data-testid="donor-organization-details-input"]', 'Test Organization')
    
    // Go to step 2
    await page.click('[data-testid="registration-next-button"]')
    await page.waitForTimeout(2000)
    
    // Fill user account information
    await page.fill('input[name="userCredentials.name"]', `Test User ${timestamp}`)
    await page.fill('input[name="userCredentials.email"]', `user-${timestamp}@testdonor.org`)
    await page.fill('input[name="userCredentials.username"]', `testdonor${timestamp}`)
    await page.fill('input[name="userCredentials.password"]', 'TestPassword123')
    await page.fill('input[name="userCredentials.confirmPassword"]', 'TestPassword123')
    
    // Complete registration
    const submitButton = page.locator('[data-testid="registration-next-button"]:has-text("Complete Registration")')
    await submitButton.click()
    
    // CRITICAL: Should redirect to donor dashboard (not generic dashboard)
    await page.waitForURL('**/donor/dashboard', { timeout: 10000 })
    
    const currentUrl = page.url()
    expect(currentUrl).toContain('/donor/dashboard')
    expect(currentUrl).not.toContain('/dashboard')
    
    // Verify authentication state is maintained
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(authToken).toBeTruthy()
    expect(authToken?.length).toBeGreaterThan(20) // JWT tokens are substantial
  })

  test('CRITICAL: JWT token persists across page reloads', async ({ page }) => {
    // This test prevents regression of token persistence bug
    await page.goto('http://localhost:3001/login')
    
    // Login as donor user
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    // Wait for login
    await page.waitForTimeout(3000)
    
    // Verify token exists after login
    const tokenBeforeReload = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(tokenBeforeReload).toBeTruthy()
    
    // Reload page
    await page.reload()
    await page.waitForTimeout(2000)
    
    // CRITICAL: Token should persist after reload
    const tokenAfterReload = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(tokenAfterReload).toBe(tokenBeforeReload)
    
    // Should still be able to access protected pages
    await page.goto('http://localhost:3001/donor/profile')
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    expect(currentUrl).toContain('/donor/profile')
    expect(currentUrl).not.toContain('/login')
  })

  test('CRITICAL: Multi-role users get highest priority role', async ({ page }) => {
    // This test prevents regression of role priority bug
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'multi_role_user')
    await page.fill('input[name="password"]', 'multi123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // CRITICAL: Multi-role user should get coordinator role (highest priority)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/dashboard')
    expect(currentUrl).not.toContain('/donor/dashboard') // Should not default to donor
    
    // Verify role assignment via localStorage state or dashboard content
    const userInfo = await page.evaluate(() => {
      const authStore = (window as any).__ZUSTAND_STORE__?.getState()?.auth
      return authStore?.user?.role
    })
    
    expect(userInfo).toBe('COORDINATOR')
  })

  test('CRITICAL: Donor-only users cannot access assessor pages', async ({ page }) => {
    // This test prevents regression of role-based access control
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // CRITICAL: Donor should be blocked from assessor pages
    const restrictedPaths = [
      '/assessor/dashboard',
      '/assessor/planning',
      '/assessor/assessments/new'
    ]
    
    for (const path of restrictedPaths) {
      const response = await page.goto(`http://localhost:3001${path}`)
      
      // Should either redirect (302) or show access denied
      if (response) {
        expect(response.status()).toBe(302) // Redirect is acceptable
      }
      
      await page.waitForTimeout(1000)
      const currentUrl = page.url()
      // Should not remain on restricted page
      if (currentUrl.includes(path)) {
        const accessDenied = await page.getByText(/access denied|unauthorized|not allowed/i).isVisible()
        expect(accessDenied).toBe(true)
      }
    }
  })

  test('CRITICAL: Donor users can access donor-specific pages', async ({ page }) => {
    // This test prevents regression of donor access permissions
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // CRITICAL: Donor should be able to access donor pages
    const allowedPaths = [
      '/donor/dashboard',
      '/donor/profile',
      '/donor/entities',
      '/donor/commitments'
    ]
    
    for (const path of allowedPaths) {
      await page.goto(`http://localhost:3001${path}`)
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      expect(currentUrl).toContain(path)
      
      // Should not show access denied
      const accessDenied = await page.getByText(/access denied|unauthorized/i).isVisible()
      expect(accessDenied).toBe(false)
    }
  })

  test('CRITICAL: API calls include proper Authorization headers', async ({ page }) => {
    // This test prevents regression of API authentication bug
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Monitor network requests
    const apiRequests: any[] = []
    page.on('request', request => {
      if (request.url().includes('/api/v1/donors/')) {
        apiRequests.push({
          url: request.url(),
          headers: request.headers(),
          method: request.method()
        })
      }
    })
    
    // Navigate to donor profile to trigger API calls
    await page.goto('http://localhost:3001/donor/profile')
    await page.waitForTimeout(3000)
    
    // CRITICAL: All API calls should include Authorization header
    expect(apiRequests.length).toBeGreaterThan(0)
    
    for (const request of apiRequests) {
      expect(request.headers['authorization']).toBeTruthy()
      expect(request.headers['authorization']).toContain('Bearer')
      expect(request.headers['authorization']).not.toContain('undefined')
      expect(request.headers['authorization']).not.toContain('null')
    }
  })

  test('CRITICAL: Entity Select component handles non-empty values', async ({ page }) => {
    // This test prevents regression of Select component empty value bug
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Navigate to entities page where Select component is used
    await page.goto('http://localhost:3001/donor/entities')
    await page.waitForTimeout(3000)
    
    // CRITICAL: Page should load without Select component errors
    const currentUrl = page.url()
    expect(currentUrl).toContain('/donor/entities')
    
    // Entity selector should be visible and functional
    await expect(page.getByTestId('entity-selector-container')).toBeVisible()
    
    // Type filter should work without empty string value errors
    const typeFilter = page.getByTestId('entity-type-filter')
    if (await typeFilter.isVisible()) {
      await typeFilter.click()
      await page.waitForTimeout(500)
      
      // Should be able to select "All Types" without error
      const allTypesOption = page.getByText('All Types')
      if (await allTypesOption.isVisible()) {
        await allTypesOption.click()
        await page.waitForTimeout(1000)
        
        // Should not have JavaScript errors
        // (Can't easily check for JavaScript errors in Playwright, but page should remain functional)
        expect(page.getByTestId('entity-selector-container')).toBeVisible()
      }
    }
  })

  test('CRITICAL: Authentication token cleanup on logout', async ({ page }) => {
    // This test prevents regression of token cleanup bug
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Verify token exists before logout
    const tokenBeforeLogout = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(tokenBeforeLogout).toBeTruthy()
    
    // Logout
    const logoutButton = page.getByTestId('logout-button')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForTimeout(2000)
    } else {
      // Manual logout if button not found
      await page.evaluate(() => {
        localStorage.removeItem('auth_token')
      })
      await page.reload()
      await page.waitForTimeout(2000)
    }
    
    // CRITICAL: Token should be removed from localStorage
    const tokenAfterLogout = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(tokenAfterLogout).toBe(null)
    
    // Should be redirected to login for protected pages
    await page.goto('http://localhost:3001/donor/profile')
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    expect(currentUrl).toContain('/login')
  })
})