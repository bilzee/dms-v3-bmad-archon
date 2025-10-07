// Integration tests
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/preliminary-assessments/route'
import { prisma } from '@/lib/db/client'

// Test data
const mockUser = {
  id: 'test-user-id',
  email: 'assessor@test.com',
  username: 'test-assessor',
  name: 'Test Assessor',
  roles: ['ASSESSOR'],
  permissions: ['assessment:create', 'assessment:read']
}

const mockAssessmentData = {
  data: {
    reportingDate: new Date('2025-01-06T10:00:00Z'),
    reportingLatitude: 9.072264,
    reportingLongitude: 7.491302,
    reportingLGA: 'Lagos Island',
    reportingWard: 'Ward 1',
    numberLivesLost: 0,
    numberInjured: 3,
    numberDisplaced: 15,
    numberHousesAffected: 8,
    schoolsAffected: 'Primary School A damaged roof',
    medicalFacilitiesAffected: 'Health Center B - equipment damaged',
    estimatedAgriculturalLandsAffected: '2 hectares of farmland flooded',
    reportingAgent: 'Test Assessor',
    additionalDetails: 'Flash flood caused by heavy rainfall',
  }
}

// Mock the auth middleware
const createAuthenticatedRequest = (method: string, url: string, body?: any) => {
  const request = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-token'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  // Mock the auth context
  ;(request as any).auth = {
    user: mockUser,
    params: {}
  }

  return request
}

