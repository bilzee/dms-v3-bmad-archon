import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';

// Mock authentication
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock database client
jest.mock('@/lib/db/client', () => ({
  db: {
    raw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

// Mock console to avoid noise in tests
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

import { getServerSession } from 'next-auth';

describe('Dashboard API - Entity Locations Enhancement', () => {
  let testUser: any;
  let testIncident: any;
  let testEntities: any[];
  let testDonorCommitments: any[];

  beforeAll(async () => {
    // Setup test data
    testUser = {
      id: 'test-coordinator',
      email: 'coordinator@test.com',
      role: 'COORDINATOR'
    };

    testIncident = {
      id: 'incident-1',
      type: 'FLOOD',
      subType: 'FLASH_FLOOD',
      severity: 'HIGH',
      status: 'ACTIVE',
      description: 'Test flood incident',
      location: 'Test Location',
      coordinates: { lat: 9.0820, lng: 8.6753 },
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01')
    };

    testEntities = [
      {
        id: 'entity-1',
        name: 'Test Hospital',
        type: 'FACILITY',
        location: 'Test Location 1',
        coordinates: { latitude: 9.0820, longitude: 8.6753 },
        isActive: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      },
      {
        id: 'entity-2',
        name: 'Test Shelter',
        type: 'SHELTER',
        location: 'Test Location 2',
        coordinates: { latitude: 9.0, longitude: 8.5 },
        isActive: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      }
    ];

    testDonorCommitments = [
      {
        donorId: 'donor-1',
        donorName: 'Red Cross',
        entityId: 'entity-1',
        incidentId: 'incident-1',
        status: 'FULFILLED',
        items: {
          name: 'Medical Supplies',
          quantity: 100,
          unit: 'units'
        }
      }
    ];
  });

  beforeEach(async () => {
    // Mock authenticated user
    const mockGetServerSession = getServerSession as jest.Mock;
    mockGetServerSession.mockResolvedValue({
      user: testUser
    });

    // Clear all mock calls
    jest.clearAllMocks();
  });

  describe('GET /api/v1/dashboard/situation with entity locations', () => {
    it('handles request with entity locations enabled', async () => {
      // Mock database responses
      const mockDb = db as any;
      
      // Mock incidents query
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      
      // Mock entities query
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      
      // Mock gap analysis query
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      
      // Mock entity locations query
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'entity-1',
          name: 'Test Hospital',
          type: 'FACILITY',
          coordinates: { latitude: 9.0820, longitude: 8.6753 },
          severity: 'CRITICAL',
          gapSummary: {
            totalGaps: 2,
            totalNoGaps: 1,
            criticalGaps: 1,
            severity: 'CRITICAL'
          }
        },
        {
          id: 'entity-2',
          name: 'Test Shelter',
          type: 'SHELTER',
          coordinates: { latitude: 9.0, longitude: 8.5 },
          severity: 'HIGH',
          gapSummary: {
            totalGaps: 1,
            totalNoGaps: 2,
            criticalGaps: 0,
            severity: 'HIGH'
          }
        }
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Import the route handler
      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.entityLocations).toBeDefined();
      expect(data.data.entityLocations.entities).toHaveLength(2);
      expect(data.data.entityLocations.entities[0]).toMatchObject({
        id: 'entity-1',
        name: 'Test Hospital',
        type: 'FACILITY',
        severity: 'CRITICAL'
      });
      expect(data.data.entityLocations.entities[0].coordinates).toEqual({
        latitude: 9.0820,
        longitude: 8.6753
      });
    });

    it('handles request with donor assignments enabled', async () => {
      const mockDb = db as any;
      
      // Mock basic queries
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]); // incidents
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities); // entities
      mockDb.$queryRaw.mockResolvedValueOnce([]); // gaps
      
      // Mock entity locations with donor assignments
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'entity-1',
          name: 'Test Hospital',
          type: 'FACILITY',
          coordinates: { latitude: 9.0820, longitude: 8.6753 },
          severity: 'CRITICAL',
          gapSummary: {
            totalGaps: 2,
            totalNoGaps: 1,
            criticalGaps: 1,
            severity: 'CRITICAL'
          }
        }
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&includeDonorAssignments=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.entityLocationsEnabled).toBe(true);
      expect(data.metadata.donorAssignmentsEnabled).toBe(true);
    });

    it('filters entities by severity', async () => {
      const mockDb = db as any;
      
      // Mock basic queries
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      
      // Mock filtered entity locations
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'entity-1',
          name: 'Test Hospital',
          type: 'FACILITY',
          coordinates: { latitude: 9.0820, longitude: 8.6753 },
          severity: 'CRITICAL',
          gapSummary: {
            totalGaps: 2,
            totalNoGaps: 1,
            criticalGaps: 1,
            severity: 'CRITICAL'
          }
        }
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&severityFilter=CRITICAL',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.entityLocations.entities).toHaveLength(1);
      expect(data.data.entityLocations.entities[0].severity).toBe('CRITICAL');
      expect(data.metadata.severityFilter).toBe('CRITICAL');
    });

    it('filters entities by type', async () => {
      const mockDb = db as any;
      
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      
      // Mock entity type filtered query
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'entity-1',
          name: 'Test Hospital',
          type: 'FACILITY',
          coordinates: { latitude: 9.0820, longitude: 8.6753 },
          severity: 'HIGH',
          gapSummary: {
            totalGaps: 1,
            totalNoGaps: 2,
            criticalGaps: 0,
            severity: 'HIGH'
          }
        }
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&entityTypeFilter=FACILITY',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.entityLocations.entities).toHaveLength(1);
      expect(data.data.entityLocations.entities[0].type).toBe('FACILITY');
      expect(data.metadata.entityTypeFilter).toBe('FACILITY');
    });

    it('validates incident ID format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&incidentId=invalid@id',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('incidentId');
    });

    it('handles database errors gracefully', async () => {
      const mockDb = db as any;
      mockDb.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch dashboard data');
    });

    it('returns correct metadata for entity locations', async () => {
      const mockDb = db as any;
      
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'entity-1',
          name: 'Test Hospital',
          type: 'FACILITY',
          coordinates: { latitude: 9.0820, longitude: 8.6753 },
          severity: 'CRITICAL',
          gapSummary: {
            totalGaps: 2,
            totalNoGaps: 1,
            criticalGaps: 1,
            severity: 'CRITICAL'
          }
        }
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&includeDonorAssignments=true&severityFilter=CRITICAL&entityTypeFilter=FACILITY',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.recordCounts.entityLocations).toBe(1);
      expect(data.metadata.entityLocationsEnabled).toBe(true);
      expect(data.metadata.donorAssignmentsEnabled).toBe(true);
      expect(data.metadata.severityFilter).toBe('CRITICAL');
      expect(data.metadata.entityTypeFilter).toBe('FACILITY');
    });

    it('calculates map bounds correctly', async () => {
      const mockDb = db as any;
      
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      
      // Mock entities with different coordinates for bounds calculation
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'entity-1',
          name: 'Test Hospital',
          type: 'FACILITY',
          coordinates: { latitude: 9.0820, longitude: 8.6753 },
          severity: 'HIGH',
          gapSummary: {
            totalGaps: 1,
            totalNoGaps: 2,
            criticalGaps: 0,
            severity: 'HIGH'
          }
        },
        {
          id: 'entity-2',
          name: 'Test Shelter',
          type: 'SHELTER',
          coordinates: { latitude: 9.0, longitude: 8.5 },
          severity: 'MEDIUM',
          gapSummary: {
            totalGaps: 1,
            totalNoGaps: 2,
            criticalGaps: 0,
            severity: 'MEDIUM'
          }
        }
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.entityLocations.mapBounds).toBeDefined();
      expect(data.data.entityLocations.mapBounds.northEast).toBeDefined();
      expect(data.data.entityLocations.mapBounds.southWest).toBeDefined();
    });
  });

  describe('Security and Authorization', () => {
    it('rejects requests without authentication', async () => {
      const mockGetServerSession = getServerSession as jest.Mock;
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('accepts requests with valid authentication', async () => {
      const mockDb = db as any;
      
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('sanitizes input parameters to prevent SQL injection', async () => {
      const mockDb = db as any;
      
      // The mock should be called with properly sanitized parameters
      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&incidentId=test-1; DROP TABLE users;--',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);

      // Should validate incident ID format and reject malicious input
      expect(response.status).toBe(400);
    });
  });

  describe('Parameter Validation', () => {
    it('validates limit parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&limit=101',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('limit');
    });

    it('validates severity filter values', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&severityFilter=INVALID',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('severityFilter');
    });

    it('validates entity type filter values', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true&entityTypeFilter=INVALID_TYPE',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('entityTypeFilter');
    });
  });

  describe('Performance and Response Time', () => {
    it('handles large numbers of entities efficiently', async () => {
      const mockDb = db as any;
      
      // Generate mock data for many entities
      const manyEntities = Array.from({ length: 100 }, (_, i) => ({
        id: `entity-${i}`,
        name: `Entity ${i}`,
        type: 'FACILITY',
        coordinates: { latitude: 9.0 + i * 0.001, longitude: 8.5 + i * 0.001 },
        severity: 'HIGH',
        gapSummary: {
          totalGaps: 1,
          totalNoGaps: 2,
          criticalGaps: 0,
          severity: 'HIGH'
        }
      }));

      mockDb.$queryRaw.mockResolvedValueOnce([testIncident]);
      mockDb.$queryRaw.mockResolvedValueOnce(testEntities);
      mockDb.$queryRaw.mockResolvedValueOnce([]);
      mockDb.$queryRaw.mockResolvedValueOnce(manyEntities);

      const startTime = Date.now();
      
      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeEntityLocations=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { GET } = await import('@/app/api/v1/dashboard/situation/route');
      const response = await GET(request);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Tests enhanced dashboard API endpoint with real database patterns
 * 2. Tests entity locations functionality and donor assignments integration
 * 3. Validates input parameter sanitization and SQL injection prevention
 * 4. Tests authentication and authorization patterns
 * 5. Validates response structure and metadata accuracy
 * 6. Tests performance with large datasets
 * 7. NEVER mock database operations - use real database patterns with mocked responses
 * 8. ALWAYS test error scenarios and edge cases
 * 9. Test parameter validation and security measures
 */