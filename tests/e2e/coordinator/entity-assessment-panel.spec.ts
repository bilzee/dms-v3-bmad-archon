import { test, expect } from '@playwright/test';

test.describe('Coordinator - Entity Assessment Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'coordinator@test.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    // Wait for dashboard navigation
    await page.waitForURL('**/coordinator/dashboard');
    await expect(page.locator('[data-testid=coordinator-dashboard]')).toBeVisible();
  });

  test('displays entity assessment panel with default view', async ({ page }) => {
    // Navigate to situation dashboard
    await page.goto('/coordinator/situation-dashboard');
    
    // Wait for page to load
    await expect(page.locator('[data-testid=situation-dashboard]')).toBeVisible();
    
    // Check if Entity Assessment Panel is present
    await expect(page.locator('[data-testid=entity-assessment-panel]')).toBeVisible();
    
    // Verify panel title
    await expect(page.locator('h1:has-text("Entity Assessment Panel")')).toBeVisible();
    
    // Check for entity selector
    await expect(page.locator('[data-testid=entity-selector]')).toBeVisible();
    await expect(page.locator('text=Entity Selection')).toBeVisible();
  });

  test('shows "Select an incident first" message when no incident selected', async ({ page }) => {
    // Navigate to situation dashboard without selecting incident
    await page.goto('/coordinator/situation-dashboard');
    
    // Should show message to select incident
    await expect(page.locator('text=Select an incident first')).toBeVisible();
    await expect(page.locator('text=Choose an incident from the left panel to view entity assessments')).toBeVisible();
  });

  test('loads and displays entities when incident is selected', async ({ page }) => {
    // Mock the API responses
    await page.route('/api/v1/dashboard/situation?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            entityAssessments: [
              {
                id: 'entity-1',
                name: 'Test Health Facility',
                type: 'FACILITY',
                location: 'Test City',
                severity: 'HIGH',
                latestAssessments: {
                  health: {
                    hasFunctionalClinic: true,
                    hasEmergencyServices: false,
                    numberHealthFacilities: 1,
                    gapAnalysis: {
                      hasGap: true,
                      severity: 'HIGH',
                      gapFields: ['hasEmergencyServices']
                    }
                  },
                  food: {
                    isFoodSufficient: true,
                    hasRegularMealAccess: true,
                    gapAnalysis: {
                      hasGap: false,
                      severity: 'LOW',
                      gapFields: []
                    }
                  },
                  population: {
                    totalPopulation: 1000,
                    totalHouseholds: 200
                  }
                },
                gapSummary: {
                  totalGaps: 1,
                  totalNoGaps: 1,
                  criticalGaps: 0
                }
              },
              {
                id: 'entity-2',
                name: 'Test Community',
                type: 'COMMUNITY',
                location: 'Test Village',
                severity: 'MEDIUM',
                latestAssessments: {
                  wash: {
                    isWaterSufficient: false,
                    hasCleanWaterAccess: false,
                    functionalLatrinesAvailable: 0,
                    gapAnalysis: {
                      hasGap: true,
                      severity: 'CRITICAL',
                      gapFields: ['isWaterSufficient', 'hasCleanWaterAccess']
                    }
                  },
                  shelter: {
                    areSheltersSufficient: true,
                    hasSafeStructures: true,
                    gapAnalysis: {
                      hasGap: false,
                      severity: 'LOW',
                      gapFields: []
                    }
                  },
                  population: {
                    totalPopulation: 500,
                    totalHouseholds: 100
                  }
                },
                gapSummary: {
                  totalGaps: 1,
                  totalNoGaps: 1,
                  criticalGaps: 1
                }
              }
            ]
          }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection by updating the state
    await page.evaluate(() => {
      // Dispatch event to simulate incident selection
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Wait for entities to load
    await expect(page.locator('[data-testid=entity-assessment-panel]')).toBeVisible();
    
    // Check if entities are displayed
    await expect(page.locator('text=Test Health Facility')).toBeVisible();
    await expect(page.locator('text=Test Community')).toBeVisible();
    
    // Verify assessment categories are shown
    await expect(page.locator('text=Health Assessment')).toBeVisible();
    await expect(page.locator('text=Food Security')).toBeVisible();
    await expect(page.locator('text=WASH (Water & Sanitation)')).toBeVisible();
    await expect(page.locator('text=Shelter & Housing')).toBeVisible();
  });

  test('displays "All Entities" aggregated view correctly', async ({ page }) => {
    // Mock aggregated data response
    await page.route('/api/v1/dashboard/situation?incidentId=test-incident-1&entityId=all', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            aggregatedAssessments: {
              gapSummary: {
                totalGaps: 15,
                criticalGaps: 3,
                entitiesWithGaps: 8,
                entitiesWithoutGaps: 4
              },
              population: {
                totalPopulation: 5000,
                totalHouseholds: 1000,
                totalLivesLost: 5,
                totalInjured: 25
              },
              health: {
                totalEntities: 12,
                entitiesWithGaps: 6,
                entitiesWithoutGaps: 6,
                totalHealthFacilities: 8,
                totalQualifiedWorkers: 45
              },
              food: {
                totalEntities: 12,
                entitiesWithGaps: 4,
                entitiesWithoutGaps: 8,
                averageFoodDuration: 7.5,
                totalAdditionalPersonsRequired: 120
              }
            }
          }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate selecting "All Entities"
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('entity-selected', {
        detail: { entityId: 'all' }
      }));
    });

    // Check for aggregated summary
    await expect(page.locator('text=Aggregated Assessment Summary')).toBeVisible();
    
    // Verify aggregated statistics
    await expect(page.locator('text=Entities with Gaps')).toBeVisible();
    await expect(page.locator('text=Entities without Gaps')).toBeVisible();
    await expect(page.locator('text=Critical Gaps')).toBeVisible();
    await expect(page.locator('text=Total Population')).toBeVisible();
    
    // Check specific numbers
    await expect(page.locator('text=8')).toBeVisible(); // entities with gaps
    await expect(page.locator('text=4')).toBeVisible(); // entities without gaps
    await expect(page.locator('text=3')).toBeVisible(); // critical gaps
    await expect(page.locator('text=5,000')).toBeVisible(); // total population
  });

  test('handles entity selection dropdown correctly', async ({ page }) => {
    // Mock entity data for dropdown
    await page.route('/api/v1/dashboard/situation?incidentId=test-incident-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            entityAssessments: [
              { id: 'entity-1', name: 'Health Facility A', type: 'FACILITY', severity: 'HIGH' },
              { id: 'entity-2', name: 'Community B', type: 'COMMUNITY', severity: 'MEDIUM' },
              { id: 'entity-3', name: 'Ward C', type: 'WARD', severity: 'LOW' }
            ]
          }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection to enable entity selector
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Click on entity selector dropdown
    await page.click('[data-testid=entity-selector]');
    
    // Check if dropdown opens
    await expect(page.locator('[data-testid=entity-dropdown]')).toBeVisible();
    
    // Check for "All Entities" option
    await expect(page.locator('text=All Entities')).toBeVisible();
    
    // Check for entity options
    await expect(page.locator('text=Health Facility A')).toBeVisible();
    await expect(page.locator('text=Community B')).toBeVisible();
    await expect(page.locator('text=Ward C')).toBeVisible();
    
    // Check entity type indicators
    await expect(page.locator('text=Facility')).toBeVisible();
    await expect(page.locator('text=Community')).toBeVisible();
    await expect(page.locator('text=Ward')).toBeVisible();
    
    // Check severity badges
    await expect(page.locator('text=HIGH')).toBeVisible();
    await expect(page.locator('text=MEDIUM')).toBeVisible();
    await expect(page.locator('text=LOW')).toBeVisible();
  });

  test('displays gap analysis with visual indicators', async ({ page }) => {
    // Mock assessment data with gaps
    await page.route('/api/v1/dashboard/situation?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            entityAssessments: [
              {
                id: 'entity-with-gaps',
                name: 'Entity with Critical Gaps',
                type: 'FACILITY',
                latestAssessments: {
                  health: {
                    hasFunctionalClinic: false, // Gap
                    hasEmergencyServices: false, // Gap
                    hasTrainedStaff: true,
                    hasMedicineSupply: false, // Gap
                    gapAnalysis: {
                      hasGap: true,
                      severity: 'CRITICAL',
                      gapFields: ['hasFunctionalClinic', 'hasEmergencyServices', 'hasMedicineSupply']
                    }
                  }
                },
                gapSummary: {
                  totalGaps: 3,
                  totalNoGaps: 0,
                  criticalGaps: 3
                }
              }
            ]
          }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Wait for entity assessment to load
    await expect(page.locator('text=Entity with Critical Gaps')).toBeVisible();
    
    // Check for gap indicators
    await expect(page.locator('[data-testid=gap-indicator]')).toBeVisible();
    await expect(page.locator('text=CRITICAL')).toBeVisible();
    
    // Check for gap badge on assessment category
    await expect(page.locator('[data-testid=health-assessment] [data-testid=gap-badge]')).toBeVisible();
    
    // Verify gap summary
    await expect(page.locator('text=Total Gaps')).toBeVisible();
    await expect(page.locator('text=3')).toBeVisible();
    await expect(page.locator('text=Critical')).toBeVisible();
  });

  test('shows loading states during data fetching', async ({ page }) => {
    // Slow API response to show loading state
    await page.route('/api/v1/dashboard/situation?*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { entityAssessments: [] }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Check for loading skeleton
    await expect(page.locator('[data-testid=loading-skeleton]')).toBeVisible();
    await expect(page.locator('text=Loading entities...')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid=loading-skeleton]')).not.toBeVisible();
  });

  test('handles error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/v1/dashboard/situation?*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Check for error message
    await expect(page.locator('text=Failed to load assessment data')).toBeVisible();
    await expect(page.locator('text=Internal server error')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    
    // Test retry functionality
    await page.click('button:has-text("Try Again")');
    
    // Should attempt to fetch again
    await expect(page.locator('[data-testid=loading-skeleton]')).toBeVisible();
  });

  test('refreshes data when refresh button is clicked', async ({ page }) => {
    let callCount = 0;
    
    await page.route('/api/v1/dashboard/situation?*', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { entityAssessments: [] }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Wait for initial load
    await expect(page.locator('[data-testid=entity-assessment-panel]')).toBeVisible();
    expect(callCount).toBe(1);
    
    // Click refresh button
    await page.click('[data-testid=refresh-button]');
    
    // Should trigger another API call
    await expect(callCount).toBe(2);
  });

  test('displays assessment recommendations when gaps exist', async ({ page }) => {
    // Mock assessment data with recommendations
    await page.route('/api/v1/dashboard/situation?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            entityAssessments: [
              {
                id: 'entity-1',
                name: 'Test Entity',
                type: 'FACILITY',
                latestAssessments: {
                  health: {
                    hasFunctionalClinic: false,
                    gapAnalysis: {
                      hasGap: true,
                      severity: 'HIGH',
                      gapFields: ['hasFunctionalClinic'],
                      recommendations: [
                        'Establish temporary medical clinic or mobile health unit',
                        'Deploy emergency medical response team'
                      ]
                    }
                  }
                }
              }
            ]
          }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Check for recommendations section
    await expect(page.locator('text=Recommendations')).toBeVisible();
    await expect(page.locator('text=Establish temporary medical clinic or mobile health unit')).toBeVisible();
    await expect(page.locator('text=Deploy emergency medical response team')).toBeVisible();
  });

  test('maintains responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mock data
    await page.route('/api/v1/dashboard/situation?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            entityAssessments: [
              {
                id: 'entity-1',
                name: 'Mobile Test Entity',
                type: 'FACILITY',
                latestAssessments: {
                  health: {
                    hasFunctionalClinic: true,
                    gapAnalysis: { hasGap: false, severity: 'LOW' }
                  }
                }
              }
            ]
          }
        })
      });
    });

    await page.goto('/coordinator/situation-dashboard');
    
    // Simulate incident selection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('incident-selected', {
        detail: { incidentId: 'test-incident-1' }
      }));
    });

    // Check mobile layout
    await expect(page.locator('[data-testid=entity-assessment-panel]')).toBeVisible();
    
    // Verify cards stack vertically on mobile
    const assessmentCards = page.locator('[data-testid=assessment-card]');
    await expect(assessmentCards).toHaveCount(1); // Only health assessment in mock data
    
    // Check that content is readable on mobile
    await expect(page.locator('text=Mobile Test Entity')).toBeVisible();
  });

  test('provides accessibility features', async ({ page }) => {
    await page.goto('/coordinator/situation-dashboard');
    
    // Check ARIA labels
    await expect(page.locator('[aria-label="Entity Selection"]')).toBeVisible();
    await expect(page.locator('[aria-label="Refresh data"]')).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid=entity-selector]:focus')).toBeVisible();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid=refresh-button]:focus')).toBeVisible();
    
    // Test screen reader compatibility
    const panelTitle = page.locator('h1');
    await expect(panelTitle).toHaveAttribute('role', 'heading');
    await expect(panelTitle).toHaveAttribute('aria-level', '1');
  });
});

/**
 * USAGE NOTES:
 * 
 * 1. Tests use Playwright for end-to-end browser automation
 * 2. API responses are mocked to provide consistent test data
 * 3. Tests cover the complete user workflow for entity assessment panel
 * 4. Accessibility and responsive design are validated
 * 5. Error handling and loading states are tested
 * 6. Integration with dashboard state management is verified
 * 7. Role-based access control is tested (coordinator role)
 * 8. Real user interactions are simulated (clicks, selections)
 */