describe('Preliminary Assessment Workflow Integration Tests', () => {
  let createdAssessmentId: string

  beforeAll(async () => {
    // Set up test database with clean state
    await prisma.preliminaryAssessment.deleteMany()
    await prisma.incident.deleteMany()
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.preliminaryAssessment.deleteMany()
    await prisma.incident.deleteMany()
  })

  beforeEach(async () => {
    // Clean up before each test
    await prisma.preliminaryAssessment.deleteMany()
    await prisma.incident.deleteMany()
  })

  describe('Assessment Creation', () => {
    it('should create a preliminary assessment successfully', async () => {
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        mockAssessmentData
      )

      const response = await POST(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data).toMatchObject({
        reportingLGA: 'Lagos Island',
        reportingWard: 'Ward 1',
        numberInjured: 3,
        numberDisplaced: 15,
        reportingAgent: 'Test Assessor'
      })

      createdAssessmentId = data.data.id
    })

    it('should create assessment with incident when requested', async () => {
      const requestWithIncident = {
        ...mockAssessmentData,
        createIncident: true,
        incidentData: {
          type: 'Flood',
          severity: 'HIGH',
          description: 'Flash flood in Lagos Island',
          location: 'Lagos Island, Ward 1'
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        requestWithIncident
      )

      const response = await POST(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.incidentId).toBeDefined()
      expect(data.data.incident).toMatchObject({
        type: 'Flood',
        severity: 'HIGH',
        description: 'Flash flood in Lagos Island'
      })
    })

    it('should validate required fields', async () => {
      const invalidData = {
        data: {
          reportingDate: new Date(),
          // Missing required fields
          reportingLGA: '',
          reportingWard: '',
          reportingAgent: ''
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        invalidData
      )

      const response = await POST(request as any, { params: {} } as any)

      expect(response.status).toBe(400)
    })

    it('should validate coordinate bounds', async () => {
      const invalidCoordinates = {
        ...mockAssessmentData,
        data: {
          ...mockAssessmentData.data,
          reportingLatitude: 95, // Invalid: > 90
          reportingLongitude: 185 // Invalid: > 180
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        invalidCoordinates
      )

      const response = await POST(request as any, { params: {} } as any)

      expect(response.status).toBe(400)
    })
  })

  describe('Assessment Retrieval', () => {
    beforeEach(async () => {
      // Create a test assessment
      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        mockAssessmentData
      )

      const response = await POST(request as any, { params: {} } as any)
      const data = await response.json()
      createdAssessmentId = data.data.id
    })

    it('should retrieve all assessments with pagination', async () => {
      const request = createAuthenticatedRequest(
        'GET',
        'http://localhost:3000/api/v1/preliminary-assessments?page=1&limit=10'
      )

      const response = await GET(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeInstanceOf(Array)
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      })
    })

    it('should filter assessments by LGA', async () => {
      const request = createAuthenticatedRequest(
        'GET',
        'http://localhost:3000/api/v1/preliminary-assessments?lga=Lagos Island'
      )

      const response = await GET(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.every((assessment: any) => assessment.reportingLGA === 'Lagos Island')).toBe(true)
    })

    it('should filter assessments by ward', async () => {
      const request = createAuthenticatedRequest(
        'GET',
        'http://localhost:3000/api/v1/preliminary-assessments?ward=Ward 1'
      )

      const response = await GET(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.every((assessment: any) => assessment.reportingWard === 'Ward 1')).toBe(true)
    })
  })

  describe('Impact Assessment Calculations', () => {
    it('should handle zero impact numbers correctly', async () => {
      const zeroImpactData = {
        ...mockAssessmentData,
        data: {
          ...mockAssessmentData.data,
          numberLivesLost: 0,
          numberInjured: 0,
          numberDisplaced: 0,
          numberHousesAffected: 0
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        zeroImpactData
      )

      const response = await POST(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.numberLivesLost).toBe(0)
      expect(data.data.numberInjured).toBe(0)
      expect(data.data.numberDisplaced).toBe(0)
      expect(data.data.numberHousesAffected).toBe(0)
    })

    it('should handle large impact numbers', async () => {
      const largeImpactData = {
        ...mockAssessmentData,
        data: {
          ...mockAssessmentData.data,
          numberLivesLost: 50,
          numberInjured: 200,
          numberDisplaced: 1000,
          numberHousesAffected: 500
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        largeImpactData
      )

      const response = await POST(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.numberLivesLost).toBe(50)
      expect(data.data.numberInjured).toBe(200)
      expect(data.data.numberDisplaced).toBe(1000)
      expect(data.data.numberHousesAffected).toBe(500)
    })

    it('should reject negative impact numbers', async () => {
      const negativeImpactData = {
        ...mockAssessmentData,
        data: {
          ...mockAssessmentData.data,
          numberLivesLost: -1,
          numberInjured: -5
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        negativeImpactData
      )

      const response = await POST(request as any, { params: {} } as any)

      expect(response.status).toBe(400)
    })
  })

  describe('Infrastructure Impact Assessment', () => {
    it('should handle optional infrastructure fields', async () => {
      const minimalData = {
        data: {
          reportingDate: new Date(),
          reportingLatitude: 9.072264,
          reportingLongitude: 7.491302,
          reportingLGA: 'Lagos Island',
          reportingWard: 'Ward 1',
          numberLivesLost: 0,
          numberInjured: 0,
          numberDisplaced: 0,
          numberHousesAffected: 0,
          reportingAgent: 'Test Assessor'
          // No infrastructure fields
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        minimalData
      )

      const response = await POST(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.schoolsAffected).toBeNull()
      expect(data.data.medicalFacilitiesAffected).toBeNull()
      expect(data.data.estimatedAgriculturalLandsAffected).toBeNull()
    })

    it('should store infrastructure impact details correctly', async () => {
      const detailedInfrastructureData = {
        ...mockAssessmentData,
        data: {
          ...mockAssessmentData.data,
          schoolsAffected: 'School A - roof damage, School B - flooding in classrooms',
          medicalFacilitiesAffected: 'Hospital C - generator failure, Clinic D - medical supplies damaged',
          estimatedAgriculturalLandsAffected: '5 hectares of rice fields destroyed, 200 livestock affected'
        }
      }

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/preliminary-assessments',
        detailedInfrastructureData
      )

      const response = await POST(request as any, { params: {} } as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.schoolsAffected).toContain('School A - roof damage')
      expect(data.data.medicalFacilitiesAffected).toContain('Hospital C - generator failure')
      expect(data.data.estimatedAgriculturalLandsAffected).toContain('5 hectares of rice fields')
    })
  })
})