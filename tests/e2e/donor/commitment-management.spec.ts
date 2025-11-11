import { test, expect } from '@playwright/test';

test.describe('Donor Commitment Management Workflow', () => {
  const testUser = {
    email: 'donor@test.com',
    password: 'password123'
  };

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', testUser.email);
    await page.fill('[data-testid=password]', testUser.password);
    await page.click('[data-testid=login-button]');
    
    // Wait for login to process - handle possible redirects
    await page.waitForTimeout(2000);
    
    // Check if we're on a dashboard (any type)
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      // If we're on general dashboard, navigate to donor dashboard
      if (currentUrl === 'http://localhost:3000/dashboard') {
        await page.goto('/donor/dashboard');
      }
    }
    
    await expect(page).toHaveURL('/donor/dashboard');
  });

  test('complete commitment management workflow', async ({ page }) => {
    // Step 1: Navigate to commitments
    await page.click('[data-testid=commitments-link]');
    await expect(page).toHaveURL('/donor/commitments');

    // Step 2: Create new commitment
    await page.click('[data-testid=new-commitment-button]');
    
    // Fill commitment form
    await page.fill('[data-testid=commitment-name]', 'Food Supplies Commitment');
    
    // Select entity
    await page.click('[data-testid=entity-select]');
    await page.keyboard('{ArrowDown}{Enter}'); // Select first entity
    
    // Add commitment items
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name-0]', 'Rice');
    await page.fill('[data-testid=item-quantity-0]', '100');
    await page.fill('[data-testid=item-unit-0]', 'kg');
    
    // Add another item
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name-1]', 'Blankets');
    await page.fill('[data-testid=item-quantity-1]', '50');
    await page.fill('[data-testid=item-unit-1]', 'pieces');
    
    // Add notes
    await page.fill('[data-testid=commitment-notes]', 'Test commitment for disaster relief');
    
    // Submit commitment
    await page.click('[data-testid=submit-commitment]');
    
    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('text=Food Supplies Commitment')).toBeVisible();
    
    // Step 3: View commitment in dashboard
    await page.goto('/donor/commitments');
    await expect(page.locator('text=Food Supplies Commitment')).toBeVisible();
    await expect(page.locator('[data-testid=status-planned]')).toBeVisible();
    
    // Step 4: Update commitment status
    await page.click('[data-testid=commitment-card]:first-child');
    await page.click('[data-testid=update-status-button]');
    await page.selectOption('[data-testid=status-select]', 'PARTIAL');
    await page.fill('[data-testid=delivered-quantity]', '50');
    await page.click('[data-testid-save-update]');
    
    // Verify status update
    await expect(page.locator('[data-testid=status-partial]')).toBeVisible();
    await expect(page.locator('text=50 \/ 100')).toBeVisible();
  });

  test('validates commitment form inputs', async ({ page }) => {
    await page.click('[data-testid=commitments-link]');
    await page.click('[data-testid=new-commitment-button]');
    
    // Try to submit empty form
    await page.click('[data-testid=submit-commitment]');
    
    // Should show validation errors
    await expect(page.locator('text=Entity is required')).toBeVisible();
    await expect(page.locator('text=Incident is required')).toBeVisible();
    await expect(page.locator('text=At least one item is required')).toBeVisible();
    
    // Add item without quantity
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name-0]', 'Medical Supplies');
    await page.click('[data-testid=submit-commitment]');
    
    await expect(page.locator('text=Quantity is required')).toBeVisible();
    await expect(page.locator('text=Unit is required')).toBeVisible();
  });

  test('role-based access control - donor limitations', async ({ page, context }) => {
    // Donor can only see their own commitments
    await page.goto('/donor/commitments');
    await expect(page.locator('[data-testid=commitment-list]')).toBeVisible();
    
    // Try to access coordinator endpoint (should fail)
    const response = await context.request.get('/api/v1/coordinator/assignments');
    expect(response.status()).toBe(401); // Unauthorized
    
    // Try to access other donor's commitments (should be blocked by API)
    const otherDonorResponse = await context.request.get('/api/v1/donors/other-donor-id/commitments');
    expect(otherDonorResponse.status()).toBe(403); // Forbidden
  });

  test('handles error scenarios gracefully', async ({ page }) => {
    await page.click('[data-testid=commitments-link]');
    await page.click('[data-testid=new-commitment-button]');
    
    // Mock network failure
    await page.route('/api/v1/donors/*/commitments', route => route.abort());
    
    await page.click('[data-testid=entity-select]');
    await page.keyboard('{ArrowDown}{Enter}');
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name-0]', 'Test Item');
    await page.fill('[data-testid=item-quantity-0]', '10');
    await page.fill('[data-testid=item-unit-0]', 'pieces');
    await page.click('[data-testid=submit-commitment]');
    
    // Should show error message
    await expect(page.locator('[data-testid=error-message]')).toBeVisible();
    await expect(page.locator('text=Failed to create commitment')).toBeVisible();
  });

  test('search and filtering functionality', async ({ page }) => {
    // Create some test commitments first
    await createTestCommitment(page, 'Rice Donation', { name: 'Rice', unit: 'kg', quantity: 200 });
    await createTestCommitment(page, 'Medical Supplies', { name: 'Bandages', unit: 'boxes', quantity: 10 });
    
    await page.goto('/donor/commitments');
    
    // Test search functionality
    await page.fill('[data-testid=search-input]', 'Rice');
    await expect(page.locator('text=Rice Donation')).toBeVisible();
    await expect(page.locator('text=Medical Supplies')).not.toBeVisible();
    
    // Clear search
    await page.fill('[data-testid=search-input]', '');
    await expect(page.locator('text=Rice Donation')).toBeVisible();
    await expect(page.locator('text=Medical Supplies')).toBeVisible();
    
    // Test status filtering
    await page.selectOption('[data-testid=status-filter]', 'PLANNED');
    await expect(page.locator('[data-testid=commitment-card]')).toHaveCount(2);
    
    // Test entity filtering
    await page.selectOption('[data-testid=entity-filter]', '1'); // First entity
    // Should filter commitments by entity
  });

  test('accessibility and keyboard navigation', async ({ page }) => {
    await page.click('[data-testid=commitments-link]');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test ARIA labels on form elements
    await page.click('[data-testid=new-commitment-button]');
    
    // Check for proper ARIA attributes
    const entitySelect = page.locator('[data-testid=entity-select]');
    await expect(entitySelect).toHaveAttribute('aria-label');
    
    // Test form field accessibility
    const itemInput = page.locator('[data-testid=item-name-0]');
    await expect(itemInput).toHaveAttribute('aria-required', 'true');
    
    // Test button accessibility
    const submitButton = page.locator('[data-testid=submit-commitment]');
    await expect(submitButton).toHaveAttribute('type', 'submit');
  });

  test('commitment status tracking workflow', async ({ page }) => {
    // Create a commitment first
    await createTestCommitment(page, 'Status Tracking Test', { name: 'Water', unit: 'liters', quantity: 500 });
    
    // Navigate to commitment details
    await page.goto('/donor/commitments');
    await page.click('[data-testid=commitment-card]:first-child');
    
    // Verify status timeline
    await expect(page.locator('[data-testid=status-timeline]')).toBeVisible();
    await expect(page.locator('text=Planned')).toBeVisible();
    await expect(page.locator('text=Commitment created')).toBeVisible();
    
    // Update status to PARTIAL
    await page.click('[data-testid=update-status-button]');
    await page.selectOption('[data-testid=status-select]', 'PARTIAL');
    await page.fill('[data-testid=delivered-quantity]', '250');
    await page.fill('[data-testid=update-notes]', 'Partial delivery completed');
    await page.click('[data-testid-save-update]');
    
    // Verify status update
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=50% complete')).toBeVisible();
    await expect(page.locator('text=250 \/ 500')).toBeVisible();
    
    // Update status to COMPLETE
    await page.click('[data-testid=update-status-button]');
    await page.selectOption('[data-testid=status-select]', 'COMPLETE');
    await page.click('[data-testid-save-update]');
    
    // Verify completion
    await expect(page.locator('text=Complete')).toBeVisible();
    await expect(page.locator('text=100% complete')).toBeVisible();
    await expect(page.locator('[data-testid=progress-complete]')).toBeVisible();
    
    // Cannot edit completed commitments
    await expect(page.locator('[data-testid=update-status-button]')).not.toBeVisible();
  });

  test('handles commitment cancellation', async ({ page }) => {
    // Create a commitment
    await createTestCommitment(page, 'Cancellable Commitment', { name: 'Tents', unit: 'pieces', quantity: 20 });
    
    // Go to commitment details
    await page.goto('/donor/commitments');
    await page.click('[data-testid=commitment-card]:first-child');
    
    // Cancel commitment
    await page.click('[data-testid=cancel-commitment]');
    await page.click('[data-testid=confirm-cancel]');
    
    // Verify cancellation
    await expect(page.locator('text=Cancelled')).toBeVisible();
    await expect(page.locator('[data-testid=cancellation-message]')).toBeVisible();
    
    // Cannot edit cancelled commitments
    await expect(page.locator('[data-testid=update-status-button]')).not.toBeVisible();
  });

  test('value estimation calculations', async ({ page }) => {
    await page.click('[data-testid=commitments-link]');
    await page.click('[data-testid=new-commitment-button]');
    
    // Add items with predefined values
    await page.click('[data-testid=entity-select]');
    await page.keyboard('{ArrowDown}{Enter}');
    
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name-0]', 'Rice'); // $0.50/kg
    await page.fill('[data-testid=item-quantity-0]', '100');
    await page.fill('[data-testid=item-unit-0]', 'kg');
    
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name-1]', 'Blankets'); // $15.00/pieces
    await page.fill('[data-testid=item-quantity-1]', '10');
    await page.fill('[data-testid=item-unit-1]', 'pieces');
    
    // Check estimated value
    const estimatedValue = (0.50 * 100) + (15.00 * 10); // $50 + $150 = $200
    await expect(page.locator('[data-testid=estimated-value]')).toContainText(`$${estimatedValue.toFixed(2)}`);
    
    // Test custom value
    await page.fill('[data-testid=item-value-1]', '20');
    const updatedValue = (0.50 * 100) + (20.00 * 10); // $50 + $200 = $250
    await expect(page.locator('[data-testid=estimated-value]')).toContainText(`$${updatedValue.toFixed(2)}`);
  });

  // Helper function to create test commitments
  async function createTestCommitment(page: any, name: string, item: any) {
    await page.goto('/donor/commitments');
    await page.click('[data-testid=new-commitment-button]');
    
    await page.fill('[data-testid=commitment-name]', name);
    await page.click('[data-testid=entity-select]');
    await page.keyboard('{ArrowDown}{Enter}');
    
    await page.click('[data-testid=add-item-button]');
    await page.fill('[data-testid=item-name-0]', item.name);
    await page.fill('[data-testid=item-quantity-0]', item.quantity.toString());
    await page.fill('[data-testid=item-unit-0]', item.unit);
    
    await page.click('[data-testid=submit-commitment]');
    
    // Wait for success message
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    
    // Wait a moment for the success to process
    await page.waitForTimeout(1000);
  }
});