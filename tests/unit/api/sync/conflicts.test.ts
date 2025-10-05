import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/sync/conflicts/route';
import { GET as ExportGET } from '@/app/api/v1/sync/conflicts/export/route';
import { GET as SummaryGET } from '@/app/api/v1/sync/conflicts/summary/route';
import { conflictResolver } from '@/lib/sync/conflict';

// Mock the conflict resolver
jest.mock('@/lib/sync/conflict', () => ({
  conflictResolver: {
    getConflictHistory: jest.fn(),
    getConflictStats: jest.fn(),
  },
}));

const mockConflictResolver = conflictResolver as jest.Mocked<typeof conflictResolver>;

// Helper function to create mock request
const createMockRequest = (url: string): NextRequest => {
  return new NextRequest(url);
};

describe('/api/v1/sync/conflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/sync/conflicts', () => {
    it('should return paginated conflicts with default parameters', async () => {
      const mockConflicts = [
        {
          conflictId: 'test-conflict-1',
          entityType: 'assessment' as const,
          entityUuid: 'entity-1',
          localVersion: 1,
          serverVersion: 2,
          localData: { data: 'local' },
          serverData: { data: 'server' },
          resolutionStrategy: 'last_write_wins' as const,
          isResolved: true,
          createdAt: new Date('2025-01-01'),
          resolvedAt: new Date('2025-01-01'),
          resolvedBy: 'system',
          metadata: {
            localLastModified: new Date('2025-01-01'),
            serverLastModified: new Date('2025-01-01'),
            conflictReason: 'Version mismatch',
            autoResolved: true
          }
        }
      ];

      mockConflictResolver.getConflictHistory.mockResolvedValue(mockConflicts);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should filter conflicts by entity type', async () => {
      const mockConflicts = [
        {
          conflictId: 'test-conflict-1',
          entityType: 'assessment' as const,
          entityUuid: 'entity-1',
          localVersion: 1,
          serverVersion: 2,
          localData: {},
          serverData: {},
          resolutionStrategy: 'last_write_wins' as const,
          isResolved: false,
          createdAt: new Date(),
          metadata: {
            localLastModified: new Date(),
            serverLastModified: new Date(),
            conflictReason: 'Test conflict',
            autoResolved: false
          }
        }
      ];

      mockConflictResolver.getConflictHistory.mockResolvedValue(mockConflicts);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts?entityType=assessment');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].entityType).toBe('ASSESSMENT');
    });

    it('should filter conflicts by resolution status', async () => {
      const mockConflicts = [
        {
          conflictId: 'resolved-conflict',
          entityType: 'response' as const,
          entityUuid: 'entity-1',
          localVersion: 1,
          serverVersion: 2,
          localData: {},
          serverData: {},
          resolutionStrategy: 'last_write_wins' as const,
          isResolved: true,
          createdAt: new Date(),
          resolvedAt: new Date(),
          metadata: {
            localLastModified: new Date(),
            serverLastModified: new Date(),
            conflictReason: 'Test conflict',
            autoResolved: true
          }
        }
      ];

      mockConflictResolver.getConflictHistory.mockResolvedValue(mockConflicts);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts?resolved=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].isResolved).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const mockConflicts = Array.from({ length: 25 }, (_, i) => ({
        conflictId: `conflict-${i}`,
        entityType: 'entity' as const,
        entityUuid: `entity-${i}`,
        localVersion: 1,
        serverVersion: 2,
        localData: {},
        serverData: {},
        resolutionStrategy: 'last_write_wins' as const,
        isResolved: false,
        createdAt: new Date(),
        metadata: {
          localLastModified: new Date(),
          serverLastModified: new Date(),
          conflictReason: `Test conflict ${i}`,
          autoResolved: false
        }
      }));

      mockConflictResolver.getConflictHistory.mockResolvedValue(mockConflicts);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts?page=2&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(10);
      expect(data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should handle errors gracefully', async () => {
      mockConflictResolver.getConflictHistory.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to retrieve conflicts');
      expect(data.message).toBe('Database error');
    });
  });

  describe('GET /api/v1/sync/conflicts/export', () => {
    it('should export conflicts as CSV', async () => {
      const mockConflicts = [
        {
          conflictId: 'test-conflict-1',
          entityType: 'assessment' as const,
          entityUuid: 'entity-1',
          localVersion: 1,
          serverVersion: 2,
          localData: {},
          serverData: {},
          resolutionStrategy: 'last_write_wins' as const,
          isResolved: true,
          createdAt: new Date('2025-01-01T10:00:00.000Z'),
          resolvedAt: new Date('2025-01-01T10:01:00.000Z'),
          resolvedBy: 'system',
          metadata: {
            localLastModified: new Date('2025-01-01T09:59:00.000Z'),
            serverLastModified: new Date('2025-01-01T10:00:00.000Z'),
            conflictReason: 'Version mismatch',
            autoResolved: true
          }
        }
      ];

      mockConflictResolver.getConflictHistory.mockResolvedValue(mockConflicts);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts/export');
      const response = await ExportGET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('conflict-report-');

      const csvContent = await response.text();
      expect(csvContent).toContain('Conflict ID,Entity Type,Entity ID');
      expect(csvContent).toContain('test-conflict-1,ASSESSMENT,entity-1');
    });

    it('should apply filters to export', async () => {
      const mockConflicts = [
        {
          conflictId: 'assessment-conflict',
          entityType: 'assessment' as const,
          entityUuid: 'entity-1',
          localVersion: 1,
          serverVersion: 2,
          localData: {},
          serverData: {},
          resolutionStrategy: 'last_write_wins' as const,
          isResolved: true,
          createdAt: new Date(),
          resolvedAt: new Date(),
          metadata: {
            localLastModified: new Date(),
            serverLastModified: new Date(),
            conflictReason: 'Test conflict',
            autoResolved: true
          }
        }
      ];

      mockConflictResolver.getConflictHistory.mockResolvedValue(mockConflicts);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts/export?entityType=assessment&resolved=true');
      const response = await ExportGET(request);

      expect(response.status).toBe(200);
      
      const csvContent = await response.text();
      expect(csvContent).toContain('assessment-conflict,ASSESSMENT');
    });

    it('should handle export errors', async () => {
      mockConflictResolver.getConflictHistory.mockRejectedValue(new Error('Export failed'));

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts/export');
      const response = await ExportGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to export conflicts');
    });
  });

  describe('GET /api/v1/sync/conflicts/summary', () => {
    it('should return conflict summary statistics', async () => {
      const mockStats = {
        total: 10,
        unresolved: 2,
        autoResolved: 7,
        manuallyResolved: 1,
        byType: {
          assessment: 5,
          response: 3,
          entity: 2
        },
        recentConflicts: [
          {
            conflictId: 'recent-conflict',
            entityType: 'assessment' as const,
            entityUuid: 'entity-1',
            localVersion: 1,
            serverVersion: 2,
            localData: {},
            serverData: {},
            resolutionStrategy: 'last_write_wins' as const,
            isResolved: false,
            createdAt: new Date(),
            metadata: {
              localLastModified: new Date(),
              serverLastModified: new Date(),
              conflictReason: 'Recent conflict',
              autoResolved: false
            }
          }
        ]
      };

      mockConflictResolver.getConflictStats.mockResolvedValue(mockStats);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts/summary');
      const response = await SummaryGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        totalConflicts: 10,
        unresolvedConflicts: 2,
        autoResolvedConflicts: 7,
        manuallyResolvedConflicts: 1,
        resolutionRate: 80,
        conflictsByType: {
          assessment: 5,
          response: 3,
          entity: 2
        },
        recentConflicts: [
          {
            id: 'recent-conflict',
            entityType: 'assessment',
            entityId: 'entity-1',
            conflictDate: mockStats.recentConflicts[0].createdAt,
            isResolved: false,
            resolutionMethod: 'LAST_WRITE_WINS',
            autoResolved: false
          }
        ],
        lastUpdated: expect.any(String)
      });
    });

    it('should handle zero conflicts', async () => {
      const mockStats = {
        total: 0,
        unresolved: 0,
        autoResolved: 0,
        manuallyResolved: 0,
        byType: {
          assessment: 0,
          response: 0,
          entity: 0
        },
        recentConflicts: []
      };

      mockConflictResolver.getConflictStats.mockResolvedValue(mockStats);

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts/summary');
      const response = await SummaryGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.resolutionRate).toBe(0);
      expect(data.data.recentConflicts).toEqual([]);
    });

    it('should handle summary errors', async () => {
      mockConflictResolver.getConflictStats.mockRejectedValue(new Error('Stats error'));

      const request = createMockRequest('http://localhost:3000/api/v1/sync/conflicts/summary');
      const response = await SummaryGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to retrieve conflict summary');
    });
  });
});