import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/sync/conflicts/route';
import { conflictResolver } from '@/lib/sync/conflict';

// Integration test that tests the full API flow
describe('Crisis Dashboard Conflict Integration', () => {
  beforeEach(() => {
    // Clear any stored conflicts before each test
    localStorage.clear();
  });

  it('should handle full conflict lifecycle', async () => {
    // Step 1: Create mock conflicts in the conflict resolver
    const testConflicts = [
      {
        conflictId: 'integration-test-1',
        entityType: 'assessment' as const,
        entityUuid: 'test-entity-1',
        localVersion: 1,
        serverVersion: 2,
        localData: {
          assessorId: 'assessor-1',
          formData: { question1: 'local answer' },
          lastModified: new Date('2025-01-01T09:00:00.000Z'),
        },
        serverData: {
          assessorId: 'assessor-1',
          formData: { question1: 'server answer' },
          lastModified: new Date('2025-01-01T10:00:00.000Z'),
        },
        resolutionStrategy: 'last_write_wins' as const,
        isResolved: false,
        createdAt: new Date('2025-01-01T10:01:00.000Z'),
        metadata: {
          localLastModified: new Date('2025-01-01T09:00:00.000Z'),
          serverLastModified: new Date('2025-01-01T10:00:00.000Z'),
          conflictReason: 'Data modified on both client and server',
          autoResolved: false
        }
      },
      {
        conflictId: 'integration-test-2',
        entityType: 'response' as const,
        entityUuid: 'test-entity-2',
        localVersion: 3,
        serverVersion: 3,
        localData: {
          responderTeam: 'Team A',
          status: 'in_progress',
          lastModified: new Date('2025-01-01T11:00:00.000Z'),
        },
        serverData: {
          responderTeam: 'Team B',
          status: 'completed',
          lastModified: new Date('2025-01-01T11:30:00.000Z'),
        },
        resolutionStrategy: 'last_write_wins' as const,
        isResolved: true,
        resolvedData: {
          responderTeam: 'Team B',
          status: 'completed',
          lastModified: new Date('2025-01-01T11:30:00.000Z'),
        },
        createdAt: new Date('2025-01-01T11:31:00.000Z'),
        resolvedAt: new Date('2025-01-01T11:32:00.000Z'),
        resolvedBy: 'system',
        metadata: {
          localLastModified: new Date('2025-01-01T11:00:00.000Z'),
          serverLastModified: new Date('2025-01-01T11:30:00.000Z'),
          conflictReason: 'Concurrent updates to response status',
          autoResolved: true
        }
      }
    ];

    // Mock the conflict resolver to return our test data
    jest.spyOn(conflictResolver, 'getConflictHistory').mockResolvedValue(testConflicts);

    // Step 2: Test API endpoint retrieval
    const request = new NextRequest('http://localhost:3000/api/v1/sync/conflicts');
    const response = await GET(request);
    const data = await response.json();

    // Verify API response structure
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    });

    // Step 3: Verify conflict data transformation
    const conflicts = data.data;
    
    // Check first conflict (unresolved)
    expect(conflicts[0]).toMatchObject({
      id: 'integration-test-1',
      entityType: 'ASSESSMENT',
      entityId: 'test-entity-1',
      resolutionMethod: 'LAST_WRITE_WINS',
      isResolved: false,
      localVersion: 1,
      serverVersion: 2
    });

    // Check second conflict (resolved)
    expect(conflicts[1]).toMatchObject({
      id: 'integration-test-2',
      entityType: 'RESPONSE',
      entityId: 'test-entity-2',
      resolutionMethod: 'LAST_WRITE_WINS',
      isResolved: true,
      resolvedBy: 'system'
    });

    // Step 4: Test filtering functionality
    const filteredRequest = new NextRequest('http://localhost:3000/api/v1/sync/conflicts?entityType=assessment&resolved=false');
    const filteredResponse = await GET(filteredRequest);
    const filteredData = await filteredResponse.json();

    expect(filteredResponse.status).toBe(200);
    expect(filteredData.data).toHaveLength(1);
    expect(filteredData.data[0].entityType).toBe('ASSESSMENT');
    expect(filteredData.data[0].isResolved).toBe(false);

    // Step 5: Test pagination with large dataset
    const largeDataset = Array.from({ length: 25 }, (_, i) => ({
      conflictId: `bulk-conflict-${i}`,
      entityType: 'entity' as const,
      entityUuid: `entity-${i}`,
      localVersion: 1,
      serverVersion: 2,
      localData: { id: i, source: 'local' },
      serverData: { id: i, source: 'server' },
      resolutionStrategy: 'last_write_wins' as const,
      isResolved: i % 2 === 0, // Alternate resolved/unresolved
      createdAt: new Date(Date.now() - i * 60000), // Spread over time
      resolvedAt: i % 2 === 0 ? new Date(Date.now() - i * 60000 + 30000) : undefined,
      metadata: {
        localLastModified: new Date(Date.now() - i * 60000 - 10000),
        serverLastModified: new Date(Date.now() - i * 60000),
        conflictReason: `Bulk test conflict ${i}`,
        autoResolved: i % 2 === 0
      }
    }));

    jest.spyOn(conflictResolver, 'getConflictHistory').mockResolvedValue(largeDataset);

    const paginatedRequest = new NextRequest('http://localhost:3000/api/v1/sync/conflicts?page=2&limit=10');
    const paginatedResponse = await GET(paginatedRequest);
    const paginatedData = await paginatedResponse.json();

    expect(paginatedResponse.status).toBe(200);
    expect(paginatedData.data).toHaveLength(10);
    expect(paginatedData.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true
    });
  });

  it('should handle empty conflict state', async () => {
    // Mock empty conflict history
    jest.spyOn(conflictResolver, 'getConflictHistory').mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/v1/sync/conflicts');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.totalPages).toBe(0);
  });

  it('should handle date range filtering', async () => {
    const conflictsWithDates = [
      {
        conflictId: 'old-conflict',
        entityType: 'assessment' as const,
        entityUuid: 'entity-old',
        localVersion: 1,
        serverVersion: 2,
        localData: {},
        serverData: {},
        resolutionStrategy: 'last_write_wins' as const,
        isResolved: true,
        createdAt: new Date('2024-12-01T10:00:00.000Z'),
        resolvedAt: new Date('2024-12-01T10:01:00.000Z'),
        metadata: {
          localLastModified: new Date('2024-12-01T09:59:00.000Z'),
          serverLastModified: new Date('2024-12-01T10:00:00.000Z'),
          conflictReason: 'Old conflict',
          autoResolved: true
        }
      },
      {
        conflictId: 'new-conflict',
        entityType: 'response' as const,
        entityUuid: 'entity-new',
        localVersion: 1,
        serverVersion: 2,
        localData: {},
        serverData: {},
        resolutionStrategy: 'last_write_wins' as const,
        isResolved: false,
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
        metadata: {
          localLastModified: new Date('2025-01-15T09:59:00.000Z'),
          serverLastModified: new Date('2025-01-15T10:00:00.000Z'),
          conflictReason: 'New conflict',
          autoResolved: false
        }
      }
    ];

    jest.spyOn(conflictResolver, 'getConflictHistory').mockResolvedValue(conflictsWithDates);

    // Test date range filtering
    const dateFilterRequest = new NextRequest('http://localhost:3000/api/v1/sync/conflicts?dateFrom=2025-01-01&dateTo=2025-01-31');
    const dateFilterResponse = await GET(dateFilterRequest);
    const dateFilterData = await dateFilterResponse.json();

    expect(dateFilterResponse.status).toBe(200);
    expect(dateFilterData.data).toHaveLength(1);
    expect(dateFilterData.data[0].id).toBe('new-conflict');
  });

  it('should handle concurrent API requests', async () => {
    const testConflicts = [
      {
        conflictId: 'concurrent-test',
        entityType: 'entity' as const,
        entityUuid: 'concurrent-entity',
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
          conflictReason: 'Concurrent test',
          autoResolved: true
        }
      }
    ];

    jest.spyOn(conflictResolver, 'getConflictHistory').mockResolvedValue(testConflicts);

    // Make multiple concurrent requests
    const requests = Array.from({ length: 5 }, () => 
      GET(new NextRequest('http://localhost:3000/api/v1/sync/conflicts'))
    );

    const responses = await Promise.all(requests);
    const dataArrays = await Promise.all(responses.map(r => r.json()));

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // All should return the same data
    dataArrays.forEach(data => {
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe('concurrent-test');
    });
  });

  it('should handle malformed query parameters gracefully', async () => {
    jest.spyOn(conflictResolver, 'getConflictHistory').mockResolvedValue([]);

    // Test with malformed parameters
    const malformedRequest = new NextRequest('http://localhost:3000/api/v1/sync/conflicts?page=invalid&limit=not-a-number&resolved=maybe');
    const response = await GET(malformedRequest);
    const data = await response.json();

    // Should still succeed with default values
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pagination.page).toBe(1); // Default page
    expect(data.pagination.limit).toBe(20); // Default limit
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});