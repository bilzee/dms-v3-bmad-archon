import { test, expect } from '@playwright/test'

test.describe('Delivery Confirmation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as responder
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'responder@test.com')
    await page.fill('[data-testid="password"]', 'testpassword123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard to load
    await page.waitForURL('/responder/dashboard')
    await expect(page.locator('h1')).toContainText('Responder Dashboard')
  })

  test('should complete full delivery workflow online', async ({ page }) => {
    // Navigate to planned deliveries
    await page.click('[data-testid="planned-deliveries-tab"]')
    
    // Find and click on a planned delivery
    await page.click('[data-testid="delivery-card"]:first-child [data-testid="confirm-delivery-btn"]')
    
    // Wait for delivery confirmation form to load
    await expect(page.locator('h2')).toContainText('Confirm Delivery')
    
    // GPS should be automatically captured
    await expect(page.locator('[data-testid="gps-status"]')).toContainText('Location captured')
    
    // Verify delivered items are pre-filled
    await expect(page.locator('[data-testid="delivered-items"]')).toBeVisible()
    
    // Add delivery notes
    await page.fill('[data-testid="delivery-notes"]', 'All items delivered successfully to main distribution point')
    
    // Add photo evidence
    await page.click('[data-testid="add-photo-btn"]')
    
    // Mock file upload (in real test, would use actual file)
    const fileInput = page.locator('[data-testid="media-file-input"]')
    await fileInput.setInputFiles('tests/fixtures/delivery-photo.jpg')
    
    // Wait for photo to upload and validate
    await expect(page.locator('[data-testid="media-preview"]')).toBeVisible()
    await expect(page.locator('[data-testid="media-quality-indicator"]')).toContainText('Good Quality')
    
    // Submit delivery confirmation
    await page.click('[data-testid="confirm-delivery-btn"]')
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Delivery confirmed successfully')
    
    // Verify redirect back to dashboard
    await expect(page).toHaveURL('/responder/dashboard')
    
    // Verify the delivery no longer appears in planned deliveries
    await page.reload()
    await page.click('[data-testid="planned-deliveries-tab"]')
    await expect(page.locator('[data-testid="delivery-card"]')).toHaveCount(0) // Assuming no other planned deliveries
  })

  test('should handle delivery workflow in offline mode', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true)
    
    // Navigate to planned deliveries
    await page.click('[data-testid="planned-deliveries-tab"]')
    
    // Verify offline indicator is shown
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline')
    
    // Find and click on a planned delivery
    await page.click('[data-testid="delivery-card"]:first-child [data-testid="confirm-delivery-btn"]')
    
    // Wait for delivery confirmation form
    await expect(page.locator('h2')).toContainText('Confirm Delivery')
    
    // Verify offline warning is shown
    await expect(page.locator('[data-testid="offline-warning"]')).toContainText('Working offline')
    
    // Complete delivery form
    await page.fill('[data-testid="delivery-notes"]', 'Delivery completed offline - will sync when connection is restored')
    
    // Submit delivery confirmation
    await page.click('[data-testid="confirm-delivery-btn"]')
    
    // Should show offline success message
    await expect(page.locator('[data-testid="offline-success-toast"]')).toContainText('stored for offline sync')
    
    // Go to offline sync dashboard
    await page.click('[data-testid="offline-sync-tab"]')
    
    // Verify pending operation appears
    await expect(page.locator('[data-testid="pending-operations"]')).toContainText('1 pending')
    await expect(page.locator('[data-testid="operation-item"]')).toContainText('delivery_confirmation')
    
    // Go back online
    await page.context().setOffline(false)
    await page.reload()
    
    // Should automatically sync
    await page.click('[data-testid="offline-sync-tab"]')
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('All synced')
  })

  test('should validate GPS location requirements', async ({ page }) => {
    // Navigate to delivery confirmation
    await page.click('[data-testid="planned-deliveries-tab"]')
    await page.click('[data-testid="delivery-card"]:first-child [data-testid="confirm-delivery-btn"]')
    
    // Mock GPS capture failure
    await page.evaluate(() => {
      navigator.geolocation = {
        getCurrentPosition: (success, error) => {
          error({ code: 1, message: 'GPS unavailable' })
        }
      }
    })
    
    // Try to capture GPS
    await page.click('[data-testid="capture-gps-btn"]')
    
    // Should show GPS error
    await expect(page.locator('[data-testid="gps-error"]')).toContainText('GPS capture failed')
    
    // Try to submit without GPS
    await page.click('[data-testid="confirm-delivery-btn"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('GPS location is required')
    
    // Mock successful GPS capture
    await page.evaluate(() => {
      navigator.geolocation = {
        getCurrentPosition: (success) => {
          success({
            coords: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
            timestamp: Date.now()
          })
        }
      }
    })
    
    // Capture GPS successfully
    await page.click('[data-testid="capture-gps-btn"]')
    
    // Should show GPS success
    await expect(page.locator('[data-testid="gps-status"]')).toContainText('Location captured')
  })

  test('should handle media upload and validation', async ({ page }) => {
    // Navigate to delivery confirmation
    await page.click('[data-testid="planned-deliveries-tab"]')
    await page.click('[data-testid="delivery-card"]:first-child [data-testid="confirm-delivery-btn"]')
    
    // Click to add photo
    await page.click('[data-testid="add-photo-btn"]')
    
    // Upload a photo
    const fileInput = page.locator('[data-testid="media-file-input"]')
    await fileInput.setInputFiles('tests/fixtures/delivery-photo.jpg')
    
    // Wait for upload and validation
    await expect(page.locator('[data-testid="media-preview"]')).toBeVisible()
    
    // Verify GPS metadata is captured with photo
    await expect(page.locator('[data-testid="photo-gps-info"]')).toContainText('GPS: 40.7128, -74.0060')
    
    // Verify quality assessment
    await expect(page.locator('[data-testid="media-quality-score"]')).toBeVisible()
    
    // Upload a second photo
    await page.click('[data-testid="add-photo-btn"]')
    await fileInput.setInputFiles('tests/fixtures/delivery-photo2.jpg')
    
    // Should show multiple photos
    await expect(page.locator('[data-testid="media-preview"]')).toHaveCount(2)
    
    // Should show completeness score
    await expect(page.locator('[data-testid="media-completeness"]')).toContainText('Good coverage')
  })

  test('should handle delivery verification workflow', async ({ page }) => {
    // First complete a delivery as responder
    await page.click('[data-testid="planned-deliveries-tab"]')
    await page.click('[data-testid="delivery-card"]:first-child [data-testid="confirm-delivery-btn"]')
    
    await page.fill('[data-testid="delivery-notes"]', 'Delivery ready for verification')
    await page.click('[data-testid="confirm-delivery-btn"]')
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('submitted for verification')
    
    // Switch to coordinator role for verification
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="switch-to-coordinator"]')
    
    // Navigate to verification queue
    await page.goto('/coordinator/verification/deliveries')
    
    // Should see the delivery in verification queue
    await expect(page.locator('[data-testid="verification-queue"]')).toContainText('New delivery for verification')
    
    // Click to verify
    await page.click('[data-testid="verify-delivery-btn"]')
    
    // Should show delivery details
    await expect(page.locator('[data-testid="delivery-details"]')).toContainText('Delivery ready for verification')
    
    // Should show attached media
    await expect(page.locator('[data-testid="verification-media"]')).toBeVisible()
    
    // Should show GPS location
    await expect(page.locator('[data-testid="verification-gps"]')).toContainText('40.7128, -74.0060')
    
    // Approve the delivery
    await page.click('[data-testid="approve-delivery-btn"]')
    await page.fill('[data-testid="approval-notes"]', 'Delivery verified - all items accounted for')
    await page.click('[data-testid="confirm-approval-btn"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="approval-success"]')).toContainText('Delivery verified successfully')
    
    // Delivery should be removed from queue
    await expect(page.locator('[data-testid="verification-queue"]')).not.toContainText('New delivery for verification')
  })

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Navigate to delivery confirmation
    await page.click('[data-testid="planned-deliveries-tab"]')
    await page.click('[data-testid="delivery-card"]:first-child [data-testid="confirm-delivery-btn"]')
    
    // Try to submit without any delivery notes
    await page.click('[data-testid="confirm-delivery-btn"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('At least one delivered item is required')
    
    // Simulate network error during submission
    await page.route('/api/v1/responses/*/deliver', route => {
      route.abort('failed')
    })
    
    // Fill form and try to submit
    await page.fill('[data-testid="delivery-notes"]', 'Test delivery')
    await page.click('[data-testid="confirm-delivery-btn"]')
    
    // Should fall back to offline mode
    await expect(page.locator('[data-testid="offline-fallback-message"]')).toContainText('stored for offline sync')
  })

  test('should support keyboard navigation and accessibility', async ({ page }) => {
    // Navigate to delivery confirmation using keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Should open planned deliveries
    await expect(page.locator('[data-testid="planned-deliveries-tab"]')).toHaveAttribute('aria-selected', 'true')
    
    // Navigate to first delivery card
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Should open delivery confirmation form
    await expect(page.locator('h2')).toContainText('Confirm Delivery')
    
    // Navigate form using keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should focus on delivery notes textarea
    await expect(page.locator('[data-testid="delivery-notes"]')).toBeFocused()
    
    // Fill form using keyboard
    await page.keyboard.type('Delivery completed via keyboard navigation')
    
    // Submit using keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Should submit successfully
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
  })

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to delivery confirmation
    await page.click('[data-testid="mobile-menu-btn"]')
    await page.click('[data-testid="planned-deliveries-mobile"]')
    await page.click('[data-testid="delivery-card"]:first-child')
    
    // Should show mobile-optimized form
    await expect(page.locator('[data-testid="delivery-form-mobile"]')).toBeVisible()
    
    // Verify mobile-specific UI elements
    await expect(page.locator('[data-testid="mobile-capture-btn"]')).toBeVisible()
    
    // Test mobile photo capture
    await page.click('[data-testid="mobile-capture-btn"]')
    
    // Should show mobile camera interface
    await expect(page.locator('[data-testid="mobile-camera-interface"]')).toBeVisible()
    
    // Complete mobile workflow
    await page.fill('[data-testid="delivery-notes-mobile"]', 'Mobile delivery completed')
    await page.click('[data-testid="confirm-delivery-mobile"]')
    
    // Should show mobile success message
    await expect(page.locator('[data-testid="mobile-success-toast"]')).toBeVisible()
  })
})