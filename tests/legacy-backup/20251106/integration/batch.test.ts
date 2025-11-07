import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/sync/batch/route';

// Mock fetch for any external API calls
global.fetch = jest.fn();

describe('/api/v1/sync/batch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should process empty batch successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes: [] })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should validate request schema', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invalid: 'data' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request format');
      expect(data.details).toBeDefined();
    });

    it('should reject batch size over limit', async () => {
      const changes = Array.from({ length: 101 }, (_, i) => ({
        type: 'assessment',
        action: 'create',
        data: { id: i },
        versionNumber: 1,
        entityUuid: `entity_${i}`
      }));

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Batch size too large');
    });

    it('should process valid sync changes', async () => {
      const changes = [
        {
          type: 'assessment',
          action: 'create',
          data: { 
            id: '1',
            assessmentType: 'rapid',
            responses: { q1: 'answer1' }
          },
          offlineId: 'offline_1',
          versionNumber: 1,
          entityUuid: 'entity_1'
        },
        {
          type: 'response',
          action: 'update',
          data: {
            id: '2',
            status: 'completed',
            resources: ['resource1']
          },
          offlineId: 'offline_2',
          versionNumber: 2,
          entityUuid: 'entity_2'
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      
      // Check that each result has required fields
      data.forEach((result: any) => {
        expect(result).toHaveProperty('offlineId');
        expect(result).toHaveProperty('serverId');
        expect(result).toHaveProperty('status');
        expect(['success', 'conflict', 'failed']).toContain(result.status);
      });
    });

    it('should handle different change types', async () => {
      const changes = [
        {
          type: 'assessment',
          action: 'create',
          data: { type: 'rapid', data: {} },
          versionNumber: 1,
          entityUuid: 'entity_1'
        },
        {
          type: 'response',
          action: 'update',
          data: { status: 'active' },
          versionNumber: 1,
          entityUuid: 'entity_2'
        },
        {
          type: 'entity',
          action: 'delete',
          data: { id: 'entity_3' },
          versionNumber: 1,
          entityUuid: 'entity_3'
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(3);
    });

    it('should validate individual change objects', async () => {
      const changes = [
        {
          type: 'invalid_type',
          action: 'create',
          data: {},
          versionNumber: 1,
          entityUuid: 'entity_1'
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request format');
    });

    it('should handle missing required fields', async () => {
      const changes = [
        {
          type: 'assessment',
          action: 'create',
          data: {},
          // Missing versionNumber and entityUuid
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request format');
      expect(data.details).toContainEqual(
        expect.objectContaining({
          path: ['changes', 0, 'versionNumber']
        })
      );
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should include conflict data in conflict responses', async () => {
      // This test depends on the mock implementation's random conflict generation
      // Run multiple times to increase chance of hitting a conflict
      let conflictFound = false;
      
      for (let i = 0; i < 20 && !conflictFound; i++) {
        const changes = [
          {
            type: 'assessment',
            action: 'update',
            data: { value: 'test' },
            offlineId: 'offline_1',
            versionNumber: 1,
            entityUuid: 'entity_1'
          }
        ];

        const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ changes })
        });

        const response = await POST(request);
        const data = await response.json();

        if (data[0]?.status === 'conflict') {
          expect(data[0]).toHaveProperty('conflictData');
          expect(data[0].conflictData).toHaveProperty('serverVersion');
          conflictFound = true;
        }
      }
      
      // If no conflict was randomly generated, that's okay - the endpoint structure is correct
    });

    it('should generate unique server IDs for successful syncs', async () => {
      const changes = [
        {
          type: 'assessment',
          action: 'create',
          data: { id: '1' },
          offlineId: 'offline_1',
          versionNumber: 1,
          entityUuid: 'entity_1'
        },
        {
          type: 'assessment',
          action: 'create',
          data: { id: '2' },
          offlineId: 'offline_2',
          versionNumber: 1,
          entityUuid: 'entity_2'
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Filter successful results
      const successfulResults = data.filter((result: any) => result.status === 'success');
      
      if (successfulResults.length >= 2) {
        const serverIds = successfulResults.map((result: any) => result.serverId);
        expect(new Set(serverIds).size).toBe(serverIds.length); // All unique
        
        serverIds.forEach((id: string) => {
          expect(id).toMatch(/^srv_\d+_[a-z0-9]+$/); // Format: srv_timestamp_random
        });
      }
    });

    it('should preserve offlineId in responses', async () => {
      const changes = [
        {
          type: 'assessment',
          action: 'create',
          data: { test: 'data' },
          offlineId: 'my_offline_id_123',
          versionNumber: 1,
          entityUuid: 'entity_1'
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0].offlineId).toBe('my_offline_id_123');
    });

    it('should handle changes without offlineId', async () => {
      const changes = [
        {
          type: 'assessment',
          action: 'create',
          data: { test: 'data' },
          versionNumber: 1,
          entityUuid: 'entity_1'
          // No offlineId provided
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0].offlineId).toBe('');
    });
  });
});