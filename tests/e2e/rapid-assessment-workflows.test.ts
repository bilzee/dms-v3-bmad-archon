import { test, expect } from '@playwright/test'

test.describe('Rapid Assessment E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as assessor
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'assessor@test.com')
    await page.fill('[data-testid=password]', 'test-password')
    await page.click('[data-testid=login-button]')
    await page.waitForURL('/dashboard')
  })

  test.describe('Health Assessment Workflow', () => {
    test('should complete health assessment with gap analysis', async ({ page }) => {
      // Navigate to rapid assessments
      await page.click('[data-testid=rapid-assessments-nav]')
      await page.waitForURL('/rapid-assessments')

      // Start new health assessment
      await page.click('[data-testid=new-assessment-button]')
      await page.selectOption('[data-testid=assessment-type-select]', 'HEALTH')
      await page.click('[data-testid=continue-button]')

      // Wait for form to load
      await page.waitForSelector('[data-testid=health-assessment-form]')

      // Fill entity selection
      await page.selectOption('[data-testid=entity-select]', 'entity-1')

      // Healthcare Facilities Assessment
      await page.check('[data-testid=has-functional-clinic]')
      await page.uncheck('[data-testid=has-emergency-services]') // Creates gap
      await page.fill('[data-testid=number-health-facilities]', '2')
      await page.fill('[data-testid=qualified-health-workers]', '5')
      await page.selectOption('[data-testid=health-facility-type]', 'Primary Health Center')

      // Services and Supplies
      await page.check('[data-testid=has-trained-staff]')
      await page.uncheck('[data-testid=has-medicine-supply]') // Creates gap
      await page.check('[data-testid=has-medical-supplies]')
      await page.uncheck('[data-testid=has-maternal-child-services]') // Creates gap

      // Common Health Issues
      await page.check('[data-testid=health-issue-diarrhea]')
      await page.check('[data-testid=health-issue-malaria]')

      // GPS Location
      await page.click('[data-testid=capture-gps-button]')
      await page.waitForSelector('[data-testid=gps-captured-indicator]')

      // Media Attachments
      await page.setInputFiles('[data-testid=photo-upload]', 'test-assets/health-clinic-photo.jpg')
      await page.waitForSelector('[data-testid=photo-preview]')

      // Additional Details
      await page.fill('[data-testid=additional-details]', 'Clinic operational but needs emergency services and medicine supply')

      // Verify gap analysis
      await expect(page.locator('[data-testid=gap-summary]')).toBeVisible()
      await expect(page.locator('[data-testid=gap-count]')).toContainText('3')
      await expect(page.locator('[data-testid=gap-list]')).toContainText('Emergency Services')
      await expect(page.locator('[data-testid=gap-list]')).toContainText('Medicine Supply')
      await expect(page.locator('[data-testid=gap-list]')).toContainText('Maternal & Child Services')

      // Submit assessment
      await page.click('[data-testid=submit-assessment-button]')
      
      // Verify success
      await expect(page.locator('[data-testid=success-message]')).toBeVisible()
      await expect(page.locator('[data-testid=assessment-id]')).toBeVisible()
      
      // Verify in assessment list
      await page.goto('/rapid-assessments')
      await expect(page.locator('[data-testid=assessment-row-health-1]')).toBeVisible()
      await expect(page.locator('[data-testid=gap-indicator]')).toContainText('3')
    })

    test('should show real-time gap feedback during form completion', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=HEALTH')
      await page.waitForSelector('[data-testid=health-assessment-form]')

      // Initially should show gaps for unchecked fields
      await expect(page.locator('[data-testid=gap-summary]')).not.toBeVisible()

      // Check first field - should reduce gap count
      await page.check('[data-testid=has-functional-clinic]')
      await expect(page.locator('[data-testid=gap-indicator-has-functional-clinic]')).not.toBeVisible()

      // Uncheck field - should show gap indicator
      await page.uncheck('[data-testid=has-emergency-services]')
      await expect(page.locator('[data-testid=gap-indicator-has-emergency-services]')).toBeVisible()
      await expect(page.locator('[data-testid=gap-badge-has-emergency-services]')).toContainText('Gap')

      // Fill numeric field - should not affect gaps
      await page.fill('[data-testid=number-health-facilities]', '3')
      await expect(page.locator('[data-testid=gap-summary]')).not.toBeVisible()

      // Complete multiple gap fields
      await page.check('[data-testid=has-trained-staff]')
      await page.check('[data-testid=has-medicine-supply]')
      await page.check('[data-testid=has-medical-supplies]')
      await page.check('[data-testid=has-maternal-child-services]')

      // Should now show minimal gaps
      await expect(page.locator('[data-testid=gap-summary]')).not.toBeVisible()
    })
  })

  test.describe('Food Assessment Workflow', () => {
    test('should complete food assessment with security calculations', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=FOOD')
      await page.waitForSelector('[data-testid=food-assessment-form]')

      // Entity selection
      await page.selectOption('[data-testid=entity-select]', 'entity-2')

      // Food Availability & Access
      await page.uncheck('[data-testid=is-food-sufficient]') // Creates gap
      await page.check('[data-testid=has-regular-meal-access]')
      await page.uncheck('[data-testid=has-infant-nutrition]') // Creates critical gap

      // Food Sources
      await page.check('[data-testid=food-source-government]')
      await page.check('[data-testid=food-source-humanitarian]')

      // Food Supply Duration
      await page.fill('[data-testid=available-food-duration-days]', '5') // Critical level
      
      // Should show critical warning
      await expect(page.locator('[data-testid=critical-food-shortage-alert]')).toBeVisible()
      await expect(page.locator('[data-testid=critical-food-shortage-alert]')).toContainText('Only 5 days of food available')

      // Additional requirements
      await page.fill('[data-testid=additional-food-required-persons]', '100')
      await page.fill('[data-testid=additional-food-required-households]', '25')

      // Verify food security indicators
      await expect(page.locator('[data-testid=food-security-gaps]')).toBeVisible()
      await expect(page.locator('[data-testid=urgent-need-indicator]')).toBeVisible()

      // GPS and Media
      await page.click('[data-testid=capture-gps-button]')
      await page.setInputFiles('[data-testid=photo-upload]', 'test-assets/food-distribution.jpg')

      // Submit
      await page.click('[data-testid=submit-assessment-button]')
      await expect(page.locator('[data-testid=success-message]')).toBeVisible()

      // Verify in dashboard
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid=food-assessment-card]')).toBeVisible()
      await expect(page.locator('[data-testid=urgent-food-indicator]')).toBeVisible()
    })

    test('should calculate food security severity correctly', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=FOOD')
      await page.selectOption('[data-testid=entity-select]', 'entity-1')

      // Test critical level (< 7 days)
      await page.fill('[data-testid=available-food-duration-days]', '3')
      await expect(page.locator('[data-testid=food-severity-critical]')).toBeVisible()

      // Test limited level (7-30 days)
      await page.fill('[data-testid=available-food-duration-days]', '15')
      await expect(page.locator('[data-testid=food-severity-limited]')).toBeVisible()
      await expect(page.locator('[data-testid=food-severity-critical]')).not.toBeVisible()

      // Test sufficient level (> 30 days)
      await page.fill('[data-testid=available-food-duration-days]', '45')
      await expect(page.locator('[data-testid=food-severity-sufficient]')).toBeVisible()
      await expect(page.locator('[data-testid=food-severity-limited]')).not.toBeVisible()
    })
  })

  test.describe('Multi-Assessment Type Workflow', () => {
    test('should create assessments for all six types', async ({ page }) => {
      const assessmentTypes = [
        { type: 'HEALTH', entity: 'entity-1', testName: 'health-assessment-complete' },
        { type: 'POPULATION', entity: 'entity-2', testName: 'population-assessment-complete' },
        { type: 'FOOD', entity: 'entity-3', testName: 'food-assessment-complete' },
        { type: 'WASH', entity: 'entity-4', testName: 'wash-assessment-complete' },
        { type: 'SHELTER', entity: 'entity-5', testName: 'shelter-assessment-complete' },
        { type: 'SECURITY', entity: 'entity-6', testName: 'security-assessment-complete' }
      ]

      for (const assessment of assessmentTypes) {
        await page.goto(`/rapid-assessments/new?type=${assessment.type}`)
        await page.waitForSelector(`[data-testid=${assessment.type.toLowerCase()}-assessment-form]`)

        // Entity selection
        await page.selectOption('[data-testid=entity-select]', assessment.entity)

        // Fill minimal required fields based on assessment type
        switch (assessment.type) {
          case 'HEALTH':
            await page.check('[data-testid=has-functional-clinic]')
            await page.fill('[data-testid=number-health-facilities]', '1')
            await page.fill('[data-testid=qualified-health-workers]', '2')
            await page.selectOption('[data-testid=health-facility-type]', 'Clinic')
            break

          case 'POPULATION':
            await page.fill('[data-testid=total-households]', '10')
            await page.fill('[data-testid=total-population]', '50')
            await page.fill('[data-testid=population-male]', '25')
            await page.fill('[data-testid=population-female]', '25')
            break

          case 'FOOD':
            await page.check('[data-testid=is-food-sufficient]')
            await page.check('[data-testid=has-regular-meal-access]')
            await page.check('[data-testid=has-infant-nutrition]')
            break

          case 'WASH':
            await page.check('[data-testid=is-water-sufficient]')
            await page.check('[data-testid=has-clean-water-access]')
            await page.fill('[data-testid=functional-latrines-available]', '2')
            await page.check('[data-testid=are-latrines-sufficient]')
            break

          case 'SHELTER':
            await page.check('[data-testid=are-shelters-sufficient]')
            await page.check('[data-testid=has-safe-structures]')
            await page.check('[data-testid=provide-weather-protection]')
            break

          case 'SECURITY':
            await page.check('[data-testid=is-safe-from-violence]')
            await page.check('[data-testid=has-security-presence]')
            await page.check('[data-testid=has-lighting]')
            break
        }

        // GPS capture
        await page.click('[data-testid=capture-gps-button]')
        await page.waitForSelector('[data-testid=gps-captured-indicator]')

        // Submit assessment
        await page.click('[data-testid=submit-assessment-button]')
        await expect(page.locator('[data-testid=success-message]')).toBeVisible()

        // Verify it appears in assessment list
        await page.goto('/rapid-assessments')
        await expect(page.locator(`[data-testid=assessment-row-${assessment.type.toLowerCase()}-1]`)).toBeVisible()
      }

      // Verify all assessments are listed
      await page.goto('/rapid-assessments')
      for (const assessment of assessmentTypes) {
        await expect(page.locator(`[data-testid=assessment-type-${assessment.type.toLowerCase()}]`)).toBeVisible()
      }

      // Verify assessment statistics
      await expect(page.locator('[data-testid=total-assessments-count]')).toContainText('6')
      await expect(page.locator('[data-testid=health-assessments-count]')).toContainText('1')
      await expect(page.locator('[data-testid=food-assessments-count]')).toContainText('1')
    })
  })

  test.describe('Assessment Management Workflow', () => {
    test('should view, edit, and submit existing assessment', async ({ page }) => {
      // Create initial assessment
      await page.goto('/rapid-assessments/new?type=HEALTH')
      await page.selectOption('[data-testid=entity-select]', 'entity-1')
      await page.check('[data-testid=has-functional-clinic]')
      await page.uncheck('[data-testid=has-emergency-services]')
      await page.fill('[data-testid=number-health-facilities]', '1')
      await page.click('[data-testid=save-draft-button]')

      // Navigate to assessment list
      await page.goto('/rapid-assessments')
      await page.click('[data-testid=assessment-row-health-1]')

      // Verify assessment details
      await expect(page.locator('[data-testid=assessment-detail]')).toBeVisible()
      await expect(page.locator('[data-testid=assessment-status]')).toContainText('DRAFT')

      // Edit assessment
      await page.click('[data-testid=edit-assessment-button]')
      
      // Update fields
      await page.check('[data-testid=has-emergency-services]') // Fix gap
      await page.fill('[data-testid=number-health-facilities]', '3')
      await page.fill('[data-testid=additional-details]', 'Updated assessment with emergency services')

      // Save changes
      await page.click('[data-testid=save-changes-button]')
      await expect(page.locator('[data-testid=save-success-message]')).toBeVisible()

      // Submit assessment
      await page.click('[data-testid=submit-assessment-button]')
      await page.click('[data-testid=confirm-submit-button]')
      
      // Verify status change
      await expect(page.locator('[data-testid=assessment-status]')).toContainText('SUBMITTED')
      await expect(page.locator('[data-testid=submission-timestamp]')).toBeVisible()

      // Verify in dashboard
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid=submitted-assessments]')).toContainText('1')
    })

    test('should delete assessment with confirmation', async ({ page }) => {
      // Create assessment
      await page.goto('/rapid-assessments/new?type=WASH')
      await page.selectOption('[data-testid=entity-select]', 'entity-1')
      await page.check('[data-testid=is-water-sufficient]')
      await page.click('[data-testid=save-draft-button]')

      // Go to assessment list
      await page.goto('/rapid-assessments')
      
      // Delete assessment
      await page.click('[data-testid=assessment-row-wash-1]')
      await page.click('[data-testid=delete-assessment-button]')
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid=delete-confirmation-dialog]')).toBeVisible()
      await expect(page.locator('[data-testid=delete-confirmation-message]')).toContainText('Are you sure you want to delete this assessment?')

      // Confirm deletion
      await page.click('[data-testid=confirm-delete-button]')
      
      // Verify assessment is deleted
      await expect(page.locator('[data-testid=delete-success-message]')).toBeVisible()
      await expect(page.locator('[data-testid=assessment-row-wash-1]')).not.toBeVisible()
    })
  })

  test.describe('Offline Workflow', () => {
    test('should handle offline assessment creation', async ({ page, context }) => {
      // Simulate offline mode
      await context.setOffline(true)

      await page.goto('/rapid-assessments/new?type=HEALTH')
      await page.waitForSelector('[data-testid=offline-indicator]')

      // Fill assessment form
      await page.selectOption('[data-testid=entity-select]', 'entity-1')
      await page.check('[data-testid=has-functional-clinic]')
      await page.fill('[data-testid=number-health-facilities]', '2')

      // Should show offline mode
      await expect(page.locator('[data-testid=offline-status]')).toContainText('Offline')
      await expect(page.locator('[data-testid=sync-pending-indicator]')).toBeVisible()

      // Submit assessment (should be queued)
      await page.click('[data-testid=submit-assessment-button]')
      await expect(page.locator('[data-testid=offline-queued-message]')).toBeVisible()
      await expect(page.locator('[data-testid=sync-queue-count]')).toContainText('1')

      // Go back online
      await context.setOffline(false)
      await page.reload()

      // Should sync automatically
      await expect(page.locator('[data-testid=sync-success-message]')).toBeVisible()
      await expect(page.locator('[data-testid=sync-queue-count]')).toContainText('0')
    })

    test('should handle sync conflicts', async ({ page, context }) => {
      // Create assessment offline
      await context.setOffline(true)
      await page.goto('/rapid-assessments/new?type=HEALTH')
      await page.selectOption('[data-testid=entity-select]', 'entity-1')
      await page.check('[data-testid=has-functional-clinic]')
      await page.fill('[data-testid=number-health-facilities]', '2')
      await page.click('[data-testid=submit-assessment-button]')

      // Go back online with simulated conflict
      await context.setOffline(false)
      
      // Mock conflict scenario (in real implementation, this would be handled by backend)
      await page.goto('/rapid-assessments')
      
      // Should show conflict resolution dialog
      await expect(page.locator('[data-testid=sync-conflict-dialog]')).toBeVisible()
      await expect(page.locator('[data-testid=conflict-resolution-options]')).toBeVisible()

      // Choose to keep local changes
      await page.click('[data-testid=keep-local-changes-button]')
      await expect(page.locator('[data-testid=conflict-resolved-message]')).toBeVisible()
    })
  })

  test.describe('GPS and Media Integration', () => {
    test('should capture GPS coordinates manually', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=HEALTH')
      
      // Mock GPS location
      await page.route('**/geolocation**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            latitude: 1.2345,
            longitude: 6.7890,
            accuracy: 10
          })
        })
      })

      await page.click('[data-testid=capture-gps-button]')
      await expect(page.locator('[data-testid=gps-coordinates]')).toContainText('1.2345, 6.7890')
      await expect(page.locator('[data-testid=gps-accuracy]')).toContainText('10m')
    })

    test('should allow manual GPS entry when automatic fails', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=HEALTH')
      
      // Mock GPS failure
      await page.route('**/geolocation**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'GPS unavailable' })
        })
      })

      await page.click('[data-testid=capture-gps-button]')
      
      // Should show manual entry option
      await expect(page.locator('[data-testid=manual-gps-entry]')).toBeVisible()
      
      // Enter manual coordinates
      await page.fill('[data-testid=manual-latitude]', '1.2345')
      await page.fill('[data-testid=manual-longitude]', '6.7890')
      await page.click('[data-testid=save-manual-coordinates]')
      
      await expect(page.locator('[data-testid=gps-coordinates]')).toContainText('1.2345, 6.7890')
    })

    test('should handle multiple photo uploads', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=FOOD')
      
      // Upload multiple photos
      await page.setInputFiles('[data-testid=photo-upload]', [
        'test-assets/food-distribution-1.jpg',
        'test-assets/food-distribution-2.jpg',
        'test-assets/food-distribution-3.jpg'
      ])

      // Should show all photos
      await expect(page.locator('[data-testid=photo-preview-1]')).toBeVisible()
      await expect(page.locator('[data-testid=photo-preview-2]')).toBeVisible()
      await expect(page.locator('[data-testid=photo-preview-3]')).toBeVisible()
      await expect(page.locator('[data-testid=photo-count]')).toContainText('3/5')

      // Remove a photo
      await page.click('[data-testid=remove-photo-2]')
      await expect(page.locator('[data-testid=photo-preview-2]')).not.toBeVisible()
      await expect(page.locator('[data-testid=photo-count]')).toContainText('2/5')
    })
  })

  test.describe('Accessibility Testing', () => {
    test('should be navigable via keyboard', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=HEALTH')
      
      // Tab through form
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
      
      // Navigate through all form elements
      const formElements = [
        '[data-testid=entity-select]',
        '[data-testid=has-functional-clinic]',
        '[data-testid=has-emergency-services]',
        '[data-testid=number-health-facilities]',
        '[data-testid=qualified-health-workers]',
        '[data-testid=health-facility-type]',
        '[data-testid=additional-details]',
        '[data-testid=submit-assessment-button]'
      ]

      for (const element of formElements) {
        await page.keyboard.press('Tab')
        await expect(page.locator(element)).toBeFocused()
      }
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=HEALTH')
      
      // Check for proper ARIA attributes
      await expect(page.locator('[role=form]')).toBeVisible()
      await expect(page.locator('[aria-label="Functional Clinic"]')).toBeVisible()
      await expect(page.locator('[aria-describedby]')).toHaveCount.being.greaterThan(0)
      
      // Check for proper heading hierarchy
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('h2')).toHaveCount.being.greaterThan(0)
    })

    test('should support screen readers', async ({ page }) => {
      await page.goto('/rapid-assessments/new?type=HEALTH')
      
      // Check for semantic HTML
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('form')).toBeVisible()
      await expect(page.locator('label')).toHaveCount.being.greaterThan(0)
      
      // Check for alt text on images (when photos are uploaded)
      await page.setInputFiles('[data-testid=photo-upload]', 'test-assets/test-photo.jpg')
      await expect(page.locator('[alt="Uploaded photo"]')).toBeVisible()
    })
  })

  test.describe('Performance Testing', () => {
    test('should load assessment form quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/rapid-assessments/new?type=HEALTH')
      await page.waitForSelector('[data-testid=health-assessment-form]')
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Should load in under 3 seconds
    })

    test('should handle large assessment lists efficiently', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/v1/rapid-assessments**', (route) => {
        const assessments = Array.from({ length: 100 }, (_, i) => ({
          id: `assessment-${i}`,
          rapidAssessmentType: 'HEALTH',
          status: 'DRAFT',
          priority: 'MEDIUM',
          entity: { name: `Entity ${i}` },
          createdAt: new Date().toISOString()
        }))
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: assessments,
            pagination: { page: 1, limit: 100, total: 100, totalPages: 1 }
          })
        })
      })

      const startTime = Date.now()
      await page.goto('/rapid-assessments')
      await page.waitForSelector('[data-testid=assessment-table]')
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load in under 5 seconds
    })
  })
})