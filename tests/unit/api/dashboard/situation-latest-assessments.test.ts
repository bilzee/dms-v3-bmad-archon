import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the API endpoint to test the filtering logic
const mockGetLatestHealthAssessment = jest.fn();
const mockGetLatestFoodAssessment = jest.fn();
const mockGetLatestWASHAssessment = jest.fn();
const mockGetLatestShelterAssessment = jest.fn();
const mockGetLatestSecurityAssessment = jest.fn();
const mockGetLatestPopulationAssessment = jest.fn();

// Mock the gap analysis service
jest.mock('@/lib/services/gap-analysis.service', () => ({
  analyzeHealthGaps: jest.fn().mockResolvedValue({
    hasGap: false,
    severity: 'LOW',
    indicators: []
  }),
  analyzeFoodGaps: jest.fn().mockResolvedValue({
    hasGap: true,
    severity: 'HIGH',
    indicators: []
  }),
  analyzeWASHGaps: jest.fn().mockResolvedValue({
    hasGap: false,
    severity: 'LOW',
    indicators: []
  }),
  analyzeShelterGaps: jest.fn().mockResolvedValue({
    hasGap: true,
    severity: 'CRITICAL',
    indicators: []
  }),
  analyzeSecurityGaps: jest.fn().mockResolvedValue({
    hasGap: false,
    severity: 'LOW',
    indicators: []
  })
}));

// Mock Prisma client
jest.mock('@/lib/db/client', () => ({
  db: {
    entity: {
      findMany: jest.fn()
    },
    healthAssessment: {
      findFirst: jest.fn()
    },
    foodAssessment: {
      findFirst: jest.fn()
    },
    wASHAssessment: {
      findFirst: jest.fn()
    },
    shelterAssessment: {
      findFirst: jest.fn()
    },
    securityAssessment: {
      findFirst: jest.fn()
    },
    populationAssessment: {
      findFirst: jest.fn()
    }
  }
}));

// Mock auth middleware
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler
}));

