import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.goto('/')
  })

  test('complete login and logout flow', async ({ page }) => {
    // Should show login form initially
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
    
    // Fill in login credentials
    await page.fill('input[name="email"]', 'admin@dms.gov.ng')
    await page.fill('input[name="password"]', 'admin123!')
    
    // Submit login form
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Welcome')).toBeVisible()
    
    // Should show user menu
    await page.click('[data-testid="user-menu"]')
    await expect(page.getByText('Logout')).toBeVisible()
    
    // Logout
    await page.click('text=Logout')
    
    // Should redirect back to login
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    
    // Submit login form
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('should validate form fields', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
    
    // Test invalid email format
    await page.fill('input[name="email"]', 'invalid-email')
    await page.blur('input[name="email"]')
    
    await expect(page.getByText(/invalid email format/i)).toBeVisible()
  })

  test('should handle session persistence', async ({ page, context }) => {
    // Login successfully
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@dms.gov.ng')
    await page.fill('input[name="password"]', 'admin123!')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Create new page in same context
    const newPage = await context.newPage()
    await newPage.goto('/')
    
    // Should be automatically logged in
    await expect(newPage).toHaveURL('/dashboard')
    await expect(newPage.getByText('Welcome')).toBeVisible()
  })

  test('should handle role-based access', async ({ page }) => {
    // Login as coordinator
    await page.goto('/login')
    await page.fill('input[name="email"]', 'coordinator@dms.gov.ng')
    await page.fill('input[name="password"]', 'coordinator123!')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Should have access to coordinator features
    await expect(page.getByText('Crisis Management')).toBeVisible()
    await expect(page.getByText('Verification Queue')).toBeVisible()
    
    // Try to access admin-only page
    await page.goto('/admin/users')
    
    // Should be redirected or show access denied
    await expect(page.getByText(/access denied|unauthorized/i)).toBeVisible()
  })

  test('should handle token refresh', async ({ page }) => {
    // Login successfully
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@dms.gov.ng')
    await page.fill('input[name="password"]', 'admin123!')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Wait for some time (simulating token near expiry)
    await page.waitForTimeout(2000)
    
    // Make an API request that should trigger token refresh
    await page.reload()
    
    // Should still be logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Welcome')).toBeVisible()
  })

  test('should handle password requirements in admin user creation', async ({ page }) => {
    // Login as admin first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@dms.gov.ng')
    await page.fill('input[name="password"]', 'admin123!')
    await page.click('button[type="submit"]')
    
    // Navigate to user management
    await page.goto('/admin/users')
    
    // Open create user dialog
    await page.click('text=Create User')
    
    // Fill in user details
    await page.fill('input[name="email"]', 'newuser@example.com')
    await page.fill('input[name="username"]', 'newuser')
    await page.fill('input[name="name"]', 'New User')
    
    // Test weak password
    await page.fill('input[name="password"]', '123')
    await page.blur('input[name="password"]')
    
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
    
    // Test valid password
    await page.fill('input[name="password"]', 'securepassword123!')
    await page.blur('input[name="password"]')
    
    // Validation error should disappear
    await expect(page.getByText(/password must be at least 8 characters/i)).not.toBeVisible()
  })

  test('should prevent public registration access', async ({ page }) => {
    // Try to access registration page directly
    await page.goto('/register')
    
    // Should get 404 or redirect to login
    const isNotFound = await page.getByText('404').isVisible().catch(() => false)
    const isLoginPage = await page.getByRole('heading', { name: /login/i }).isVisible().catch(() => false)
    
    expect(isNotFound || isLoginPage).toBe(true)
    
    // Verify no registration link on login page
    await page.goto('/login')
    await expect(page.getByText(/register here/i)).not.toBeVisible()
    await expect(page.getByText(/contact your administrator/i)).toBeVisible()
  })

  test('should handle multiple role assignment', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@dms.gov.ng')
    await page.fill('input[name="password"]', 'admin123!')
    await page.click('button[type="submit"]')
    
    // Navigate to user management
    await page.goto('/admin/users')
    
    // Create new user with multiple roles
    await page.click('text=Create User')
    await page.fill('input[name="email"]', 'multiuser@example.com')
    await page.fill('input[name="username"]', 'multiuser')
    await page.fill('input[name="name"]', 'Multi Role User')
    await page.fill('input[name="password"]', 'password123!')
    
    // Select multiple roles
    await page.check('input[value="assessor"]')
    await page.check('input[value="coordinator"]')
    
    await page.click('button[type="submit"]')
    
    // Should show success message
    await expect(page.getByText(/user created successfully/i)).toBeVisible()
    
    // User should appear in list with multiple roles
    await expect(page.getByText('multiuser@example.com')).toBeVisible()
    await expect(page.getByText('Assessor, Coordinator')).toBeVisible()
  })
})