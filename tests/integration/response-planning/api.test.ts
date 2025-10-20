import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { createTestClient, TestClient } from '../helpers/test-client'
import { setupTestDatabase, cleanupTestDatabase, seedTestData } from '../helpers/test-db'

describe('Response Planning API Integration', () => {
  let testClient: TestClient
  let testUserId: string
  let testEntityId: string
  let testAssessmentId: string
  let authToken: string

  beforeAll(async () => {
    await setupTestDatabase()
    testClient = await createTestClient()
  })

  afterAll(async () => {
    await testClient.cleanup()
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Seed test data
    const testData = await seedTestData({
      users: [
        {
          id: 'test-user-123',
          email: 'responder@test.com',
          name: 'Test Responder',
          role: 'RESPONDER'
        }
      ],
      entities: [
        {
          id: 'test-entity-123',
          name: 'Test Location',
          type: 'COMMUNITY',
          location: 'Test City'
        }
      ],
      assessments: [
        {
          id: 'test-assessment-123',
          entityId: 'test-entity-123',
          assessorId: 'test-user-123',
          type: 'HEALTH',
          status: 'VERIFIED',
          data: { needs: 'Medical supplies' }
        }
      ],
      assignments: [
        {
          userId: 'test-user-123',
          entityId: 'test-entity-123',
          role: 'RESPONDER'
        }
      ]
    })

    testUserId = testData.users[0].id
    testEntityId = testData.entities[0].id
    testAssessmentId = testData.assessments[0].id

    // Authenticate test user
    const authResponse = await testClient.post('/api/v1/auth/login', {
      email: 'responder@test.com',
      password: 'test-password'
    })
    authToken = authResponse.data.token
  })

  afterEach(async () => {
    await testClient.cleanupData()
  })

  describe('POST /api/v1/responses/planned', () => {
    it('should create a planned response successfully', async () => {
      const responsePlan = {
        assessmentId: testAssessmentId,
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        description: 'Medical response plan',
        items: [
          {
            name: 'First Aid Kits',
            unit: 'kits',
            quantity: 50,
            category: 'Medical'
          }
        ]
      }

      const response = await testClient.post('/api/v1/responses/planned', responsePlan, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(201)
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          assessmentId: testAssessmentId,
          entityId: testEntityId,
          type: 'HEALTH',
          priority: 'HIGH',
          status: 'PLANNED',
          items: expect.arrayContaining([
            expect.objectContaining({
              name: 'First Aid Kits',
              unit: 'kits',
              quantity: 50
            })
          ])
        })
      })
    })

    it('should reject invalid assessment ID', async () => {
      const responsePlan = {
        assessmentId: 'invalid-assessment',
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        items: [
          {
            name: 'Test Item',
            unit: 'units',
            quantity: 1
          }
        ]
      }

      const response = await testClient.post('/api/v1/responses/planned', responsePlan, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(404)
      expect(response.data).toMatchObject({
        success: false,
        error: expect.stringContaining('Assessment not found')
      })
    })

    it('should reject empty items array', async () => {
      const responsePlan = {
        assessmentId: testAssessmentId,
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        items: []
      }

      const response = await testClient.post('/api/v1/responses/planned', responsePlan, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(400)
      expect(response.data).toMatchObject({
        success: false,
        error: expect.stringContaining('At least one item is required')
      })
    })

    it('should reject unauthorized access', async () => {
      const responsePlan = {
        assessmentId: testAssessmentId,
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        items: [
          {
            name: 'Test Item',
            unit: 'units',
            quantity: 1
          }
        ]
      }

      const response = await testClient.post('/api/v1/responses/planned', responsePlan)

      expect(response.status).toBe(401)
    })

    it('should reject users with wrong role', async () => {
      // Create user with DONOR role
      const donorData = await seedTestData({
        users: [
          {
            id: 'donor-user-123',
            email: 'donor@test.com',
            name: 'Test Donor',
            role: 'DONOR'
          }
        ]
      })

      const donorAuth = await testClient.post('/api/v1/auth/login', {
        email: 'donor@test.com',
        password: 'test-password'
      })

      const responsePlan = {
        assessmentId: testAssessmentId,
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        items: [
          {
            name: 'Test Item',
            unit: 'units',
            quantity: 1
          }
        ]
      }

      const response = await testClient.post('/api/v1/responses/planned', responsePlan, {
        headers: { Authorization: `Bearer ${donorAuth.data.token}` }
      })

      expect(response.status).toBe(403)
      expect(response.data).toMatchObject({
        success: false,
        error: expect.stringContaining('Insufficient permissions')
      })
    })
  })

  describe('GET /api/v1/responses/[id]', () => {
    let createdResponseId: string

    beforeEach(async () => {
      // Create a test response
      const createResponse = await testClient.post('/api/v1/responses/planned', {
        assessmentId: testAssessmentId,
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        items: [
          {
            name: 'Test Item',
            unit: 'units',
            quantity: 10
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      createdResponseId = createResponse.data.data.id
    })

    it('should retrieve a planned response successfully', async () => {
      const response = await testClient.get(`/api/v1/responses/${createdResponseId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: createdResponseId,
          assessmentId: testAssessmentId,
          type: 'HEALTH',
          priority: 'HIGH',
          status: 'PLANNED'
        })
      })
    })

    it('should reject non-existent response ID', async () => {
      const response = await testClient.get('/api/v1/responses/non-existent-id', {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(404)
      expect(response.data).toMatchObject({
        success: false,
        error: expect.stringContaining('Response not found')
      })
    })

    it('should reject unauthorized access', async () => {
      const response = await testClient.get(`/api/v1/responses/${createdResponseId}`)

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/v1/responses/[id]', () => {
    let createdResponseId: string

    beforeEach(async () => {
      // Create a test response
      const createResponse = await testClient.post('/api/v1/responses/planned', {
        assessmentId: testAssessmentId,
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        items: [
          {
            name: 'Test Item',
            unit: 'units',
            quantity: 10
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      createdResponseId = createResponse.data.data.id
    })

    it('should update a planned response successfully', async () => {
      const updateData = {
        priority: 'CRITICAL',
        description: 'Updated response plan',
        items: [
          {
            name: 'Updated Item',
            unit: 'kits',
            quantity: 20,
            category: 'Medical'
          }
        ]
      }

      const response = await testClient.put(`/api/v1/responses/${createdResponseId}`, updateData, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: createdResponseId,
          priority: 'CRITICAL',
          description: 'Updated response plan'
        })
      })
    })

    it('should reject updates to non-PLANNED responses', async () => {
      // First update response to DELIVERED status (this would be done via workflow)
      await testClient.put(`/api/v1/responses/${createdResponseId}/status`, {
        status: 'DELIVERED'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      const updateData = {
        priority: 'LOW',
        items: [
          {
            name: 'New Item',
            unit: 'units',
            quantity: 5
          }
        ]
      }

      const response = await testClient.put(`/api/v1/responses/${createdResponseId}`, updateData, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(400)
      expect(response.data).toMatchObject({
        success: false,
        error: expect.stringContaining('Only planned responses can be modified')
      })
    })

    it('should reject unauthorized updates', async () => {
      const updateData = {
        priority: 'LOW'
      }

      const response = await testClient.put(`/api/v1/responses/${createdResponseId}`, updateData)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/v1/responses/conflicts/[assessmentId]', () => {
    it('should return no conflicts for new assessment', async () => {
      const response = await testClient.get(`/api/v1/responses/conflicts/${testAssessmentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          hasConflict: false,
          conflictingResponses: []
        })
      })
    })

    it('should detect existing conflicts', async () => {
      // Create a response for the assessment
      await testClient.post('/api/v1/responses/planned', {
        assessmentId: testAssessmentId,
        entityId: testEntityId,
        type: 'HEALTH',
        priority: 'HIGH',
        items: [
          {
            name: 'Test Item',
            unit: 'units',
            quantity: 1
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      const response = await testClient.get(`/api/v1/responses/conflicts/${testAssessmentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        success: true,
        data: expect.objectContaining({
          hasConflict: true,
          conflictingResponses: expect.arrayContaining([
            expect.objectContaining({
              assessmentId: testAssessmentId
            })
          ])
        })
      })
    })
  })
})