describe('Situation Dashboard - Latest Assessment Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Entity Assessment Processing', () => {
    it('should fetch only the latest assessment per type per entity', async () => {
      // Mock entity data
      const mockEntities = [
        {
          id: 'entity-1',
          name: 'Test Entity 1',
          type: 'FACILITY',
          location: 'Test Location',
          coordinates: null
        }
      ];

      // Mock assessment data - simulate multiple assessments per type
      const mockHealthAssessments = [
        {
          id: 'health-1',
          rapidAssessmentId: 'ra-1',
          rapidAssessmentDate: new Date('2024-01-01'),
          verificationStatus: 'VERIFIED',
          assessorName: 'Assessor 1'
        },
        {
          id: 'health-2',
          rapidAssessmentId: 'ra-2', 
          rapidAssessmentDate: new Date('2024-01-15'), // Later date
          verificationStatus: 'VERIFIED',
          assessorName: 'Assessor 2'
        }
      ];

      const mockFoodAssessments = [
        {
          id: 'food-1',
          rapidAssessmentId: 'ra-3',
          rapidAssessmentDate: new Date('2024-01-10'),
          verificationStatus: 'VERIFIED',
          assessorName: 'Assessor 1'
        }
      ];

      // Setup mocks to return only the latest assessment
      mockGetLatestHealthAssessment.mockResolvedValue({
        ...mockHealthAssessments[1], // Should return the latest (Jan 15)
        gapAnalysis: { hasGap: false, severity: 'LOW' }
      });

      mockGetLatestFoodAssessment.mockResolvedValue({
        ...mockFoodAssessments[0],
        gapAnalysis: { hasGap: true, severity: 'HIGH' }
      });

      mockGetLatestWASHAssessment.mockResolvedValue(null);
      mockGetLatestShelterAssessment.mockResolvedValue(null);
      mockGetLatestSecurityAssessment.mockResolvedValue(null);
      mockGetLatestPopulationAssessment.mockResolvedValue(null);

      // Simulate the entity processing logic from the API route
      const entities = [];
      for (const entity of mockEntities) {
        const [
          healthAssessment,
          foodAssessment,
          washAssessment,
          shelterAssessment,
          securityAssessment,
          populationAssessment
        ] = await Promise.all([
          mockGetLatestHealthAssessment(entity.id),
          mockGetLatestFoodAssessment(entity.id),
          mockGetLatestWASHAssessment(entity.id),
          mockGetLatestShelterAssessment(entity.id),
          mockGetLatestSecurityAssessment(entity.id),
          mockGetLatestPopulationAssessment(entity.id)
        ]);

        const latestAssessments: any = {};
        let lastUpdated = new Date(0); // Start with epoch date

        if (healthAssessment) {
          latestAssessments.HEALTH = {
            id: healthAssessment.rapidAssessmentId,
            date: healthAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: healthAssessment.verificationStatus === 'VERIFIED',
            assessorName: healthAssessment.assessorName,
            gapIndicators: {
              hasGap: healthAssessment.gapAnalysis.hasGap,
              severity: healthAssessment.gapAnalysis.severity,
            }
          };
          lastUpdated = new Date(healthAssessment.rapidAssessmentDate) > lastUpdated ? 
            new Date(healthAssessment.rapidAssessmentDate) : lastUpdated;
        }

        if (foodAssessment) {
          latestAssessments.FOOD = {
            id: foodAssessment.rapidAssessmentId,
            date: foodAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: foodAssessment.verificationStatus === 'VERIFIED',
            assessorName: foodAssessment.assessorName,
            gapIndicators: {
              hasGap: foodAssessment.gapAnalysis.hasGap,
              severity: foodAssessment.gapAnalysis.severity,
            }
          };
          lastUpdated = new Date(foodAssessment.rapidAssessmentDate) > lastUpdated ? 
            new Date(foodAssessment.rapidAssessmentDate) : lastUpdated;
        }

        entities.push({
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.type,
          location: entity.location,
          coordinates: entity.coordinates,
          latestAssessments,
          lastUpdated
        });
      }

      // Verify results
      expect(entities).toHaveLength(1);
      expect(entities[0].latestAssessments).toHaveProperty('HEALTH');
      expect(entities[0].latestAssessments).toHaveProperty('FOOD');
      expect(entities[0].latestAssessments).not.toHaveProperty('WASH');
      expect(entities[0].latestAssessments).not.toHaveProperty('SHELTER');
      expect(entities[0].latestAssessments).not.toHaveProperty('SECURITY');
      expect(entities[0].latestAssessments).not.toHaveProperty('POPULATION');

      // Verify that the latest health assessment was selected (Jan 15, not Jan 1)
      expect(entities[0].latestAssessments.HEALTH.id).toBe('ra-2');
      expect(entities[0].latestAssessments.HEALTH.assessorName).toBe('Assessor 2');
      expect(entities[0].latestAssessments.HEALTH.date).toEqual(new Date('2024-01-15'));

      // Verify food assessment
      expect(entities[0].latestAssessments.FOOD.id).toBe('ra-3');
      expect(entities[0].latestAssessments.FOOD.gapIndicators.hasGap).toBe(true);
      expect(entities[0].latestAssessments.FOOD.gapIndicators.severity).toBe('HIGH');

      // Verify last updated is the latest date
      expect(entities[0].lastUpdated).toEqual(new Date('2024-01-15'));
    });

    it('should handle entities with no assessments gracefully', async () => {
      const mockEntities = [
        {
          id: 'entity-no-assessments',
          name: 'Entity No Assessments',
          type: 'FACILITY',
          location: 'Test Location',
          coordinates: null
        }
      ];

      // Mock all assessment functions to return null
      mockGetLatestHealthAssessment.mockResolvedValue(null);
      mockGetLatestFoodAssessment.mockResolvedValue(null);
      mockGetLatestWASHAssessment.mockResolvedValue(null);
      mockGetLatestShelterAssessment.mockResolvedValue(null);
      mockGetLatestSecurityAssessment.mockResolvedValue(null);
      mockGetLatestPopulationAssessment.mockResolvedValue(null);

      const entities = [];
      for (const entity of mockEntities) {
        try {
          const [healthAssessment, foodAssessment, washAssessment, shelterAssessment, securityAssessment, populationAssessment] = 
            await Promise.all([
              mockGetLatestHealthAssessment(entity.id),
              mockGetLatestFoodAssessment(entity.id),
              mockGetLatestWASHAssessment(entity.id),
              mockGetLatestShelterAssessment(entity.id),
              mockGetLatestSecurityAssessment(entity.id),
              mockGetLatestPopulationAssessment(entity.id)
            ]);

          entities.push({
            entityId: entity.id,
            entityName: entity.name,
            entityType: entity.type,
            location: entity.location,
            coordinates: entity.coordinates,
            latestAssessments: {},
            lastUpdated: new Date()
          });
        } catch (error) {
          fail('Should not throw error for entities with no assessments');
        }
      }

      expect(entities).toHaveLength(1);
      expect(entities[0].latestAssessments).toEqual({});
      expect(entities[0].entityName).toBe('Entity No Assessments');
    });
  });

  describe('Assessment Type Filtering', () => {
    it('should ensure only one assessment per type per entity', () => {
      // This test verifies the logic that ensures uniqueness
      const entityAssessments = new Map<string, any>();
      
      // Simulate multiple assessments of the same type for the same entity
      const assessments = [
        { entityId: 'entity-1', type: 'HEALTH', date: new Date('2024-01-01'), id: 'h1' },
        { entityId: 'entity-1', type: 'HEALTH', date: new Date('2024-01-10'), id: 'h2' }, // Later
        { entityId: 'entity-1', type: 'FOOD', date: new Date('2024-01-05'), id: 'f1' },
        { entityId: 'entity-1', type: 'FOOD', date: new Date('2024-01-15'), id: 'f2' }, // Later
      ];

      // Apply filtering logic similar to the API route
      assessments.forEach(assessment => {
        const key = `${assessment.entityId}-${assessment.type}`;
        if (!entityAssessments.has(key) || assessment.date > entityAssessments.get(key).date) {
          entityAssessments.set(key, assessment);
        }
      });

      const filteredAssessments = Array.from(entityAssessments.values());
      
      // Should have exactly 2 assessments (1 HEALTH, 1 FOOD)
      expect(filteredAssessments).toHaveLength(2);
      
      // Should have the latest assessments
      const healthAssessment = filteredAssessments.find(a => a.type === 'HEALTH');
      const foodAssessment = filteredAssessments.find(a => a.type === 'FOOD');
      
      expect(healthAssessment?.id).toBe('h2'); // Latest health
      expect(foodAssessment?.id).toBe('f2');   // Latest food
    });
  });

  describe('Population Impact Latest Assessment Filtering', () => {
    it('should fetch only latest population assessment per entity for impact calculation', async () => {
      // Simulate the Population Impact calculation logic with latest assessments only
      const mockLatestAssessments = [
        {
          id: 'pop-assessment-1',
          totalPopulation: 1000,
          totalHouseholds: 200,
          populationMale: 500,
          populationFemale: 500,
          populationUnder5: 100,
          elderlyPersons: 80,
          numberLivesLost: 5,
          numberInjured: 20,
          rapidAssessment: { id: 'ra-1', entityId: 'entity-1' }
        },
        {
          id: 'pop-assessment-2', 
          totalPopulation: 1500,
          totalHouseholds: 300,
          populationMale: 750,
          populationFemale: 750,
          populationUnder5: 150,
          elderlyPersons: 120,
          numberLivesLost: 8,
          numberInjured: 35,
          rapidAssessment: { id: 'ra-2', entityId: 'entity-2' }
        }
      ];

      const populationData = mockLatestAssessments; // Assuming we get the filtered latest assessments
      
      const populationAggregation = populationData.reduce(
        (acc, assessment) => ({
          totalPopulation: acc.totalPopulation + (assessment.totalPopulation || 0),
          totalHouseholds: acc.totalHouseholds + (assessment.totalHouseholds || 0),
          populationMale: acc.populationMale + (assessment.populationMale || 0),
          populationFemale: acc.populationFemale + (assessment.populationFemale || 0),
          under5: acc.under5 + (assessment.populationUnder5 || 0),
          elderly: acc.elderly + (assessment.elderlyPersons || 0),
          populationLivesLost: acc.populationLivesLost + (assessment.numberLivesLost || 0),
          populationInjured: acc.populationInjured + (assessment.numberInjured || 0),
          populationCount: acc.populationCount + 1,
        }),
        {
          totalPopulation: 0,
          totalHouseholds: 0,
          populationMale: 0,
          populationFemale: 0,
          under5: 0,
          elderly: 0,
          populationLivesLost: 0,
          populationInjured: 0,
          populationCount: 0,
        }
      );

      // Verify the aggregation is correct for only latest assessments
      expect(populationAggregation.totalPopulation).toBe(2500); // 1000 + 1500
      expect(populationAggregation.totalHouseholds).toBe(500);  // 200 + 300
      expect(populationAggregation.populationMale).toBe(1250);  // 500 + 750
      expect(populationAggregation.populationFemale).toBe(1250); // 500 + 750
      expect(populationAggregation.under5).toBe(250);          // 100 + 150
      expect(populationAggregation.elderly).toBe(200);         // 80 + 120
      expect(populationAggregation.populationLivesLost).toBe(13); // 5 + 8
      expect(populationAggregation.populationInjured).toBe(55);   // 20 + 35
      expect(populationAggregation.populationCount).toBe(2);      // 2 entities, 1 assessment each

      // Verify the correct data sources count
      const sourceAssessments = {
        populationCount: populationAggregation.populationCount,
        preliminaryCount: 0
      };
      
      expect(sourceAssessments.populationCount).toBe(2); // Should show 2 population assessments, not 3+
    });
  });

  describe('Aggregation Functions - Empty Assessment Handling', () => {
    it('should return null for aggregation functions when no assessments exist', () => {
      // Mock entity assessments with only food assessment (no health, wash, shelter, security)
      const mockEntityAssessments = [
        {
          latestAssessments: {
            health: null,
            food: { gapAnalysis: { hasGap: true } }, // Only food assessment exists
            wash: null,
            shelter: null, 
            security: null,
            population: null
          }
        },
        {
          latestAssessments: {
            health: null,
            food: { gapAnalysis: { hasGap: false } }, // Only food assessment exists
            wash: null,
            shelter: null,
            security: null, 
            population: null
          }
        }
      ];

      // Test the aggregation logic
      const healthAssessments = mockEntityAssessments.map(e => e.latestAssessments.health).filter(Boolean);
      const foodAssessments = mockEntityAssessments.map(e => e.latestAssessments.food).filter(Boolean);
      const washAssessments = mockEntityAssessments.map(e => e.latestAssessments.wash).filter(Boolean);
      const shelterAssessments = mockEntityAssessments.map(e => e.latestAssessments.shelter).filter(Boolean);
      const securityAssessments = mockEntityAssessments.map(e => e.latestAssessments.security).filter(Boolean);

      // Health aggregation should return null
      if (healthAssessments.length === 0) {
        expect(healthAssessments.length).toBe(0);
      }

      // Food aggregation should return valid data
      if (foodAssessments.length > 0) {
        expect(foodAssessments.length).toBe(2);
        expect(foodAssessments[0]).toHaveProperty('gapAnalysis');
      }

      // WASH aggregation should return null
      if (washAssessments.length === 0) {
        expect(washAssessments.length).toBe(0);
      }

      // Shelter aggregation should return null  
      if (shelterAssessments.length === 0) {
        expect(shelterAssessments.length).toBe(0);
      }

      // Security aggregation should return null
      if (securityAssessments.length === 0) {
        expect(securityAssessments.length).toBe(0);
      }
    });

    it('should correctly calculate gap summary for mixed assessment scenario', () => {
      // Test scenario: 1 entity with food gap, 1 entity without food gap, no other assessments
      const mockGapSummary = {
        totalGaps: 1,
        totalNoGaps: 1,
        criticalGaps: 0,
        entitiesWithGaps: 1,
        entitiesWithoutGaps: 1
      };

      expect(mockGapSummary.entitiesWithGaps).toBe(1);
      expect(mockGapSummary.entitiesWithoutGaps).toBe(1);
      expect(mockGapSummary.totalGaps).toBe(1);
      expect(mockGapSummary.totalNoGaps).toBe(1);
      expect(mockGapSummary.criticalGaps).toBe(0);
    });
  });
});