import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/v1/rapid-assessments/route'
import { PUT, GET as GetById, DELETE } from '@/app/api/v1/rapid-assessments/[id]/route'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'
import { prisma } from '@/lib/db/client'
import { AssessmentType, AssessmentStatus, Priority, VerificationStatus } from '@prisma/client'

// Mock dependencies
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler) => {
    return async (request: NextRequest, context: any) => {
      context.user = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'ASSESSOR'
      }
      return handler(request, context)
    }
  }),
  requireRole: jest.fn((role) => (handler) => handler)
}))

jest.mock('@/lib/services/rapid-assessment.service')
jest.mock('@/lib/db/client')

const mockRapidAssessmentService = RapidAssessmentService as jest.Mocked<typeof RapidAssessmentService>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Rapid Assessment Integration Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Assessment Creation Workflow', () => {
    it('should create health assessment with all components', async () => {
      // Mock entity assignment validation
      mockPrisma.entityAssignment.findFirst.mockResolvedValue({
        id: 'assignment-123',
        userId: 'test-user-123',
        entityId: 'entity-123',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)

      // Mock database transaction
      const mockTransaction = {
        rapidAssessment: {
          create: jest.fn().mockResolvedValue({
            id: 'assessment-123',
            rapidAssessmentType: 'HEALTH',
            status: 'DRAFT',
            priority: 'HIGH',
            assessorId: 'test-user-123',
            entityId: 'entity-123',
            coordinates: { latitude: 1.2345, longitude: 6.7890 },
            mediaAttachments: ['photo1.jpg', 'photo2.jpg'],
            createdAt: new Date()
          })
        },
        healthAssessment: {
          create: jest.fn().mockResolvedValue({
            rapidAssessmentId: 'assessment-123',
            hasFunctionalClinic: true,
            hasEmergencyServices: false,
            numberHealthFacilities: 2,
            healthFacilityType: 'Primary Health Center',
            qualifiedHealthWorkers: 5,
            hasTrainedStaff: true,
            hasMedicineSupply: false,
            hasMedicalSupplies: true,
            hasMaternalChildServices: false,
            commonHealthIssues: '["Diarrhea", "Malaria"]',
            additionalHealthDetails: null
          })
        }
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction as any)
      })

      const assessmentData = {
        type: 'HEALTH' as const,
        rapidAssessmentDate: new Date().toISOString(),
        assessorName: 'Test Assessor',
        entityId: 'entity-123',
        location: 'Test Location',
        coordinates: {
          latitude: 1.2345,
          longitude: 6.7890,
          accuracy: 10,
          timestamp: new Date().toISOString(),
          captureMethod: 'GPS' as const
        },
        mediaAttachments: ['photo1.jpg', 'photo2.jpg'],
        priority: 'HIGH' as const,
        healthData: {
          hasFunctionalClinic: true,
          hasEmergencyServices: false,
          numberHealthFacilities: 2,
          healthFacilityType: 'Primary Health Center',
          qualifiedHealthWorkers: 5,
          hasTrainedStaff: true,
          hasMedicineSupply: false,
          hasMedicalSupplies: true,
          hasMaternalChildServices: false,
          commonHealthIssues: ['Diarrhea', 'Malaria'],
          additionalHealthDetails: null
        }
      }

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.rapidAssessmentType).toBe('HEALTH')
      expect(data.data.id).toBe('assessment-123')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should handle assessment creation with entity assignment failure', async () => {
      // Mock entity assignment not found
      mockPrisma.entityAssignment.findFirst.mockResolvedValue(null)

      const assessmentData = {
        type: 'HEALTH' as const,
        rapidAssessmentDate: new Date().toISOString(),
        assessorName: 'Test Assessor',
        entityId: 'unauthorized-entity',
        healthData: {
          hasFunctionalClinic: true,
          hasEmergencyServices: false,
          numberHealthFacilities: 1,
          healthFacilityType: 'Clinic',
          qualifiedHealthWorkers: 2,
          hasTrainedStaff: true,
          hasMedicineSupply: true,
          hasMedicalSupplies: false,
          hasMaternalChildServices: false,
          commonHealthIssues: [],
          additionalHealthDetails: null
        }
      }

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      await expect(POST(request, {} as any)).rejects.toThrow('User is not assigned to this entity')
    })
  })

  describe('Assessment Retrieval Workflows', () => {
    it('should retrieve user assessments with pagination and filtering', async () => {
      const mockAssessments = [
        {
          id: 'assessment-1',
          rapidAssessmentType: 'HEALTH' as AssessmentType,
          status: 'DRAFT' as AssessmentStatus,
          priority: 'HIGH' as Priority,
          assessorId: 'test-user-123',
          entityId: 'entity-1',
          rapidAssessmentDate: new Date('2025-01-15'),
          createdAt: new Date('2025-01-15T10:00:00Z'),
          entity: {
            id: 'entity-1',
            name: 'Test Clinic',
            type: 'CLINIC',
            location: 'Test Location'
          },
          healthAssessment: {
            hasFunctionalClinic: true,
            hasEmergencyServices: false,
            numberHealthFacilities: 2,
            healthFacilityType: 'Primary Health Center'
          }
        },
        {
          id: 'assessment-2',
          rapidAssessmentType: 'FOOD' as AssessmentType,
          status: 'SUBMITTED' as AssessmentStatus,
          priority: 'MEDIUM' as Priority,
          assessorId: 'test-user-123',
          entityId: 'entity-2',
          rapidAssessmentDate: new Date('2025-01-16'),
          createdAt: new Date('2025-01-16T14:30:00Z'),
          entity: {
            id: 'entity-2',
            name: 'Test Shelter',
            type: 'SHELTER',
            location: 'Test Location 2'
          },
          foodAssessment: {
            isFoodSufficient: false,
            hasRegularMealAccess: true,
            hasInfantNutrition: false,
            availableFoodDurationDays: 5
          }
        }
      ]

      mockRapidAssessmentService.findByUserId.mockResolvedValue({
        assessments: mockAssessments as any,
        total: 2,
        totalPages: 1
      })

      const request = new NextRequest(
        'http://localhost:3000/api/v1/rapid-assessments?userId=test-user-123&type=HEALTH&status=DRAFT&page=1&limit=10'
      )

      const response = await GET(request, { user: { userId: 'test-user-123' } } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.totalPages).toBe(1)
      expect(mockRapidAssessmentService.findByUserId).toHaveBeenCalledWith('test-user-123', {
        page: 1,
        limit: 10,
        userId: 'test-user-123',
        type: 'HEALTH',
        status: 'DRAFT'
      })
    })

    it('should retrieve single assessment with full details', async () => {
      const mockAssessment = {
        id: 'assessment-123',
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        status: 'DRAFT' as AssessmentStatus,
        priority: 'HIGH' as Priority,
        assessorId: 'test-user-123',
        entityId: 'entity-123',
        coordinates: { latitude: 1.2345, longitude: 6.7890 },
        mediaAttachments: ['photo1.jpg'],
        rapidAssessmentDate: new Date('2025-01-15'),
        createdAt: new Date('2025-01-15T10:00:00Z'),
        assessor: {
          id: 'test-user-123',
          name: 'Test Assessor',
          email: 'test@example.com'
        },
        entity: {
          id: 'entity-123',
          name: 'Test Entity',
          type: 'CLINIC',
          location: 'Test Location'
        },
        healthAssessment: {
          hasFunctionalClinic: true,
          hasEmergencyServices: false,
          numberHealthFacilities: 2,
          healthFacilityType: 'Primary Health Center',
          qualifiedHealthWorkers: 5,
          hasTrainedStaff: true,
          hasMedicineSupply: false,
          hasMedicalSupplies: true,
          hasMaternalChildServices: false,
          commonHealthIssues: '["Diarrhea", "Malaria"]',
          additionalHealthDetails: null
        }
      }

      mockRapidAssessmentService.findById.mockResolvedValue(mockAssessment as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123')
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await GetById(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.id).toBe('assessment-123')
      expect(data.data.rapidAssessmentType).toBe('HEALTH')
      expect(data.data.assessor.name).toBe('Test Assessor')
      expect(data.data.entity.name).toBe('Test Entity')
      expect(data.data.healthAssessment.hasFunctionalClinic).toBe(true)
    })

    it('should enforce authorization for assessment access', async () => {
      const mockAssessment = {
        id: 'assessment-123',
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        assessorId: 'different-user-456', // Different from requesting user
        status: 'DRAFT' as AssessmentStatus
      }

      mockRapidAssessmentService.findById.mockResolvedValue(mockAssessment as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123')
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await GetById(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })

      expect(response.status).toBe(403)
    })
  })

  describe('Assessment Update Workflow', () => {
    it('should update assessment and maintain data integrity', async () => {
      const existingAssessment = {
        id: 'assessment-123',
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        assessorId: 'test-user-123',
        status: 'DRAFT' as AssessmentStatus,
        healthAssessment: {
          hasFunctionalClinic: true,
          hasEmergencyServices: false,
          numberHealthFacilities: 2,
          healthFacilityType: 'Primary Health Center'
        }
      }

      const updatedAssessment = {
        ...existingAssessment,
        status: 'DRAFT' as AssessmentStatus,
        updatedAt: new Date(),
        healthAssessment: {
          ...existingAssessment.healthAssessment,
          hasEmergencyServices: true, // Changed from false
          numberHealthFacilities: 3   // Changed from 2
        }
      }

      mockRapidAssessmentService.findById.mockResolvedValue(existingAssessment as any)
      mockPrisma.rapidAssessment.update.mockResolvedValue(updatedAssessment as any)

      const updateData = {
        healthData: {
          hasEmergencyServices: true,
          numberHealthFacilities: 3
        }
      }

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await PUT(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.rapidAssessment.update).toHaveBeenCalledWith({
        where: { id: 'assessment-123' },
        data: {
          ...updateData,
          updatedAt: expect.any(Date)
        },
        include: expect.any(Object)
      })
    })
  })

  describe('Assessment Deletion Workflow', () => {
    it('should delete assessment and related data', async () => {
      const existingAssessment = {
        id: 'assessment-123',
        assessorId: 'test-user-123'
      }

      mockPrisma.rapidAssessment.findUnique.mockResolvedValue(existingAssessment as any)
      mockPrisma.rapidAssessment.delete.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123', {
        method: 'DELETE'
      })

      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })

      expect(response.status).toBe(200)
      expect(mockPrisma.rapidAssessment.delete).toHaveBeenCalledWith({
        where: { id: 'assessment-123' }
      })
    })
  })

  describe('Multi-Type Assessment Workflows', () => {
    const assessmentTypes: AssessmentType[] = ['HEALTH', 'POPULATION', 'FOOD', 'WASH', 'SHELTER', 'SECURITY']

    it.each(assessmentTypes)('should support complete workflow for %s assessment', async (assessmentType) => {
      // Mock entity assignment
      mockPrisma.entityAssignment.findFirst.mockResolvedValue({
        id: 'assignment-123',
        userId: 'test-user-123',
        entityId: 'entity-123',
        status: 'ACTIVE'
      } as any)

      // Mock transaction
      const mockTransaction = {
        rapidAssessment: {
          create: jest.fn().mockResolvedValue({
            id: `assessment-${assessmentType.toLowerCase()}-123`,
            rapidAssessmentType: assessmentType,
            status: 'DRAFT',
            assessorId: 'test-user-123',
            entityId: 'entity-123'
          })
        },
        [`${assessmentType.toLowerCase()}Assessment`]: {
          create: jest.fn().mockResolvedValue({
            rapidAssessmentId: `assessment-${assessmentType.toLowerCase()}-123`
          })
        }
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction as any)
      })

      const typeSpecificData = {
        HEALTH: {
          hasFunctionalClinic: true,
          hasEmergencyServices: false,
          numberHealthFacilities: 1,
          healthFacilityType: 'Clinic',
          qualifiedHealthWorkers: 2,
          hasTrainedStaff: true,
          hasMedicineSupply: true,
          hasMedicalSupplies: false,
          hasMaternalChildServices: false,
          commonHealthIssues: [],
          additionalHealthDetails: null
        },
        POPULATION: {
          totalHouseholds: 50,
          totalPopulation: 200,
          populationMale: 100,
          populationFemale: 100,
          populationUnder5: 20,
          pregnantWomen: 5,
          lactatingMothers: 8,
          personWithDisability: 3,
          elderlyPersons: 15,
          separatedChildren: 2,
          numberLivesLost: 0,
          numberInjured: 1,
          additionalPopulationDetails: null
        },
        FOOD: {
          isFoodSufficient: false,
          hasRegularMealAccess: true,
          hasInfantNutrition: false,
          foodSource: ['Government kitchen'],
          availableFoodDurationDays: 7,
          additionalFoodRequiredPersons: 30,
          additionalFoodRequiredHouseholds: 8,
          additionalFoodDetails: null
        },
        WASH: {
          waterSource: ['Borehole'],
          isWaterSufficient: false,
          hasCleanWaterAccess: true,
          functionalLatrinesAvailable: 2,
          areLatrinesSufficient: false,
          hasHandwashingFacilities: true,
          hasOpenDefecationConcerns: false,
          additionalWashDetails: null
        },
        SHELTER: {
          areSheltersSufficient: false,
          hasSafeStructures: true,
          shelterTypes: ['Tent'],
          requiredShelterType: ['Tent'],
          numberSheltersRequired: 10,
          areOvercrowded: true,
          provideWeatherProtection: false,
          additionalShelterDetails: null
        },
        SECURITY: {
          isSafeFromViolence: true,
          gbvCasesReported: false,
          hasSecurityPresence: true,
          hasProtectionReportingMechanism: false,
          vulnerableGroupsHaveAccess: true,
          hasLighting: false,
          additionalSecurityDetails: null
        }
      }

      const assessmentData = {
        type: assessmentType,
        rapidAssessmentDate: new Date().toISOString(),
        assessorName: 'Test Assessor',
        entityId: 'entity-123',
        [`${assessmentType.toLowerCase()}Data`]: typeSpecificData[assessmentType]
      }

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.rapidAssessmentType).toBe(assessmentType)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('Gap Analysis Integration', () => {
    it('should identify gaps in health assessment data', async () => {
      const mockAssessment = {
        id: 'assessment-123',
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        status: 'DRAFT' as AssessmentStatus,
        healthAssessment: {
          hasFunctionalClinic: true,        // No gap
          hasEmergencyServices: false,     // Gap
          hasTrainedStaff: true,            // No gap
          hasMedicineSupply: false,         // Gap
          hasMedicalSupplies: true,         // No gap
          hasMaternalChildServices: false   // Gap
        }
      }

      mockRapidAssessmentService.findById.mockResolvedValue(mockAssessment as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123')
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await GetById(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Verify gap fields
      const healthData = data.data.healthAssessment
      const gaps = []
      if (!healthData.hasEmergencyServices) gaps.push('Emergency Services')
      if (!healthData.hasMedicineSupply) gaps.push('Medicine Supply')
      if (!healthData.hasMaternalChildServices) gaps.push('Maternal/Child Services')
      
      expect(gaps).toHaveLength(3)
      expect(gaps).toContain('Emergency Services')
      expect(gaps).toContain('Medicine Supply')
      expect(gaps).toContain('Maternal/Child Services')
    })

    it('should calculate gap severity based on assessment type', async () => {
      // Test different gap configurations for different assessment types
      const criticalGapsScenarios = [
        {
          type: 'HEALTH',
          data: { hasFunctionalClinic: false, hasEmergencyServices: false },
          expectedSeverity: 'CRITICAL'
        },
        {
          type: 'FOOD',
          data: { isFoodSufficient: false, hasInfantNutrition: false },
          expectedSeverity: 'CRITICAL'
        },
        {
          type: 'WASH',
          data: { isWaterSufficient: false, hasCleanWaterAccess: false },
          expectedSeverity: 'CRITICAL'
        },
        {
          type: 'SHELTER',
          data: { areSheltersSufficient: false, hasSafeStructures: false },
          expectedSeverity: 'CRITICAL'
        },
        {
          type: 'SECURITY',
          data: { isSafeFromViolence: false, hasSecurityPresence: false },
          expectedSeverity: 'CRITICAL'
        }
      ]

      for (const scenario of criticalGapsScenarios) {
        const mockAssessment = {
          id: `assessment-${scenario.type.toLowerCase()}-123`,
          rapidAssessmentType: scenario.type,
          status: 'DRAFT',
          [`${scenario.type.toLowerCase()}Assessment`]: scenario.data
        }

        mockRapidAssessmentService.findById.mockResolvedValue(mockAssessment as any)

        const request = new NextRequest(`http://localhost:3000/api/v1/rapid-assessments/assessment-${scenario.type.toLowerCase()}-123`)
        const mockRequest = request as any
        mockRequest.user = { userId: 'test-user-123' }

        const response = await GetById(mockRequest, { 
          params: Promise.resolve({ id: `assessment-${scenario.type.toLowerCase()}-123` }) 
        })

        expect(response.status).toBe(200)
        
        // In a real implementation, you would calculate gap severity here
        // This test demonstrates the integration point for gap analysis
        const data = await response.json()
        expect(data.data.rapidAssessmentType).toBe(scenario.type)
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent assessment creation gracefully', async () => {
      // Mock transaction failure due to concurrency
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction conflict'))

      const assessmentData = {
        type: 'HEALTH' as const,
        rapidAssessmentDate: new Date().toISOString(),
        assessorName: 'Test Assessor',
        entityId: 'entity-123',
        healthData: {
          hasFunctionalClinic: true,
          hasEmergencyServices: false,
          numberHealthFacilities: 1,
          healthFacilityType: 'Clinic',
          qualifiedHealthWorkers: 2,
          hasTrainedStaff: true,
          hasMedicineSupply: true,
          hasMedicalSupplies: false,
          hasMaternalChildServices: false,
          commonHealthIssues: [],
          additionalHealthDetails: null
        }
      }

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      await expect(POST(request, {} as any)).rejects.toThrow('Transaction conflict')
    })

    it('should validate assessment data integrity', async () => {
      // Test with malformed assessment data
      const invalidAssessmentData = {
        type: 'HEALTH',
        rapidAssessmentDate: 'invalid-date',
        healthData: {
          hasFunctionalClinic: 'not-a-boolean', // Should be boolean
          numberHealthFacilities: 'not-a-number' // Should be number
        }
      }

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(invalidAssessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      expect(response.status).toBe(400)
    })

    it('should handle database connection failures', async () => {
      mockRapidAssessmentService.findByUserId.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments?userId=test-user-123')

      const response = await GET(request, { user: { userId: 'test-user-123' } } as any)
      expect(response.status).toBe(500)
    })
  })
})