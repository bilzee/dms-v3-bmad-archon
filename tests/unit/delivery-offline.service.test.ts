import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/globals'
import { deliveryOfflineService } from '@/lib/services/delivery-offline.service'
import { offlineDB } from '@/lib/db/offline'
import { ConfirmDeliveryInput } from '@/lib/validation/response'

// Mock offlineDB
vi.mock('@/lib/db/offline', () => ({
  offlineDB: {
    addDeliveryOfflineOperation: vi.fn(),
    addDeliveryConfirmation: vi.fn(),
    storeOfflineFile: vi.fn(),
    getDeliveryOfflineOperations: vi.fn(),
    updateDeliveryOfflineOperation: vi.fn(),
    getDeliveryConfirmation: vi.fn()
  }
}))

// Mock fetch
global.fetch = vi.fn()

describe('DeliveryOfflineService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', {
      onLine: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('storeDeliveryConfirmation', () => {
    const mockDeliveryData: ConfirmDeliveryInput = {
      deliveredItems: [
        { id: 'item-1', itemName: 'Blanket', quantity: 10, unit: 'pieces' }
      ],
      deliveryLocation: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10
      },
      deliveryNotes: 'Test delivery'
    }

    const mockResponseId = 'resp-123'
    const mockGPSLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      timestamp: new Date()
    }
    const mockMediaFiles = [
      {
        id: 'media-1',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        localPath: '/offline/test.jpg',
        metadata: { mimeType: 'image/jpeg' }
      }
    ]
    const mockResponderId = 'user-123'

    it('should store delivery confirmation online successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: mockResponseId,
          status: 'DELIVERED'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      } as Response)

      vi.mocked(offlineDB.addDeliveryConfirmation).mockResolvedValueOnce(1)
      vi.mocked(offlineDB.getDeliveryConfirmation).mockResolvedValueOnce(null)

      const result = await deliveryOfflineService.storeDeliveryConfirmation(
        mockDeliveryData,
        mockResponseId,
        mockGPSLocation,
        mockMediaFiles,
        mockResponderId
      )

      expect(result.success).toBe(true)
      expect(result.networkStatus).toBe('online')
      expect(fetch).toHaveBeenCalledWith(
        `/api/v1/responses/${mockResponseId}/deliver`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockDeliveryData)
        })
      )
    })

    it('should fallback to offline storage when online fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      vi.mocked(offlineDB.addDeliveryOfflineOperation).mockResolvedValueOnce(1)
      vi.mocked(offlineDB.addDeliveryConfirmation).mockResolvedValueOnce(1)

      const result = await deliveryOfflineService.storeDeliveryConfirmation(
        mockDeliveryData,
        mockResponseId,
        mockGPSLocation,
        mockMediaFiles,
        mockResponderId
      )

      expect(result.success).toBe(false)
      expect(result.networkStatus).toBe('offline')
      expect(offlineDB.addDeliveryOfflineOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'delivery_confirmation',
          action: 'create',
          responseId: mockResponseId,
          syncStatus: 'pending'
        })
      )
    })

    it('should handle GPS location validation', async () => {
      const invalidGPSLocation = {
        latitude: 91, // Invalid latitude
        longitude: -74.0060,
        accuracy: 10,
        timestamp: new Date()
      }

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      vi.mocked(offlineDB.addDeliveryOfflineOperation).mockResolvedValueOnce(1)

      const result = await deliveryOfflineService.storeDeliveryConfirmation(
        mockDeliveryData,
        mockResponseId,
        invalidGPSLocation,
        mockMediaFiles,
        mockResponderId
      )

      expect(result.success).toBe(false)
      expect(result.networkStatus).toBe('offline')
    })
  })

  describe('storeMediaFilesOffline', () => {
    const mockMediaFiles = [
      {
        file: new File(['test content'], 'test.jpg', { type: 'image/jpeg' }),
        metadata: { description: 'Test image' }
      }
    ]
    const mockResponseId = 'resp-123'
    const mockResponderId = 'user-123'

    it('should store media files successfully', async () => {
      vi.mocked(offlineDB.storeOfflineFile).mockResolvedValueOnce(1)

      const result = await deliveryOfflineService.storeMediaFilesOffline(
        mockMediaFiles,
        mockResponseId,
        mockResponderId
      )

      expect(result).toHaveLength(1)
      expect(result[0].success).toBe(true)
      expect(result[0].localPath).toContain('offline/delivery_media/')
    })

    it('should handle file storage errors', async () => {
      vi.mocked(offlineDB.storeOfflineFile).mockRejectedValueOnce(new Error('Storage error'))

      const result = await deliveryOfflineService.storeMediaFilesOffline(
        mockMediaFiles,
        mockResponseId,
        mockResponderId
      )

      expect(result).toHaveLength(1)
      expect(result[0].success).toBe(false)
      expect(result[0].localPath).toBe('')
    })
  })

  describe('getOfflineQueueStatus', () => {
    it('should return organized queue with proper sorting', async () => {
      const mockOperations = [
        {
          uuid: 'op-1',
          priority: 1,
          syncStatus: 'pending',
          lastAttempt: new Date('2024-01-15T10:00:00Z'),
          responseId: 'resp-1',
          type: 'delivery_confirmation',
          action: 'create',
          data: '',
          metadata: {},
          attempts: 0,
          timestamp: new Date()
        },
        {
          uuid: 'op-2',
          priority: 3,
          syncStatus: 'syncing',
          lastAttempt: new Date('2024-01-15T10:05:00Z'),
          responseId: 'resp-2',
          type: 'media_upload',
          action: 'create',
          data: '',
          metadata: {},
          attempts: 1,
          timestamp: new Date()
        }
      ]

      vi.mocked(offlineDB.getDeliveryOfflineOperations).mockResolvedValueOnce(mockOperations as any)

      const queue = await deliveryOfflineService.getOfflineQueueStatus()

      expect(queue.pending).toHaveLength(1)
      expect(queue.inProgress).toHaveLength(1)
      expect(queue.pending[0].priority).toBeLessThan(queue.inProgress[0].priority)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(offlineDB.getDeliveryOfflineOperations).mockRejectedValueOnce(new Error('DB error'))

      const queue = await deliveryOfflineService.getOfflineQueueStatus()

      expect(queue.pending).toEqual([])
      expect(queue.inProgress).toEqual([])
      expect(queue.completed).toEqual([])
      expect(queue.failed).toEqual([])
      expect(queue.cancelled).toEqual([])
    })
  })

  describe('syncPendingOperations', () => {
    it('should sync pending operations successfully', async () => {
      const mockOperation = {
        uuid: 'op-1',
        type: 'delivery_confirmation',
        action: 'create',
        responseId: 'resp-1',
        data: JSON.stringify({
          deliveredItems: [{ id: 'item-1', itemName: 'Blanket', quantity: 10 }],
          deliveryLocation: { latitude: 40.7128, longitude: -74.0060 }
        }),
        metadata: JSON.stringify({}),
        priority: 1,
        attempts: 0,
        syncStatus: 'pending',
        lastAttempt: new Date(),
        responseId: 'resp-1'
      }

      vi.mocked(offlineDB.getDeliveryOfflineOperations).mockResolvedValueOnce([mockOperation] as any)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({ success: true })
      } as Response)
      vi.mocked(offlineDB.updateDeliveryOfflineOperation).mockResolvedValueOnce(1)

      const results = await deliveryOfflineService.syncPendingOperations()

      expect(results.synced).toBe(1)
      expect(results.failed).toBe(0)
      expect(fetch).toHaveBeenCalled()
    })

    it('should handle operations with max attempts reached', async () => {
      const mockOperation = {
        uuid: 'op-1',
        type: 'delivery_confirmation',
        action: 'create',
        responseId: 'resp-1',
        attempts: 5, // Max attempts reached
        syncStatus: 'pending',
        lastAttempt: new Date(),
        priority: 1
      }

      vi.mocked(offlineDB.getDeliveryOfflineOperations).mockResolvedValueOnce([mockOperation] as any)

      const results = await deliveryOfflineService.syncPendingOperations()

      expect(results.skipped).toBe(1)
      expect(results.synced).toBe(0)
    })

    it('should handle sync failures with retry logic', async () => {
      const mockOperation = {
        uuid: 'op-1',
        type: 'delivery_confirmation',
        action: 'create',
        responseId: 'resp-1',
        attempts: 1,
        syncStatus: 'pending',
        lastAttempt: new Date(),
        priority: 1
      }

      vi.mocked(offlineDB.getDeliveryOfflineOperations).mockResolvedValueOnce([mockOperation] as any)
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      vi.mocked(offlineDB.updateDeliveryOfflineOperation).mockResolvedValueOnce(1)

      const results = await deliveryOfflineService.syncPendingOperations()

      expect(results.failed).toBe(1)
      expect(results.errors).toHaveLength(1)
      expect(results.errors[0].operationId).toBe('op-1')
    })
  })

  describe('getOfflineStats', () => {
    it('should calculate correct statistics', async () => {
      const mockQueue = {
        pending: [
          { uuid: 'op-1', lastAttempt: new Date('2024-01-15T10:00:00Z') }
        ],
        inProgress: [
          { uuid: 'op-2', lastAttempt: new Date('2024-01-15T10:05:00Z') }
        ],
        completed: [
          { uuid: 'op-3', lastAttempt: new Date('2024-01-15T09:00:00Z') }
        ],
        failed: [
          { uuid: 'op-4', attempts: 2, lastAttempt: new Date('2024-01-15T10:02:00Z') }
        ],
        cancelled: []
      }

      vi.spyOn(deliveryOfflineService, 'getOfflineQueueStatus').mockResolvedValueOnce(mockQueue as any)

      const stats = await deliveryOfflineService.getOfflineStats()

      expect(stats.totalOperations).toBe(4)
      expect(stats.pendingCount).toBe(1)
      expect(stats.inProgressCount).toBe(1)
      expect(stats.completedCount).toBe(1)
      expect(stats.failedCount).toBe(1)
      expect(stats.oldestPending).toBe(mockQueue.pending[0].lastAttempt)
    })
  })
})