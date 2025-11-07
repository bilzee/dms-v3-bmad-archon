import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { ResponseService } from '@/lib/services/response.service'
import { responseOfflineService } from '@/lib/services/response-offline.service'
import { offlineDB } from '@/lib/db/offline'
import { CreatePlannedResponseInput } from '@/lib/validation/response'

// Mock dependencies
jest.mock('@/lib/db/offline', () => ({
  offlineDB: {
    addResponse: jest.fn(),
    updateResponse: jest.fn(),
    getResponse: jest.fn(),
    responses: {
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      toArray: jest.fn()
    },
    addToSyncQueue: jest.fn(),
    removeSyncQueueItem: jest.fn(),
    updateSyncQueueItem: jest.fn(),
    getSyncQueue: jest.fn(),
    decryptData: jest.fn()
  }
}))

jest.mock('@/lib/services/response-client.service', () => ({
  responseService: {
    createPlannedResponse: jest.fn(),
    updatePlannedResponse: jest.fn(),
    getResponseById: jest.fn(),
    getPlannedResponsesForResponder: jest.fn(),
    checkAssessmentConflicts: jest.fn()
  }
}))

describe('Response Planning Service', () => {
  const mockUserId = 'user-123'
  const mockAssessmentId = 'assessment-123'
  const mockEntityId = 'entity-123'

  const validResponseData: CreatePlannedResponseInput = {
    assessmentId: mockAssessmentId,
    entityId: mockEntityId,
    type: 'HEALTH',
    priority: 'HIGH',
    description: 'Test response plan',
    items: [
      {
        name: 'Medical Supplies',
        unit: 'kits',
        quantity: 10,
        category: 'Medical'
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: jest.fn(() => 'mock-uuid-123'),
        subtle: {}
      },
      writable: true
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('ResponseService (Backend)', () => {
    it('should create a planned response successfully', async () => {
      const mockResponse = {
        id: 'response-123',
        ...validResponseData,
        status: 'PLANNED',
        createdAt: new Date().toISOString()
      }

      ;(responseService.createPlannedResponse as jest.Mock).mockResolvedValue(mockResponse)

      const result = await ResponseService.createPlannedResponse(
        validResponseData,
        mockUserId
      )

      expect(result).toEqual(mockResponse)
      expect(responseService.createPlannedResponse).toHaveBeenCalledWith(
        validResponseData,
        mockUserId
      )
    })

    it('should throw error for invalid assessment', async () => {
      const invalidData = {
        ...validResponseData,
        assessmentId: 'invalid-assessment'
      }

      ;(responseService.createPlannedResponse as jest.Mock).mockRejectedValue(
        new Error('Assessment not found')
      )

      await expect(
        ResponseService.createPlannedResponse(invalidData, mockUserId)
      ).rejects.toThrow('Assessment not found')
    })

    it('should validate response items', async () => {
      const invalidData = {
        ...validResponseData,
        items: [] // Empty items should fail validation
      }

      ;(responseService.createPlannedResponse as jest.Mock).mockRejectedValue(
        new Error('At least one item is required')
      )

      await expect(
        ResponseService.createPlannedResponse(invalidData, mockUserId)
      ).rejects.toThrow('At least one item is required')
    })
  })

  describe('ResponseOfflineService', () => {
    describe('Online Operations', () => {
      it('should create response online and cache it', async () => {
        const mockResponse = {
          id: 'response-123',
          ...validResponseData,
          status: 'PLANNED'
        }

        ;(responseService.createPlannedResponse as jest.Mock).mockResolvedValue(mockResponse)
        ;(offlineDB.addResponse as jest.Mock).mockResolvedValue(1)

        const result = await responseOfflineService.createPlannedResponse(validResponseData)

        expect(result).toEqual(mockResponse)
        expect(responseService.createPlannedResponse).toHaveBeenCalledWith(validResponseData)
        expect(offlineDB.addResponse).toHaveBeenCalledWith({
          uuid: 'response-123',
          responderId: undefined, // Will be set by caller
          assessmentId: mockAssessmentId,
          data: {
            ...validResponseData,
            ...mockResponse,
            syncStatus: 'synced'
          },
          syncStatus: 'synced'
        })
      })

      it('should update response online and cache it', async () => {
        const mockResponse = {
          id: 'response-123',
          description: 'Updated description'
        }

        ;(responseService.updatePlannedResponse as jest.Mock).mockResolvedValue(mockResponse)
        ;(offlineDB.updateResponse as jest.Mock).mockResolvedValue(1)

        const result = await responseOfflineService.updatePlannedResponse(
          'response-123',
          { description: 'Updated description' }
        )

        expect(result).toEqual(mockResponse)
        expect(responseService.updatePlannedResponse).toHaveBeenCalledWith(
          'response-123',
          { description: 'Updated description' }
        )
        expect(offlineDB.updateResponse).toHaveBeenCalledWith('response-123', {
          data: {
            description: 'Updated description',
            ...mockResponse,
            syncStatus: 'synced'
          },
          syncStatus: 'synced'
        })
      })

      it('should get response online and cache it', async () => {
        const mockResponse = {
          id: 'response-123',
          ...validResponseData
        }

        ;(responseService.getResponseById as jest.Mock).mockResolvedValue(mockResponse)
        ;(offlineDB.updateResponse as jest.Mock).mockResolvedValue(1)

        const result = await responseOfflineService.getResponseById('response-123')

        expect(result).toEqual(mockResponse)
        expect(responseService.getResponseById).toHaveBeenCalledWith('response-123')
        expect(offlineDB.updateResponse).toHaveBeenCalledWith('response-123', {
          data: { ...mockResponse, syncStatus: 'synced' },
          syncStatus: 'synced'
        })
      })
    })

    describe('Offline Fallback', () => {
      it('should create response offline when online fails', async () => {
        const onlineError = new Error('Network error')
        ;(responseService.createPlannedResponse as jest.Mock).mockRejectedValue(onlineError)
        ;(offlineDB.addResponse as jest.Mock).mockResolvedValue(1)
        ;(offlineDB.addToSyncQueue as jest.Mock).mockResolvedValue(1)

        const result = await responseOfflineService.createPlannedResponse(validResponseData)

        expect(result).toEqual({
          id: 'mock-uuid-123',
          ...validResponseData,
          status: 'PLANNED',
          createdAt: expect.any(String),
          syncStatus: 'pending'
        })

        expect(offlineDB.addResponse).toHaveBeenCalledWith({
          uuid: 'mock-uuid-123',
          responderId: undefined,
          assessmentId: mockAssessmentId,
          data: expect.objectContaining({
            ...validResponseData,
            id: 'mock-uuid-123',
            status: 'PLANNED',
            syncStatus: 'pending'
          }),
          syncStatus: 'pending'
        })

        expect(offlineDB.addToSyncQueue).toHaveBeenCalledWith({
          uuid: 'mock-uuid-123',
          type: 'response',
          action: 'create',
          entityUuid: 'mock-uuid-123',
          data: expect.any(Object),
          priority: 5,
          attempts: 0
        })
      })

      it('should update response offline when online fails', async () => {
        const onlineError = new Error('Network error')
        ;(responseService.updatePlannedResponse as jest.Mock).mockRejectedValue(onlineError)
        ;(offlineDB.updateResponse as jest.Mock).mockResolvedValue(1)
        ;(offlineDB.addToSyncQueue as jest.Mock).mockResolvedValue(1)

        const updateData = { description: 'Updated description' }
        const result = await responseOfflineService.updatePlannedResponse(
          'response-123',
          updateData
        )

        expect(result).toEqual({
          id: 'response-123',
          ...updateData,
          updatedAt: expect.any(String),
          syncStatus: 'pending'
        })

        expect(offlineDB.updateResponse).toHaveBeenCalledWith('response-123', {
          data: {
            id: 'response-123',
            ...updateData,
            updatedAt: expect.any(String),
            syncStatus: 'pending'
          },
          syncStatus: 'pending'
        })

        expect(offlineDB.addToSyncQueue).toHaveBeenCalledWith({
          uuid: 'mock-uuid-123',
          type: 'response',
          action: 'update',
          entityUuid: 'response-123',
          data: expect.any(Object),
          priority: 5,
          attempts: 0
        })
      })

      it('should get response from offline cache when online fails', async () => {
        const onlineError = new Error('Network error')
        const mockOfflineResponse = {
          uuid: 'response-123',
          decryptedData: {
            id: 'response-123',
            ...validResponseData,
            syncStatus: 'synced'
          }
        }

        ;(responseService.getResponseById as jest.Mock).mockRejectedValue(onlineError)
        ;(offlineDB.getResponse as jest.Mock).mockResolvedValue(mockOfflineResponse)

        const result = await responseOfflineService.getResponseById('response-123')

        expect(result).toEqual(mockOfflineResponse.decryptedData)
        expect(offlineDB.getResponse).toHaveBeenCalledWith('response-123')
      })
    })

    describe('Sync Operations', () => {
      it('should sync pending responses successfully', async () => {
        const mockPendingResponses = [
          {
            uuid: 'sync-1',
            type: 'response',
            action: 'create',
            entityUuid: 'response-123',
            decryptedData: { ...validResponseData },
            attempts: 0
          },
          {
            uuid: 'sync-2',
            type: 'response',
            action: 'update',
            entityUuid: 'response-456',
            decryptedData: { description: 'Updated' },
            attempts: 0
          }
        ]

        ;(offlineDB.getSyncQueue as jest.Mock).mockResolvedValue(mockPendingResponses)
        ;(responseService.createPlannedResponse as jest.Mock).mockResolvedValue({ id: 'response-123' })
        ;(responseService.updatePlannedResponse as jest.Mock).mockResolvedValue({ id: 'response-456' })
        ;(offlineDB.updateResponse as jest.Mock).mockResolvedValue(1)
        ;(offlineDB.removeSyncQueueItem as jest.Mock).mockResolvedValue()

        const result = await responseOfflineService.syncPendingResponses()

        expect(result).toEqual({
          success: 2,
          failed: 0,
          errors: []
        })

        expect(responseService.createPlannedResponse).toHaveBeenCalledTimes(1)
        expect(responseService.updatePlannedResponse).toHaveBeenCalledTimes(1)
        expect(offlineDB.removeSyncQueueItem).toHaveBeenCalledTimes(2)
      })

      it('should handle sync failures with retry logic', async () => {
        const mockPendingResponse = {
          uuid: 'sync-1',
          type: 'response',
          action: 'create',
          entityUuid: 'response-123',
          decryptedData: { ...validResponseData },
          attempts: 0
        }

        ;(offlineDB.getSyncQueue as jest.Mock).mockResolvedValue([mockPendingResponse])
        ;(responseService.createPlannedResponse as jest.Mock).mockRejectedValue(new Error('Server error'))
        ;(offlineDB.updateSyncQueueItem as jest.Mock).mockResolvedValue(1)

        const result = await responseOfflineService.syncPendingResponses()

        expect(result).toEqual({
          success: 0,
          failed: 1,
          errors: ['Failed to sync create for response response-123: Error: Server error']
        })

        expect(offlineDB.updateSyncQueueItem).toHaveBeenCalledWith('sync-1', {
          attempts: 1,
          lastAttempt: expect.any(Date),
          error: 'Server error',
          nextRetry: expect.any(Date)
        })
      })
    })

    describe('Conflict Checking', () => {
      it('should check conflicts online and fallback to offline', async () => {
        // Test online success
        const mockOnlineResult = {
          hasConflict: false,
          conflictingResponses: []
        }
        ;(responseService.checkAssessmentConflicts as jest.Mock).mockResolvedValue(mockOnlineResult)

        const result = await responseOfflineService.checkAssessmentConflicts(mockAssessmentId)
        expect(result).toEqual(mockOnlineResult)

        // Test online failure with offline fallback
        const onlineError = new Error('Network error')
        ;(responseService.checkAssessmentConflicts as jest.Mock).mockRejectedValue(onlineError)
        
        const mockOfflineResponses = [
          { uuid: 'response-1' },
          { uuid: 'response-2' }
        ]

        const mockWhere = {
          where: jest.fn().mockReturnThis(),
          equals: jest.fn().mockReturnThis(),
          and: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(mockOfflineResponses)
        }

        ;(offlineDB.responses.where as jest.Mock).mockReturnValue(mockWhere)

        const fallbackResult = await responseOfflineService.checkAssessmentConflicts(mockAssessmentId)
        
        expect(fallbackResult).toEqual({
          hasConflict: true,
          conflictingResponses: ['response-1', 'response-2'],
          message: '2 existing response(s) found for this assessment'
        })
      })
    })
  })
})