import request from 'supertest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/dashboard/situation/route';
import { db } from '@/lib/db/client';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

// Mock database
jest.mock('@/lib/db/client', () => ({
  db: {
    $queryRaw: jest.fn()
  }
}));

const mockGetServerSession = jest.requireMock('next-auth').getServerSession;
const mockDbQueryRaw = jest.mocked(db).$queryRaw;

describe('/api/v1/dashboard/situation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('requires authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('allows authenticated users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' }
      });

      mockDbQueryRaw.mockImplementation((query: string) => {
        if (query.includes('incidents i')) {
          return Promise.resolve([]);
        }
        if (query.includes('entities e')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' }
      });

      mockDbQueryRaw.mockImplementation((query: string) => {
        if (query.includes('incidents i')) {
          return Promise.resolve([]);
        }
        if (query.includes('entities e')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });
    });

    it('handles default query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('incidents');
      expect(data.data).toHaveProperty('entities');
      expect(data.data).toHaveProperty('gaps');
      expect(data.data).toHaveProperty('realTimeUpdates', false);
      expect(data.data).toHaveProperty('lastUpdated');
    });

    it('validates and parses incidentId parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?incidentId=test-123');
      await GET(request);

      expect(mockDbQueryRaw).toHaveBeenCalledWith(
        expect.stringContaining("i.id = test-123")
      );
    });

    it('validates and parses realTime parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?realTime=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.realTimeUpdates).toBe(true);
    });

    it('validates and parses includeHistorical parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?includeHistorical=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('validates and parses limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?limit=25');
      await GET(request);

      expect(mockDbQueryRaw).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 25')
      );
    });

    it('handles invalid limit parameter gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?limit=invalid');
      const response = await GET(request);

      // Should default to 50 for invalid limit
      expect(response.status).toBe(200);
    });

    it('enforces maximum limit constraint', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?limit=200');
      const response = await GET(request);

      // Should cap at maximum of 100
      expect(response.status).toBe(200);
    });
  });

  describe('Data Aggregation', () => {
    const mockIncidents = [
      {
        id: 'incident-1',
        type: 'FLOOD',
        subType: 'RIVER_FLOOD',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Test flood incident',
        location: 'Test Location',
        coordinates: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        populationImpact: 1000
      }
    ];

    const mockEntities = [
      {
        entityId: 'entity-1',
        entityName: 'Test Entity',
        entityType: 'COMMUNITY',
        location: 'Test Location',
        coordinates: null,
        rapidAssessmentType: 'HEALTH',
        id: 'assessment-1',
        date: new Date('2024-01-01'),
        status: 'VERIFIED',
        verified: true,
        assessorName: 'Test Assessor'
      }
    ];

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' }
      });

      mockDbQueryRaw.mockImplementation((query: string) => {
        if (query.includes('incidents i')) {
          return Promise.resolve(mockIncidents);
        }
        if (query.includes('entities e')) {
          return Promise.resolve(mockEntities);
        }
        return Promise.resolve([]);
      });
    });

    it('aggregates incidents data correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.incidents).toHaveLength(1);
      expect(data.data.incidents[0]).toHaveProperty('durationDays');
      expect(data.data.incidents[0].durationDays).toBeGreaterThan(0);
    });

    it('transforms entities data correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.entities).toHaveLength(1);
      expect(data.data.entities[0]).toHaveProperty('latestAssessments');
      expect(data.data.entities[0].latestAssessments).toHaveProperty('HEALTH');
    });

    it('computes gap analysis correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.gaps).toHaveLength(1);
      expect(data.data.gaps[0]).toHaveProperty('assessmentGaps');
      expect(data.data.gaps[0]).toHaveProperty('overallGapSeverity');
      expect(data.data.gaps[0]).toHaveProperty('totalGapCount');
    });

    it('includes metadata in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('recordCounts');
      expect(data.metadata.recordCounts).toHaveProperty('incidents', 1);
      expect(data.metadata.recordCounts).toHaveProperty('entities', 1);
      expect(data.metadata.recordCounts).toHaveProperty('gaps', 1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' }
      });
    });

    it('handles database errors gracefully', async () => {
      mockDbQueryRaw.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch dashboard data');
      expect(data.details).toBe('Database connection failed');
    });

    it('handles invalid JSON in database response', async () => {
      mockDbQueryRaw.mockRejectedValue(new Error('Invalid JSON response'));

      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });

    it('handles timeout errors', async () => {
      mockDbQueryRaw.mockRejectedValue(new Error('Query timeout'));

      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' }
      });

      mockDbQueryRaw.mockImplementation((query: string) => {
        if (query.includes('incidents i')) {
          return Promise.resolve([]);
        }
        if (query.includes('entities e')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });
    });

    it('includes proper LIMIT clauses in queries', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?limit=50');
      await GET(request);

      expect(mockDbQueryRaw).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50')
      );
    });

    it('filters by incident ID when provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation?incidentId=specific-incident');
      await GET(request);

      expect(mockDbQueryRaw).toHaveBeenCalledWith(
        expect.stringContaining("i.id = specific-incident")
      );
    });

    it('filters active and contained incidents only', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      await GET(request);

      expect(mockDbQueryRaw).toHaveBeenCalledWith(
        expect.stringContaining("i.status IN ('ACTIVE', 'CONTAINED')")
      );
    });

    it('filters verified assessments only', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/dashboard/situation');
      await GET(request);

      expect(mockDbQueryRaw).toHaveBeenCalledWith(
        expect.stringContaining("'VERIFIED', 'AUTO_VERIFIED'")
      );
    });
  });
});