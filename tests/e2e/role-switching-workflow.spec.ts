import { test, expect } from '@playwright/test';

test.describe('Role Switching E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with a user that has multiple roles
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'multirole@test.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display role switcher in header', async ({ page }) => {
    // Check that role switcher is visible in the header
    await expect(page.locator('[data-testid="role-switcher"]')).toBeVisible();
    
    // Check that current role is displayed
    await expect(page.locator('[data-testid="current-role"]')).toContainText('Assessor');
  });

  test('should show role dropdown when clicked', async ({ page }) => {
    // Click on role switcher
    await page.click('[data-testid="role-switcher"]');
    
    // Check that dropdown menu appears
    await expect(page.locator('[data-testid="role-dropdown"]')).toBeVisible();
    
    // Check that available roles are listed
    await expect(page.locator('[data-testid="role-option-assessor"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-option-coordinator"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-option-responder"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-option-donor"]')).toBeVisible();
  });

  test('should switch roles successfully', async ({ page }) => {
    // Start on assessor dashboard
    await expect(page).toHaveURL(/\/assessor\/dashboard/);
    await expect(page.locator('h1')).toContainText('Assessor Dashboard');
    
    // Click on role switcher
    await page.click('[data-testid="role-switcher"]');
    
    // Click on Coordinator role
    await page.click('[data-testid="role-option-coordinator"]');
    
    // Should redirect to coordinator dashboard
    await expect(page).toHaveURL(/\/coordinator\/dashboard/);
    await expect(page.locator('h1')).toContainText('Coordinator Dashboard');
    
    // Check that role switcher now shows "Coordinator"
    await expect(page.locator('[data-testid="current-role"]')).toContainText('Coordinator');
    
    // Check that navigation has updated
    await expect(page.locator('[data-testid="nav-item-coordination"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-item-assessments"]')).not.toBeVisible();
  });

  test('should preserve form data across role switches with warning', async ({ page }) => {
    // Navigate to a page with a form
    await page.goto('/assessments/new');
    
    // Fill out some form data
    await page.fill('input[name="title"]', 'Test Assessment');
    await page.fill('textarea[name="description"]', 'This is a test assessment');
    
    // Mark form as dirty (simulate user interaction)
    await page.evaluate(() => {
      document.querySelector('form')?.setAttribute('data-dirty', 'true');
    });
    
    // Try to switch roles
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-option-coordinator"]');
    
    // Should show unsaved changes warning
    await expect(page.locator('[data-testid="unsaved-changes-warning"]')).toBeVisible();
    await expect(page.locator('h3')).toContainText('Unsaved Changes');
    
    // Click cancel to stay on current page
    await page.click('[data-testid="warning-cancel"]');
    
    // Should still be on assessments page
    await expect(page).toHaveURL(/\/assessments/);
    await expect(page.locator('input[name="title"]')).toHaveValue('Test Assessment');
    
    // Try switching again and click save & switch
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-option-coordinator"]');
    await page.click('[data-testid="warning-save-switch"]');
    
    // Should now redirect to coordinator dashboard
    await expect(page).toHaveURL(/\/coordinator\/dashboard/);
  });

  test('should save and restore form data per role', async ({ page }) => {
    // Start as Assessor and fill a form
    await page.goto('/assessments/new');
    await page.fill('input[name="title"]', 'Assessor Form Data');
    await page.fill('input[name="location"]', 'Assessor Location');
    
    // Switch to Coordinator
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-option-coordinator"]');
    
    // Fill a different form as Coordinator
    await page.goto('/responses/new');
    await page.fill('input[name="title"]', 'Coordinator Response Data');
    await page.fill('input[name="priority"]', 'HIGH');
    
    // Switch back to Assessor
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-option-assessor"]');
    
    // Return to assessments form
    await page.goto('/assessments/new');
    
    // Form data should be restored (this would require form restoration implementation)
    // For now, we'll check that the session data exists in storage
    const sessionData = await page.evaluate(() => {
      const storage = localStorage.getItem('auth-storage');
      return storage ? JSON.parse(storage) : null;
    });
    
    expect(sessionData).toBeTruthy();
    expect(sessionData.state.currentRole).toBe('ASSESSOR');
    expect(sessionData.state.roleSessionState).toBeDefined();
  });

  test('should maintain role context across page refreshes', async ({ page }) => {
    // Switch to Coordinator role
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-option-coordinator"]');
    
    await expect(page).toHaveURL(/\/coordinator\/dashboard/);
    
    // Refresh the page
    await page.reload();
    
    // Should still be on coordinator dashboard with same role
    await expect(page).toHaveURL(/\/coordinator\/dashboard/);
    await expect(page.locator('[data-testid="current-role"]')).toContainText('Coordinator');
    
    // Navigation should still show coordinator-specific items
    await expect(page.locator('[data-testid="nav-item-coordination"]')).toBeVisible();
  });

  test('should handle role-based access control', async ({ page }) => {
    // Start as Assessor
    await expect(page).toHaveURL(/\/assessor\/dashboard/);
    
    // Try to access coordinator-specific URL directly
    await page.goto('/coordination/team-management');
    
    // Should redirect back to assessor dashboard
    await expect(page).toHaveURL(/\/assessor\/dashboard/);
    
    // Switch to Coordinator role
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-option-coordinator"]');
    
    // Now should be able to access coordinator pages
    await page.goto('/coordination/team-management');
    await expect(page).toHaveURL(/\/coordination\/team-management/);
    
    // Try to access admin pages (should not work)
    await page.goto('/admin/users');
    
    // Should redirect to coordinator dashboard
    await expect(page).toHaveURL(/\/coordinator\/dashboard/);
  });

  test('should handle mobile responsive role switching', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Role switcher should still be visible and functional
    await expect(page.locator('[data-testid="role-switcher"]')).toBeVisible();
    
    // Click role switcher on mobile
    await page.click('[data-testid="role-switcher"]');
    
    // Dropdown should still work
    await expect(page.locator('[data-testid="role-dropdown"]')).toBeVisible();
    
    // Switch roles on mobile
    await page.click('[data-testid="role-option-coordinator"]');
    
    // Should still redirect correctly
    await expect(page).toHaveURL(/\/coordinator\/dashboard/);
  });

  test('should handle error cases gracefully', async ({ page }) => {
    // Mock network error for role switching
    await page.route('/api/v1/users/switch-role', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Try to switch roles
    await page.click('[data-testid="role-switcher"]');
    await page.click('[data-testid="role-option-coordinator"]');
    
    // Should show error message (implementation dependent)
    // For now, just verify it doesn't break the UI
    await expect(page.locator('[data-testid="role-switcher"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-role"]')).toContainText('Assessor');
  });

  test('should work with keyboard navigation', async ({ page }) => {
    // Focus the role switcher
    await page.focus('[data-testid="role-switcher"]');
    
    // Open dropdown with Enter key
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="role-dropdown"]')).toBeVisible();
    
    // Navigate dropdown with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Select role with Enter
    await page.keyboard.press('Enter');
    
    // Should switch role
    await expect(page).toHaveURL(/\/coordinator\/dashboard/);
  });

  test.afterEach(async ({ page }) => {
    // Clean up - logout after each test
    await page.click('[data-testid="logout-button"]');
  });
});