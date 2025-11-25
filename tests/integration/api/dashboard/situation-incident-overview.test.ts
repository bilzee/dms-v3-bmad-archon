import { GET } from '@/app/api/v1/dashboard/situation/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';

// Mock authentication
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

describe('Situation Dashboard API', () => {
  let testIncident: any;
  let testEntity: any;
  let testUser: any;
  let testAssessment: any;
  let testPopulationAssessment: any;
  let testPreliminaryAssessment: any;

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: 'dashboard-test@example.com',
        username: 'dashboard-test',
        name: 'Dashboard Test User',
        isActive: true
      }
    });

    // Create test incident
    testIncident = await db.incident.create({
      data: {
        type: 'FLOOD',
        subType: 'Flash Flood',
        severity: 'HIGH',
        status: 'ACTIVE',
        description: 'Test flood incident for dashboard API',
        location: 'Test Location, Test State',
        coordinates: { type: 'Point', coordinates: [0.0, 0.0] },
        createdBy: testUser.id
      }
    });

    // Create test entity
    testEntity = await db.entity.create({
      data: {
        name: 'Test Community',
        type: 'COMMUNITY',
        location: 'Test Location',
        coordinates: { type: 'Point', coordinates: [0.0, 0.0] },
        isActive: true
      }
    });

    // Link entity to incident
    await db.incidentEntity.create({
      data: {
        incidentId: testIncident.id,
        entityId: testEntity.id,
        affectedAt: new Date(),
        severity: 'HIGH'
      }
    });

    // Create test rapid assessment
    testAssessment = await db.rapidAssessment.create({
      data: {
        rapidAssessmentType: 'POPULATION',
        rapidAssessmentDate: new Date(),
        assessorId: testUser.id,
        entityId: testEntity.id,
        assessorName: testUser.name,
        location: 'Test Location',
        coordinates: { type: 'Point', coordinates: [0.0, 0.0] },
        status: 'SUBMITTED',
        priority: 'HIGH',
        versionNumber: 1,
        isOfflineCreated: false,
        syncStatus: 'SYNCED',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: testUser.id
      }
    });

    // Create test population assessment
    testPopulationAssessment = await db.populationAssessment.create({
      data: {
        rapidAssessmentId: testAssessment.id,
        totalHouseholds: 100,
        totalPopulation: 500,
        populationMale: 250,
        populationFemale: 250,
        populationUnder5: 75,
        pregnantWomen: 20,
        lactatingMothers: 15,
        personWithDisability: 10,
        elderlyPersons: 50,
        separatedChildren: 5,
        numberLivesLost: 2,
        numberInjured: 15
      }
    });

    // Create test preliminary assessment
    testPreliminaryAssessment = await db.preliminaryAssessment.create({
      data: {
        reportingDate: new Date(),
        reportingLatitude: 0.0,
        reportingLongitude: 0.0,
        reportingLGA: 'Test LGA',
        reportingWard: 'Test Ward',
        numberLivesLost: 1,
        numberInjured: 8,
        numberDisplaced: 200,
        numberHousesAffected: 50,
        numberSchoolsAffected: 2,
        numberMedicalFacilitiesAffected: 1,
        estimatedAgriculturalLandsAffected: 100,
        reportingAgent: testUser.name,
        additionalDetails: 'Test preliminary assessment details',
        incidentId: testIncident.id
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data in correct order due to foreign key constraints
    await db.populationAssessment.deleteMany({
      where: { rapidAssessmentId: testAssessment.id }
    });
    await db.preliminaryAssessment.deleteMany({
      where: { incidentId: testIncident.id }
    });
    await db.rapidAssessment.deleteMany({
      where: { id: testAssessment.id }
    });
    await db.incidentEntity.deleteMany({
      where: { incidentId: testIncident.id }
    });
    await db.incident.deleteMany({
      where: { id: testIncident.id }
    });
    await db.entity.deleteMany({
      where: { id: testEntity.id }
    });
    await db.user.deleteMany({
      where: { id: testUser.id }
    });
  });

  beforeEach(async () => {
    // Mock authenticated user
    const { getServerSession } = require('next-auth');
    getServerSession.mockResolvedValue({
      user: { id: testUser.id, email: testUser.email }
    });
  });

  describe('GET /api/v1/dashboard/situation', () => {
    it('returns dashboard data without incident filter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('incidents');
      expect(data.data).toHaveProperty('entities');
      expect(data.data).toHaveProperty('gaps');
      expect(data.data).toHaveProperty('lastUpdated');
      expect(Array.isArray(data.data.incidents)).toBe(true);
    });

    it('returns dashboard data with incident filter', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/dashboard/situation?incidentId=${testIncident.id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('selectedIncident');
      expect(data.data.selectedIncident).toHaveProperty('incident');
      expect(data.data.selectedIncident).toHaveProperty('populationImpact');
      expect(data.data.selectedIncident).toHaveProperty('aggregateMetrics');
    });

    it('aggregates population impact data correctly', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/dashboard/situation?incidentId=${testIncident.id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const populationImpact = data.data.selectedIncident.populationImpact;
      expect(populationImpact.totalPopulation).toBe(500);
      expect(populationImpact.totalHouseholds).toBe(100);
      expect(populationImpact.aggregatedLivesLost).toBe(3); // 2 from population + 1 from preliminary
      expect(populationImpact.aggregatedInjured).toBe(23); // 15 from population + 8 from preliminary
      expect(populationImpact.aggregatedDisplaced).toBe(200); // From preliminary assessment
      
      // Check demographic breakdown
      expect(populationImpact.demographicBreakdown.under5).toBe(75);
      expect(populationImpact.demographicBreakdown.elderly).toBe(50);
      expect(populationImpact.demographicBreakdown.pwd).toBe(10);
      expect(populationImpact.demographicBreakdown.pregnantWomen).toBe(20);
      expect(populationImpact.demographicBreakdown.lactatingMothers).toBe(15);
      expect(populationImpact.demographicBreakdown.separatedChildren).toBe(5);
      expect(populationImpact.demographicBreakdown.populationMale).toBe(250);
      expect(populationImpact.demographicBreakdown.populationFemale).toBe(250);
      
      // Check source assessments
      expect(populationImpact.sourceAssessments.populationCount).toBe(1);
      expect(populationImpact.sourceAssessments.preliminaryCount).toBe(1);
    });

    it('calculates aggregate metrics correctly', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/dashboard/situation?incidentId=${testIncident.id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const aggregateMetrics = data.data.selectedIncident.aggregateMetrics;
      expect(aggregateMetrics.affectedEntitiesCount).toBe(1); // One test entity
      expect(aggregateMetrics.totalAssessmentsCount).toBe(1); // One test assessment
      expect(aggregateMetrics.verifiedAssessmentsCount).toBe(1); // Assessment is verified
      expect(aggregateMetrics.responsesCount).toBe(0); // No responses created
      expect(aggregateMetrics.deliveryRate).toBe(0); // No responses/assessments
      expect(aggregateMetrics.coverageRate).toBe(1); // 1 assessment / 1 entity
    });

    it('includes historical incidents when requested', async () => {
      // Create a resolved incident for testing historical access
      const resolvedIncident = await db.incident.create({
        data: {
          type: 'EARTHQUAKE',
          subType: 'Tremor',
          severity: 'LOW',
          status: 'RESOLVED',
          description: 'Test resolved incident',
          location: 'Test Location 2',
          createdBy: testUser.id
        }
      });

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?includeHistorical=true',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Should include both active and resolved incidents
      expect(data.data.incidents.length).toBeGreaterThanOrEqual(2);
      
      // Cleanup resolved incident
      await db.incident.delete({ where: { id: resolvedIncident.id } });
    });

    it('calculates duration information correctly', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/dashboard/situation?incidentId=${testIncident.id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const incident = data.data.selectedIncident.incident;
      expect(incident).toHaveProperty('totalDuration');
      expect(incident).toHaveProperty('durationInCurrentStatus');
      expect(incident).toHaveProperty('durationDays');
      expect(typeof incident.totalDuration).toBe('number');
      expect(typeof incident.durationInCurrentStatus).toBe('number');
      expect(typeof incident.durationDays).toBe('number');
    });

    it('handles query parameters correctly', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/dashboard/situation?incidentId=${testIncident.id}&realTime=true&includeHistorical=false&limit=10`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.realTimeUpdates).toBe(true);
      expect(data.metadata.incidentFilter).toBe(testIncident.id);
    });

    it('returns 401 for unauthenticated requests', async () => {
      // Mock unauthenticated session
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('handles non-existent incident gracefully', async () => {
      const fakeIncidentId = 'non-existent-incident-id';
      
      const request = new NextRequest(
        `http://localhost:3000/api/v1/dashboard/situation?incidentId=${fakeIncidentId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.selectedIncident).toBeUndefined();
    });

    it('validates query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/dashboard/situation?limit=150', // Over max limit
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should use default limit when invalid limit provided
      expect(data.data.incidents.length).toBeLessThanOrEqual(100);
    });
  });
});