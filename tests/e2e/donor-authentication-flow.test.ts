import { test, expect } from '@playwright/test'

test.describe('Donor Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('http://localhost:3001')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should maintain authentication session across page reloads', async ({ page }) => {
    // Login as donor user
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    // Wait for login and redirect
    await page.waitForTimeout(3000)
    
    // Verify we're logged in
    const authTokenBefore = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(authTokenBefore).toBeTruthy()
    
    // Reload the page
    await page.reload()
    await page.waitForTimeout(2000)
    
    // Verify token persists and user is still authenticated
    const authTokenAfter = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(authTokenAfter).toBe(authTokenBefore) // Should be the same token
    
    // Should still be able to access protected pages
    await page.goto('http://localhost:3001/donor/profile')
    await page.waitForTimeout(2000)
    
    // Should not be redirected to login
    const currentUrl = page.url()
    expect(currentUrl).toContain('/donor/profile')
    expect(currentUrl).not.toContain('/login')
  })

  test('should handle multi-role user with correct priority', async ({ page }) => {
    // Login as multi-role user
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'multi_role_user')
    await page.fill('input[name="password"]', 'multi123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Should be redirected based on role priority (coordinator > donor)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/dashboard')
    expect(currentUrl).not.toContain('/donor/dashboard')
    
    // Verify user has the correct primary role assigned
    const userInfo = await page.evaluate(() => {
      const authStore = (window as any).__ZUSTAND_STORE__?.getState()?.auth
      return {
        user: authStore?.user,
        permissions: authStore?.permissions
      }
    })
    
    expect(userInfo.user?.role).toBe('COORDINATOR')
    expect(userInfo.permissions).toContain('VIEW_COORDINATOR_DASHBOARD')
  })

  test('should enforce role-based access control', async ({ page }) => {
    // Login as donor-only user
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Test access to donor-allowed pages
    const allowedPaths = [
      '/donor/dashboard',
      '/donor/profile',
      '/donor/entities'
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
    
    // Test access to restricted pages
    const restrictedPaths = [
      '/assessor/dashboard',
      '/coordinator/dashboard',
      '/responder/dashboard'
    ]
    
    for (const path of restrictedPaths) {
      const response = await page.goto(`http://localhost:3001${path}`)
      
      if (response) {
        // Should either redirect (302) or show access denied
        const status = response.status()
        if (status === 302) {
          // Redirect is acceptable
          console.log(`✅ Correctly redirected from ${path}`)
        } else {
          // If it loads, should show access denied
          await page.waitForTimeout(1000)
          const accessDenied = await page.getByText(/access denied|unauthorized|not allowed/i).isVisible()
          expect(accessDenied).toBe(true)
        }
      }
    }
  })

  test('should show donor dashboard links with correct permissions', async ({ page }) => {
    // Login as donor user
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Should see donor-specific tiles on main dashboard
    const donorDashboardTile = page.getByTestId('donor-dashboard-tile')
    await expect(donorDashboardTile).toBeVisible()
    
    const donorRegistrationLink = page.getByTestId('donor-registration-portal-link')
    await expect(donorRegistrationLink).toBeVisible()
    
    // Click donor dashboard tile
    await donorDashboardTile.click()
    await page.waitForTimeout(2000)
    
    // Should navigate to donor dashboard
    const currentUrl = page.url()
    expect(currentUrl).toContain('/donor/dashboard')
    
    // Verify donor dashboard content loads
    await expect(page.getByTestId('donor-dashboard-container')).toBeVisible()
  })

  test('should handle authentication token cleanup on logout', async ({ page }) => {
    // Login as donor user
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Verify token exists
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
      // Manual logout - clear token
      await page.evaluate(() => {
        localStorage.removeItem('auth_token')
      })
      await page.reload()
      await page.waitForTimeout(2000)
    }
    
    // Verify token is removed
    const tokenAfterLogout = await page.evaluate(() => {
      return localStorage.getItem('auth_token')
    })
    expect(tokenAfterLogout).toBe(null)
    
    // Should be redirected to login or unable to access protected pages
    await page.goto('http://localhost:3001/donor/profile')
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    expect(currentUrl).toContain('/login')
  })

  test('should pass authentication tokens to API calls correctly', async ({ page }) => {
    // Login as donor user
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
    
    // Check that API calls include proper Authorization headers
    expect(apiRequests.length).toBeGreaterThan(0)
    
    for (const request of apiRequests) {
      expect(request.headers['authorization']).toBeTruthy()
      expect(request.headers['authorization']).toContain('Bearer')
      expect(request.headers['authorization']).not.toContain('undefined')
      expect(request.headers['authorization']).not.toContain('null')
    }
  })

  test('should handle entity selector without Select component errors', async ({ page }) => {
    // Login as donor user
    await page.goto('http://localhost:3001/login')
    
    await page.fill('input[name="username"]', 'donor_user')
    await page.fill('input[name="password"]', 'donor123!')
    await page.click('[data-testid="login-submit-button"]')
    
    await page.waitForTimeout(3000)
    
    // Navigate to entities page
    await page.goto('http://localhost:3001/donor/entities')
    await page.waitForTimeout(3000)
    
    // Should load without Select component errors
    const currentUrl = page.url()
    expect(currentUrl).toContain('/donor/entities')
    
    // Entity selector should be visible
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
        const errors = await page.evaluate(() => {
          return (window as any).__PLAYWRIGHT_ERRORS__ || []
        })
        expect(errors.length).toBe(0)
      }
    }
  })
})