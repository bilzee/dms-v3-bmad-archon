import { GET } from '@/app/api/v1/dashboard/situation/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';

// Mock authentication
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

// Mock database client
jest.mock('@/lib/db/client', () => ({
  db: {
    $queryRaw: jest.fn()
  }
}));

describe('Dashboard API - Gap Analysis Summary', () => {
  let mockSession: jest.MockedFunction<any>;
  let mockDbQuery: jest.MockedFunction<any>;

  const mockIncidentId = 'test-incident-001';
  const mockBaseUrl = 'http://localhost:3000';

  // Mock gap analysis summary response data
  const mockGapAnalysisSummary = {
    totalEntities: 10,
    severityDistribution: {
      high: 3,
      medium: 4,
      low: 2
    },
    assessmentTypeGaps: {
      HEALTH: {
        severity: 'high',
        entitiesAffected: 6,
        percentage: 60.0
      },
      FOOD: {
        severity: 'medium',
        entitiesAffected: 4,
        percentage: 40.0
      },
      WASH: {
        severity: 'low',
        entitiesAffected: 2,
        percentage: 20.0
      },
      SHELTER: {
        severity: 'high',
        entitiesAffected: 8,
        percentage: 80.0
      },
      SECURITY: {
        severity: 'medium',
        entitiesAffected: 3,
        percentage: 30.0
      }
    },
    lastUpdated: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const { getServerSession } = require('next-auth/next');
    mockSession = getServerSession;
    
    mockDbQuery = db.$queryRaw as jest.MockedFunction<any>;
    
    // Default authenticated session
    mockSession.mockResolvedValue({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        role: 'coordinator'
      }
    });

    // Default successful incident query
    mockDbQuery.mockResolvedValue([
      {
        id: mockIncidentId,
        type: 'FLOOD',
        subType: 'FLASH_FLOOD',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Test flood incident',
        location: 'Test Location',
        coordinates: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        populationImpact: '1000'
      }
    ]);

    // Default entities query for gap analysis
    mockDbQuery.mockResolvedValue([
      { id: 'entity-1', name: 'Entity 1', type: 'COMMUNITY' },
      { id: 'entity-2', name: 'Entity 2', type: 'FACILITY' },
      { id: 'entity-3', name: 'Entity 3', type: 'WARD' }
    ]);

    // Default entity assessments query
    mockDbQuery.mockResolvedValue([
      {
        entityId: 'entity-1',
        entityName: 'Entity 1',
        entityType: 'COMMUNITY',
        location: 'Location 1',
        coordinates: null,
        affectedAt: new Date(),
        severity: 'HIGH',
        latestAssessments: {
          health: {
            gapAnalysis: { hasGap: true, severity: 'HIGH' }
          },
          food: {
            gapAnalysis: { hasGap: true, severity: 'MEDIUM' }
          },
          wash: {
            gapAnalysis: { hasGap: false, severity: 'LOW' }
          },
          shelter: {
            gapAnalysis: { hasGap: true, severity: 'HIGH' }
          },
          security: {
            gapAnalysis: { hasGap: true, severity: 'MEDIUM' }
          }
        }
      }
    ]);
  });

  describe('GET /api/v1/dashboard/situation with gap analysis', () => {
    it('returns gap analysis summary when includeGapSummary=true', async () => {
      // Mock the entities query for gap analysis summary
      mockDbQuery
        .mockResolvedValueOnce([ // Incidents query
          {
            id: mockIncidentId,
            type: 'FLOOD',
            subType: 'FLASH_FLOOD',
            severity: 'HIGH',
            status: 'ACTIVE',
            description: 'Test flood incident',
            location: 'Test Location',
            coordinates: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            populationImpact: '1000'
          }
        ])
        .mockResolvedValueOnce([ // Entities query
          { id: 'entity-1', name: 'Entity 1', type: 'COMMUNITY' },
          { id: 'entity-2', name: 'Entity 2', type: 'FACILITY' }
        ])
        .mockResolvedValueOnce([ // Entity assessments query
          {
            id: 'entity-1',
            name: 'Entity 1',
            type: 'COMMUNITY',
            location: 'Location 1',
            coordinates: null,
            affectedAt: new Date(),
            severity: 'HIGH',
            latestAssessments: {
              health: {
                gapAnalysis: { hasGap: true, severity: 'HIGH' }
              },
              food: {
                gapAnalysis: { hasGap: true, severity: 'MEDIUM' }
              },
              wash: {
                gapAnalysis: { hasGap: false, severity: 'LOW' }
              },
              shelter: {
                gapAnalysis: { hasGap: true, severity: 'HIGH' }
              },
              security: {
                gapAnalysis: { hasGap: true, severity: 'MEDIUM' }
              }
            }
          }
        ]);

      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.gapAnalysisSummary).toBeDefined();
      expect(data.data.gapAnalysisSummary.totalEntities).toBeGreaterThan(0);
      expect(data.data.gapAnalysisSummary.severityDistribution).toBeDefined();
      expect(data.data.gapAnalysisSummary.assessmentTypeGaps).toBeDefined();
    });

    it('does not include gap analysis when includeGapSummary=false or not provided', async () => {
      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.gapAnalysisSummary).toBeUndefined();
    });

    it('requires incidentId for gap analysis summary', async () => {
      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.gapAnalysisSummary).toBeUndefined();
    });

    it('handles empty entities list gracefully', async () => {
      mockDbQuery
        .mockResolvedValueOnce([ // Incidents query
          {
            id: mockIncidentId,
            type: 'FLOOD',
            subType: 'FLASH_FLOOD',
            severity: 'HIGH',
            status: 'ACTIVE',
            description: 'Test flood incident',
            location: 'Test Location',
            coordinates: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            populationImpact: '0'
          }
        ])
        .mockResolvedValueOnce([]); // Empty entities list

      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.gapAnalysisSummary).toBeDefined();
      expect(data.data.gapAnalysisSummary.totalEntities).toBe(0);
      expect(data.data.gapAnalysisSummary.severityDistribution.high).toBe(0);
      expect(data.data.gapAnalysisSummary.severityDistribution.medium).toBe(0);
      expect(data.data.gapAnalysisSummary.severityDistribution.low).toBe(0);
    });

    it('calculates correct severity percentages', async () => {
      // Mock scenario: 3 entities with gaps (1 high, 1 medium, 1 low)
      mockDbQuery
        .mockResolvedValueOnce([ // Incidents
          {
            id: mockIncidentId,
            type: 'FLOOD',
            subType: 'FLASH_FLOOD',
            severity: 'HIGH',
            status: 'ACTIVE',
            description: 'Test flood incident',
            location: 'Test Location',
            coordinates: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            populationImpact: '500'
          }
        ])
        .mockResolvedValueOnce([ // Entities
          { id: 'entity-1', name: 'Entity 1', type: 'COMMUNITY' },
          { id: 'entity-2', name: 'Entity 2', type: 'FACILITY' },
          { id: 'entity-3', name: 'Entity 3', type: 'WARD' }
        ])
        .mockResolvedValueOnce([ // Entity assessments
          {
            id: 'entity-1',
            name: 'Entity 1',
            type: 'COMMUNITY',
            location: 'Location 1',
            coordinates: null,
            affectedAt: new Date(),
            severity: 'HIGH',
            latestAssessments: {
              health: {
                gapAnalysis: { hasGap: true, severity: 'CRITICAL' } // Maps to high
              }
            }
          },
          {
            id: 'entity-2',
            name: 'Entity 2',
            type: 'FACILITY',
            location: 'Location 2',
            coordinates: null,
            affectedAt: new Date(),
            severity: 'MEDIUM',
            latestAssessments: {
              food: {
                gapAnalysis: { hasGap: true, severity: 'MEDIUM' }
              }
            }
          },
          {
            id: 'entity-3',
            name: 'Entity 3',
            type: 'WARD',
            location: 'Location 3',
            coordinates: null,
            affectedAt: new Date(),
            severity: 'LOW',
            latestAssessments: {
              wash: {
                gapAnalysis: { hasGap: true, severity: 'LOW' }
              }
            }
          }
        ]);

      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.gapAnalysisSummary.totalEntities).toBe(3);
      expect(data.data.gapAnalysisSummary.severityDistribution.high).toBe(1);
      expect(data.data.gapAnalysisSummary.severityDistribution.medium).toBe(1);
      expect(data.data.gapAnalysisSummary.severityDistribution.low).toBe(1);
    });

    it('validates incident ID format', async () => {
      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=invalid-id-with spaces&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid incident ID format');
    });

    it('requires authentication', async () => {
      mockSession.mockResolvedValue(null);

      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('includes rate limiting headers', async () => {
      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('handles database errors gracefully', async () => {
      mockDbQuery.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch dashboard data');
    });

    it('includes correct metadata in response', async () => {
      const request = new NextRequest(
        `${mockBaseUrl}/api/v1/dashboard/situation?incidentId=${mockIncidentId}&includeGapSummary=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.timestamp).toBeTruthy();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.incidentFilter).toBe(mockIncidentId);
      expect(data.metadata.gapSummaryEnabled).toBe(true);
    });
  });
});