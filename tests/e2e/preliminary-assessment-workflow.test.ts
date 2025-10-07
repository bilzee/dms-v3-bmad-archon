import { test, expect } from '@playwright/test'

test.describe('Preliminary Assessment Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate as an assessor
    await page.goto('/login')
    
    // Mock authentication (adjust based on your auth flow)
    await page.fill('[data-testid="email"]', 'assessor@test.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for redirect to dashboard or preliminary assessment page
    await page.waitForURL('**/preliminary-assessment')
  })

  test('should complete full preliminary assessment creation workflow', async ({ page }) => {
    // Should be on the preliminary assessment page
    await expect(page.locator('h1')).toContainText('Preliminary Assessment')
    
    // Fill in location information
    await page.fill('[data-testid="reporting-lga"]', 'Lagos Island')
    await page.fill('[data-testid="reporting-ward"]', 'Ward 1')
    
    // Set GPS coordinates manually
    await page.click('[data-testid="manual-gps-entry"]')
    await page.fill('[data-testid="latitude-input"]', '9.072264')
    await page.fill('[data-testid="longitude-input"]', '7.491302')
    await page.click('[data-testid="set-location"]')
    
    // Verify GPS coordinates are displayed
    await expect(page.locator('[data-testid="current-location"]')).toContainText('9.072264')
    await expect(page.locator('[data-testid="current-location"]')).toContainText('7.491302')
    
    // Fill in human impact data
    await page.fill('[data-testid="lives-lost"]', '0')
    await page.fill('[data-testid="injured"]', '5')
    await page.fill('[data-testid="displaced"]', '20')
    await page.fill('[data-testid="houses-affected"]', '10')
    
    // Fill in infrastructure impact
    await page.fill('[data-testid="schools-affected"]', 'Primary School A - roof damaged')
    await page.fill('[data-testid="medical-facilities"]', 'Health Center B - equipment damaged')
    await page.fill('[data-testid="agricultural-lands"]', '2 hectares of farmland flooded')
    
    // Add additional details
    await page.fill('[data-testid="additional-details"]', 'Flash flood caused by heavy rainfall. Emergency response needed.')
    
    // Submit the assessment
    await page.click('[data-testid="submit-assessment"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Assessment submitted successfully')
    
    // Form should be reset
    await expect(page.locator('[data-testid="reporting-lga"]')).toHaveValue('')
    await expect(page.locator('[data-testid="reporting-ward"]')).toHaveValue('')
  })

  test('should create assessment with incident when checkbox is checked', async ({ page }) => {
    // Fill in basic assessment data
    await page.fill('[data-testid="reporting-lga"]', 'Lagos Mainland')
    await page.fill('[data-testid="reporting-ward"]', 'Ward 5')
    await page.fill('[data-testid="lives-lost"]', '2')
    await page.fill('[data-testid="injured"]', '10')
    await page.fill('[data-testid="displaced"]', '50')
    await page.fill('[data-testid="houses-affected"]', '25')
    
    // Check the create incident checkbox
    await page.check('[data-testid="create-incident-checkbox"]')
    
    // Incident form should appear
    await expect(page.locator('[data-testid="incident-form"]')).toBeVisible()
    
    // Fill in incident data
    await page.fill('[data-testid="incident-type"]', 'Flood')
    await page.selectOption('[data-testid="incident-severity"]', 'HIGH')
    await page.fill('[data-testid="incident-description"]', 'Severe flooding affecting multiple wards')
    await page.fill('[data-testid="incident-location"]', 'Lagos Mainland, Ward 5')
    
    // Submit assessment with incident
    await page.click('[data-testid="submit-assessment"]')
    
    // Should show success message indicating incident was created
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Assessment and incident created successfully')
  })

  test('should save and load draft assessment', async ({ page }) => {
    // Fill in partial assessment data
    await page.fill('[data-testid="reporting-lga"]', 'Ikeja')
    await page.fill('[data-testid="reporting-ward"]', 'Ward 3')
    await page.fill('[data-testid="injured"]', '8')
    
    // Save as draft
    await page.click('[data-testid="save-draft"]')
    
    // Should show draft saved message
    await expect(page.locator('[data-testid="draft-saved-message"]')).toBeVisible()
    
    // Clear the form (simulate page refresh or navigation)
    await page.reload()
    
    // Check if draft data is restored
    await expect(page.locator('[data-testid="reporting-lga"]')).toHaveValue('Ikeja')
    await expect(page.locator('[data-testid="reporting-ward"]')).toHaveValue('Ward 3')
    await expect(page.locator('[data-testid="injured"]')).toHaveValue('8')
  })

  test('should handle offline functionality', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)
    
    // Fill in assessment data
    await page.fill('[data-testid="reporting-lga"]', 'Alimosho')
    await page.fill('[data-testid="reporting-ward"]', 'Ward 2')
    await page.fill('[data-testid="lives-lost"]', '0')
    await page.fill('[data-testid="injured"]', '3')
    await page.fill('[data-testid="displaced"]', '15')
    await page.fill('[data-testid="houses-affected"]', '8')
    
    // Submit assessment while offline
    await page.click('[data-testid="submit-assessment"]')
    
    // Should show offline submission message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('Assessment saved offline')
    
    // Check offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Should show sync option
    await expect(page.locator('[data-testid="sync-button"]')).toBeVisible()
    
    // Trigger sync
    await page.click('[data-testid="sync-button"]')
    
    // Should show sync success message
    await expect(page.locator('[data-testid="sync-success-message"]')).toBeVisible()
  })

  test('should validate form fields and show error messages', async ({ page }) => {
    // Try to submit empty form
    await page.click('[data-testid="submit-assessment"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="lga-error"]')).toContainText('LGA is required')
    await expect(page.locator('[data-testid="ward-error"]')).toContainText('Ward is required')
    
    // Fill in invalid GPS coordinates
    await page.click('[data-testid="manual-gps-entry"]')
    await page.fill('[data-testid="latitude-input"]', '95') // Invalid: > 90
    await page.fill('[data-testid="longitude-input"]', '185') // Invalid: > 180
    await page.click('[data-testid="set-location"]')
    
    // Should show GPS validation errors
    await expect(page.locator('[data-testid="gps-error"]')).toContainText('Latitude must be between -90 and 90')
    
    // Fill in negative impact numbers
    await page.fill('[data-testid="lives-lost"]', '-1')
    await page.fill('[data-testid="injured"]', '-5')
    
    // Should show impact validation errors
    await expect(page.locator('[data-testid="lives-lost-error"]')).toContainText('Number must be 0 or greater')
    await expect(page.locator('[data-testid="injured-error"]')).toContainText('Number must be 0 or greater')
  })

  test('should handle GPS capture functionality', async ({ page, context }) => {
    // Mock geolocation
    await context.grantPermissions(['geolocation'])
    await page.setGeolocation({ latitude: 9.072264, longitude: 7.491302 })
    
    // Click GPS capture button
    await page.click('[data-testid="capture-gps"]')
    
    // Should show captured coordinates
    await expect(page.locator('[data-testid="current-location"]')).toContainText('9.072264')
    await expect(page.locator('[data-testid="current-location"]')).toContainText('7.491302')
    
    // Coordinates should be used in form submission
    await page.fill('[data-testid="reporting-lga"]', 'Test LGA')
    await page.fill('[data-testid="reporting-ward"]', 'Test Ward')
    await page.fill('[data-testid="lives-lost"]', '0')
    await page.fill('[data-testid="injured"]', '0')
    await page.fill('[data-testid="displaced"]', '0')
    await page.fill('[data-testid="houses-affected"]', '0')
    
    await page.click('[data-testid="submit-assessment"]')
    
    // Should submit successfully with GPS coordinates
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('should handle media upload functionality', async ({ page }) => {
    // Fill in basic assessment data
    await page.fill('[data-testid="reporting-lga"]', 'Victoria Island')
    await page.fill('[data-testid="reporting-ward"]', 'Ward 1')
    await page.fill('[data-testid="lives-lost"]', '0')
    await page.fill('[data-testid="injured"]', '2')
    await page.fill('[data-testid="displaced"]', '10')
    await page.fill('[data-testid="houses-affected"]', '5')
    
    // Upload media files
    const fileInput = page.locator('[data-testid="media-upload"]')
    await fileInput.setInputFiles([
      { name: 'flood-damage-1.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-image-data') },
      { name: 'flood-damage-2.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-image-data-2') }
    ])
    
    // Should show uploaded files
    await expect(page.locator('[data-testid="uploaded-file"]')).toHaveCount(2)
    await expect(page.locator('[data-testid="uploaded-file"]').first()).toContainText('flood-damage-1.jpg')
    
    // Submit assessment with media
    await page.click('[data-testid="submit-assessment"]')
    
    // Should submit successfully
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('should show assessment dashboard with recent assessments', async ({ page }) => {
    // Should show dashboard cards
    await expect(page.locator('[data-testid="drafts-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="recent-assessments-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="sync-status-card"]')).toBeVisible()
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    // Create an assessment to populate recent assessments
    await page.fill('[data-testid="reporting-lga"]', 'Surulere')
    await page.fill('[data-testid="reporting-ward"]', 'Ward 4')
    await page.fill('[data-testid="lives-lost"]', '1')
    await page.fill('[data-testid="injured"]', '4')
    await page.fill('[data-testid="displaced"]', '12')
    await page.fill('[data-testid="houses-affected"]', '6')
    
    await page.click('[data-testid="submit-assessment"]')
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Recent assessments should update
    await expect(page.locator('[data-testid="recent-assessments-card"]')).toContainText('Surulere')
  })
})