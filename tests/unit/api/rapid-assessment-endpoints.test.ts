import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/v1/rapid-assessments/route'
import { PUT, GET as GetById, DELETE } from '@/app/api/v1/rapid-assessments/[id]/route'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'
import { CreateRapidAssessmentSchema } from '@/lib/validation/rapid-assessment'
import { AssessmentType, AssessmentStatus, Priority } from '@prisma/client'

// Mock the authentication middleware
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler) => {
    return async (request: NextRequest, context: any) => {
      // Mock authenticated user context
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

// Mock the RapidAssessmentService
jest.mock('@/lib/services/rapid-assessment.service')

const mockRapidAssessmentService = RapidAssessmentService as jest.Mocked<typeof RapidAssessmentService>

describe('Rapid Assessment API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/v1/rapid-assessments', () => {
    const validHealthAssessmentData = {
      type: 'HEALTH' as const,
      rapidAssessmentDate: new Date().toISOString(),
      assessorName: 'Test Assessor',
      entityId: 'test-entity-123',
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
        additionalHealthDetails: 'Additional health notes'
      }
    }

    it('should create a health assessment successfully', async () => {
      const mockResponse = {
        id: 'test-assessment-123',
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        status: 'DRAFT' as AssessmentStatus,
        priority: 'HIGH' as Priority,
        ...validHealthAssessmentData,
        healthAssessment: validHealthAssessmentData.healthData
      }

      mockRapidAssessmentService.create.mockResolvedValue(mockResponse as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(validHealthAssessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data).toEqual(mockResponse)
      expect(mockRapidAssessmentService.create).toHaveBeenCalledWith(
        validHealthAssessmentData,
        'test-user-123'
      )
    })

    it('should create a food assessment successfully', async () => {
      const foodAssessmentData = {
        type: 'FOOD' as const,
        rapidAssessmentDate: new Date().toISOString(),
        assessorName: 'Test Assessor',
        entityId: 'test-entity-123',
        foodData: {
          isFoodSufficient: false,
          hasRegularMealAccess: true,
          hasInfantNutrition: false,
          foodSource: ['Government kitchen', 'Humanitarian Partners'],
          availableFoodDurationDays: 5,
          additionalFoodRequiredPersons: 100,
          additionalFoodRequiredHouseholds: 25,
          additionalFoodDetails: 'Emergency food assistance needed'
        }
      }

      const mockResponse = {
        id: 'test-food-assessment-123',
        rapidAssessmentType: 'FOOD' as AssessmentType,
        status: 'DRAFT' as AssessmentStatus,
        ...foodAssessmentData,
        foodAssessment: foodAssessmentData.foodData
      }

      mockRapidAssessmentService.create.mockResolvedValue(mockResponse as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(foodAssessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.rapidAssessmentType).toBe('FOOD')
      expect(mockRapidAssessmentService.create).toHaveBeenCalledWith(
        foodAssessmentData,
        'test-user-123'
      )
    })

    it('should return 400 for invalid assessment data', async () => {
      const invalidData = {
        type: 'HEALTH',
        // Missing required fields
        healthData: {
          hasFunctionalClinic: 'invalid' // Should be boolean
        }
      }

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 403 when user is not assigned to entity', async () => {
      mockRapidAssessmentService.create.mockRejectedValue(
        new Error('User is not assigned to this entity')
      )

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(validHealthAssessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('assigned')
    })

    it('should return 500 for server errors', async () => {
      mockRapidAssessmentService.create.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments', {
        method: 'POST',
        body: JSON.stringify(validHealthAssessmentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request, {} as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/v1/rapid-assessments', () => {
    it('should return user-specific assessments when userId matches current user', async () => {
      const mockAssessments = [
        {
          id: 'assessment-1',
          rapidAssessmentType: 'HEALTH' as AssessmentType,
          status: 'DRAFT' as AssessmentStatus,
          priority: 'HIGH' as Priority,
          entity: { id: 'entity-1', name: 'Test Entity', type: 'CLINIC', location: 'Test Location' }
        },
        {
          id: 'assessment-2',
          rapidAssessmentType: 'FOOD' as AssessmentType,
          status: 'SUBMITTED' as AssessmentStatus,
          priority: 'MEDIUM' as Priority,
          entity: { id: 'entity-2', name: 'Test Entity 2', type: 'SHELTER', location: 'Test Location 2' }
        }
      ]

      mockRapidAssessmentService.findByUserId.mockResolvedValue({
        assessments: mockAssessments as any,
        total: 2,
        totalPages: 1
      })

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments?userId=test-user-123&page=1&limit=10')

      const response = await GET(request, { user: { userId: 'test-user-123' } } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockAssessments)
      expect(data.pagination.total).toBe(2)
      expect(mockRapidAssessmentService.findByUserId).toHaveBeenCalledWith('test-user-123', {
        page: 1,
        limit: 10,
        userId: 'test-user-123'
      })
    })

    it('should return all assessments for admin access', async () => {
      const mockAssessments = [
        {
          id: 'assessment-1',
          rapidAssessmentType: 'HEALTH' as AssessmentType,
          assessor: { id: 'user-1', name: 'Assessor 1', email: 'assessor1@test.com' },
          entity: { id: 'entity-1', name: 'Test Entity', type: 'CLINIC', location: 'Test Location' }
        }
      ]

      mockRapidAssessmentService.findAll.mockResolvedValue({
        assessments: mockAssessments as any,
        total: 1,
        totalPages: 1
      })

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments?type=HEALTH&status=DRAFT')

      const response = await GET(request, { user: { userId: 'admin-user' } } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockAssessments)
      expect(mockRapidAssessmentService.findAll).toHaveBeenCalledWith({
        type: 'HEALTH',
        status: 'DRAFT',
        page: 1,
        limit: 10
      })
    })

    it('should handle query parameters correctly', async () => {
      mockRapidAssessmentService.findByUserId.mockResolvedValue({
        assessments: [],
        total: 0,
        totalPages: 0
      })

      const request = new NextRequest(
        'http://localhost:3000/api/v1/rapid-assessments?userId=test-user-123&type=FOOD&status=SUBMITTED&priority=HIGH&page=2&limit=5'
      )

      await GET(request, { user: { userId: 'test-user-123' } } as any)

      expect(mockRapidAssessmentService.findByUserId).toHaveBeenCalledWith('test-user-123', {
        page: 2,
        limit: 5,
        userId: 'test-user-123',
        type: 'FOOD',
        status: 'SUBMITTED',
        priority: 'HIGH'
      })
    })
  })

  describe('GET /api/v1/rapid-assessments/[id]', () => {
    it('should return assessment by ID for authorized user', async () => {
      const mockAssessment = {
        id: 'assessment-123',
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        status: 'DRAFT' as AssessmentStatus,
        assessorId: 'test-user-123',
        assessor: { id: 'test-user-123', name: 'Test Assessor', email: 'test@example.com' },
        entity: { id: 'entity-123', name: 'Test Entity', type: 'CLINIC', location: 'Test Location' },
        healthAssessment: {
          hasFunctionalClinic: true,
          hasEmergencyServices: false,
          numberHealthFacilities: 2
        }
      }

      mockRapidAssessmentService.findById.mockResolvedValue(mockAssessment as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123')
      
      // Mock request with user context
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await GetById(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockAssessment)
      expect(mockRapidAssessmentService.findById).toHaveBeenCalledWith('assessment-123')
    })

    it('should return 404 for non-existent assessment', async () => {
      mockRapidAssessmentService.findById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/non-existent')
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await GetById(mockRequest, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Assessment not found')
    })

    it('should return 403 for unauthorized access', async () => {
      const mockAssessment = {
        id: 'assessment-123',
        assessorId: 'different-user-456', // Different from current user
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        status: 'DRAFT' as AssessmentStatus
      }

      mockRapidAssessmentService.findById.mockResolvedValue(mockAssessment as any)

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123')
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await GetById(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not authorized to view this assessment')
    })
  })

  describe('PUT /api/v1/rapid-assessments/[id]', () => {
    it('should update assessment successfully', async () => {
      const updateData = {
        location: 'Updated Location',
        priority: 'CRITICAL' as const,
        healthData: {
          hasFunctionalClinic: true,
          hasEmergencyServices: true, // Changed from false
          numberHealthFacilities: 3 // Changed from 2
        }
      }

      const mockUpdatedAssessment = {
        id: 'assessment-123',
        rapidAssessmentType: 'HEALTH' as AssessmentType,
        status: 'DRAFT' as AssessmentStatus,
        assessorId: 'test-user-123',
        ...updateData,
        healthAssessment: updateData.healthData
      }

      mockRapidAssessmentService.update.mockResolvedValue(mockUpdatedAssessment as any)

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
      expect(data.data).toEqual(mockUpdatedAssessment)
      expect(mockRapidAssessmentService.update).toHaveBeenCalledWith(
        'assessment-123',
        updateData,
        'test-user-123'
      )
    })

    it('should return 404 when updating non-existent assessment', async () => {
      mockRapidAssessmentService.update.mockRejectedValue(
        new Error('Assessment not found')
      )

      const updateData = { location: 'Updated Location' }
      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/non-existent', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await PUT(mockRequest, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Assessment not found')
    })

    it('should return 403 when updating without authorization', async () => {
      mockRapidAssessmentService.update.mockRejectedValue(
        new Error('Not authorized to update this assessment')
      )

      const updateData = { location: 'Updated Location' }
      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const mockRequest = request as any
      mockRequest.user = { userId: 'unauthorized-user' }

      const response = await PUT(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('authorized')
    })
  })

  describe('DELETE /api/v1/rapid-assessments/[id]', () => {
    it('should delete assessment successfully', async () => {
      mockRapidAssessmentService.delete.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123', {
        method: 'DELETE'
      })
      
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Assessment deleted successfully')
      expect(mockRapidAssessmentService.delete).toHaveBeenCalledWith('assessment-123', 'test-user-123')
    })

    it('should return 404 when deleting non-existent assessment', async () => {
      mockRapidAssessmentService.delete.mockRejectedValue(
        new Error('Assessment not found')
      )

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/non-existent', {
        method: 'DELETE'
      })
      
      const mockRequest = request as any
      mockRequest.user = { userId: 'test-user-123' }

      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Assessment not found')
    })

    it('should return 403 when deleting without authorization', async () => {
      mockRapidAssessmentService.delete.mockRejectedValue(
        new Error('Not authorized to delete this assessment')
      )

      const request = new NextRequest('http://localhost:3000/api/v1/rapid-assessments/assessment-123', {
        method: 'DELETE'
      })
      
      const mockRequest = request as any
      mockRequest.user = { userId: 'unauthorized-user' }

      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'assessment-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('authorized')
    })
  })

  describe('Assessment Type Coverage', () => {
    const assessmentTypes: AssessmentType[] = ['HEALTH', 'POPULATION', 'FOOD', 'WASH', 'SHELTER', 'SECURITY']

    it.each(assessmentTypes)('should support %s assessment type', async (assessmentType) => {
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
        entityId: 'test-entity-123',
        [`${assessmentType.toLowerCase()}Data`]: typeSpecificData[assessmentType]
      }

      const mockResponse = {
        id: `test-${assessmentType.toLowerCase()}-assessment`,
        rapidAssessmentType: assessmentType,
        status: 'DRAFT' as AssessmentStatus,
        ...assessmentData,
        [`${assessmentType.toLowerCase()}Assessment`]: typeSpecificData[assessmentType]
      }

      mockRapidAssessmentService.create.mockResolvedValue(mockResponse as any)

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
      expect(mockRapidAssessmentService.create).toHaveBeenCalledWith(
        assessmentData,
        'test-user-123'
      )
    })
  })
})