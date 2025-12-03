import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db/client';
import { z } from 'zod';
import type { Json, EntityType, DateTime } from '@prisma/client';
import {
  analyzeHealthGaps,
  analyzeFoodGaps,
  analyzeWASHGaps,
  analyzeShelterGaps,
  analyzeSecurityGaps,
  type HealthGapAnalysis,
  type FoodGapAnalysis,
  type WASHGapAnalysis,
  type ShelterGapAnalysis,
  type SecurityGapAnalysis
} from '@/lib/services/gap-analysis.service';

// Rate limiting implementation
class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  
  static isRateLimited(request: NextRequest, limit: number = 100, windowMs: number = 60000): boolean {
    const clientIp = this.getClientIp(request);
    const now = Date.now();
    const key = `${clientIp}:${Math.floor(now / windowMs)}`;
    
    const current = this.requests.get(key);
    
    if (!current) {
      this.requests.set(key, { count: 1, resetTime: now + windowMs });
      this.cleanup();
      return false;
    }
    
    if (current.count >= limit) {
      return true;
    }
    
    current.count++;
    return false;
  }
  
  private static getClientIp(request: NextRequest): string {
    // Try various headers for client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = request.headers.get('x-client-ip');
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    if (clientIp) {
      return clientIp;
    }
    
    // Fallback to request IP
    return 'unknown';
  }
  
  private static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Query parameter validation schema - Enhanced security to prevent SQL injection
const DashboardQuerySchema = z.object({
  incidentId: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid incident ID format').nullish(),
  entityId: z.string().regex(/^[a-zA-Z0-9_-]+$|^all$/, 'Invalid entity ID format').nullish(),
  realTime: z.coerce.boolean().default(false),
  includeHistorical: z.coerce.boolean().default(false),
  limit: z.coerce.number().min(1).max(100).default(50),
  // Interactive map parameters
  includeEntityLocations: z.coerce.boolean().default(false),
  includeDonorAssignments: z.coerce.boolean().default(false),
  severityFilter: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL']).default('ALL').nullish(),
  entityTypeFilter: z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP', 'ALL']).default('ALL').nullish(),
  // Gap analysis summary parameter
  includeGapSummary: z.coerce.boolean().default(false)
}).transform(data => ({
  ...data,
  incidentId: data.incidentId || undefined,
  entityId: data.entityId || undefined,
  severityFilter: data.severityFilter || 'ALL',
  entityTypeFilter: data.entityTypeFilter || 'ALL'
}));

// Enhanced type definitions for dashboard data
interface IncidentSummary {
  id: string;
  type: string;
  subType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  description: string;
  location: string;
  coordinates?: any;
  createdAt: Date;
  updatedAt: Date;
  populationImpact?: number;
  durationDays?: number;
  durationInCurrentStatus?: number;
  totalDuration?: number;
}

interface PopulationImpact {
  totalPopulation: number;
  totalHouseholds: number;
  aggregatedLivesLost: number;
  aggregatedInjured: number;
  aggregatedDisplaced: number;
  demographicBreakdown: {
    under5: number;
    elderly: number;
    pwd: number;
    pregnantWomen: number;
    lactatingMothers: number;
    separatedChildren: number;
    populationMale: number;
    populationFemale: number;
  };
  sourceAssessments: {
    populationCount: number;
    preliminaryCount: number;
  };
}

// Enhanced assessment data interfaces
interface HealthAssessmentData {
  rapidAssessmentId: string;
  hasFunctionalClinic: boolean;
  hasEmergencyServices: boolean;
  numberHealthFacilities: number;
  healthFacilityType: string;
  qualifiedHealthWorkers: number;
  hasTrainedStaff: boolean;
  hasMedicineSupply: boolean;
  hasMedicalSupplies: boolean;
  hasMaternalChildServices: boolean;
  commonHealthIssues: string;
  additionalHealthDetails?: Json;
  rapidAssessmentDate: Date;
  verificationStatus: string;
  assessorName: string;
}

interface FoodAssessmentData {
  rapidAssessmentId: string;
  isFoodSufficient: boolean;
  hasRegularMealAccess: boolean;
  hasInfantNutrition: boolean;
  foodSource: string;
  availableFoodDurationDays: number;
  additionalFoodRequiredPersons: number;
  additionalFoodRequiredHouseholds: number;
  additionalFoodDetails?: Json;
  rapidAssessmentDate: Date;
  verificationStatus: string;
  assessorName: string;
}

interface WASHAssessmentData {
  rapidAssessmentId: string;
  waterSource: string;
  isWaterSufficient: boolean;
  hasCleanWaterAccess: boolean;
  functionalLatrinesAvailable: number;
  areLatrinesSufficient: boolean;
  hasHandwashingFacilities: boolean;
  hasOpenDefecationConcerns: boolean;
  additionalWashDetails?: Json;
  rapidAssessmentDate: Date;
  verificationStatus: string;
  assessorName: string;
}

interface ShelterAssessmentData {
  rapidAssessmentId: string;
  areSheltersSufficient: boolean;
  hasSafeStructures: boolean;
  shelterTypes: string;
  requiredShelterType: string;
  numberSheltersRequired: number;
  areOvercrowded: boolean;
  provideWeatherProtection: boolean;
  additionalShelterDetails?: Json;
  rapidAssessmentDate: Date;
  verificationStatus: string;
  assessorName: string;
}

interface SecurityAssessmentData {
  rapidAssessmentId: string;
  isSafeFromViolence: boolean;
  gbvCasesReported: boolean;
  hasSecurityPresence: boolean;
  hasProtectionReportingMechanism: boolean;
  vulnerableGroupsHaveAccess: boolean;
  hasLighting: boolean;
  additionalSecurityDetails?: Json;
  rapidAssessmentDate: Date;
  verificationStatus: string;
  assessorName: string;
}

interface PopulationAssessmentData {
  rapidAssessmentId: string;
  totalHouseholds: number;
  totalPopulation: number;
  populationMale: number;
  populationFemale: number;
  populationUnder5: number;
  pregnantWomen: number;
  lactatingMothers: number;
  personWithDisability: number;
  elderlyPersons: number;
  separatedChildren: number;
  numberLivesLost: number;
  numberInjured: number;
  additionalPopulationDetails?: Json;
  rapidAssessmentDate: Date;
  verificationStatus: string;
  assessorName: string;
}

// Interactive map type definitions
interface EntityLocation {
  id: string;
  name: string;
  type: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  gapSummary: {
    totalGaps: number;
    totalNoGaps: number;
    criticalGaps: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  };
  donorAssignments?: Array<{
    donorId: string;
    donorName: string;
    commitmentStatus: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
  }>;
}

interface EntityLocationsResponse {
  entities: EntityLocation[];
  mapBounds: {
    northEast: { lat: number; lng: number };
    southWest: { lat: number; lng: number };
  };
  totalCount: number;
}

// Gap analysis interfaces are now imported from gap-analysis.service

interface AggregatedHealthAssessment {
  totalEntities: number;
  entitiesWithGaps: number;
  entitiesWithoutGaps: number;
  totalHealthFacilities: number;
  totalQualifiedWorkers: number;
}

interface AggregatedFoodAssessment {
  totalEntities: number;
  entitiesWithGaps: number;
  entitiesWithoutGaps: number;
  averageFoodDuration: number;
  totalAdditionalPersonsRequired: number;
}

interface AggregatedWASHAssessment {
  totalEntities: number;
  entitiesWithGaps: number;
  entitiesWithoutGaps: number;
  totalFunctionalLatrines: number;
}

interface AggregatedShelterAssessment {
  totalEntities: number;
  entitiesWithGaps: number;
  entitiesWithoutGaps: number;
  totalSheltersRequired: number;
}

interface AggregatedSecurityAssessment {
  totalEntities: number;
  entitiesWithGaps: number;
  entitiesWithoutGaps: number;
}

interface AggregatedPopulationAssessment {
  totalEntities: number;
  totalPopulation: number;
  totalHouseholds: number;
  totalLivesLost: number;
  totalInjured: number;
}

interface AggregatedAssessments {
  health: AggregatedHealthAssessment;
  food: AggregatedFoodAssessment;
  wash: AggregatedWASHAssessment;
  shelter: AggregatedShelterAssessment;
  security: AggregatedSecurityAssessment;
  population: AggregatedPopulationAssessment;
  gapSummary: {
    totalGaps: number;
    totalNoGaps: number;
    criticalGaps: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
  };
}

interface AggregateMetrics {
  affectedEntitiesCount: number;
  totalAssessmentsCount: number;
  verifiedAssessmentsCount: number;
  responsesCount: number;
  deliveryRate: number;
  coverageRate: number;
  trends?: {
    assessmentsChange: number;
    responsesChange: number;
    entitiesChange: number;
  };
}

interface EntityAssessment {
  id: string;
  name: string;
  type: EntityType;
  location: string;
  coordinates?: Json;
  affectedAt: DateTime;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  latestAssessments: {
    health?: (HealthAssessmentData & { gapAnalysis: HealthGapAnalysis });
    food?: (FoodAssessmentData & { gapAnalysis: FoodGapAnalysis });
    wash?: (WASHAssessmentData & { gapAnalysis: WASHGapAnalysis });
    shelter?: (ShelterAssessmentData & { gapAnalysis: ShelterGapAnalysis });
    security?: (SecurityAssessmentData & { gapAnalysis: SecurityGapAnalysis });
    population?: PopulationAssessmentData;
  };
  gapSummary: {
    totalGaps: number;
    totalNoGaps: number;
    criticalGaps: number;
  };
  lastUpdated: Date;
}

interface GapAnalysis {
  entityId: string;
  entityName: string;
  entityType: 'COMMUNITY' | 'WARD' | 'LGA' | 'STATE' | 'FACILITY' | 'CAMP';
  location?: string;
  assessmentGaps: {
    [key: string]: {
      hasGap: boolean;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      lastAssessed: Date;
      indicators: {
        category: string;
        hasGap: boolean;
        description: string;
      }[];
    };
  };
  overallGapSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  totalGapCount: number;
  lastUpdated: Date;
}

// Gap analysis summary interfaces
interface GapAnalysisSummary {
  totalEntities: number;
  severityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  assessmentTypeGaps: {
    [assessmentType: string]: {
      severity: 'high' | 'medium' | 'low';
      entitiesAffected: number;
      percentage: number;
    };
  };
  lastUpdated: string;
}

interface SituationDashboardData {
  incidents: IncidentSummary[];
  entities: EntityAssessment[];
  gaps: GapAnalysis[];
  realTimeUpdates: boolean;
  lastUpdated: Date;
  // New fields for incident overview panel
  selectedIncident?: {
    incident: IncidentSummary;
    populationImpact: PopulationImpact;
    aggregateMetrics: AggregateMetrics;
  };
  // Enhanced fields for entity assessment panel
  entityAssessments: EntityAssessment[];
  aggregatedAssessments?: AggregatedAssessments;
  // Interactive map fields
  entityLocations?: EntityLocationsResponse;
  // Gap analysis summary fields
  gapAnalysisSummary?: GapAnalysisSummary;
}

// Helper functions for enhanced metrics - Fixed SQL injection vulnerabilities
async function getPopulationImpact(incidentId: string): Promise<PopulationImpact> {
  // Validate incidentId to prevent SQL injection
  if (!incidentId || typeof incidentId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(incidentId)) {
    throw new Error('Invalid incident ID format');
  }

  // First, get all entities that have population assessments for this incident
  const entitiesWithPopulationAssessments = await db.entity.findMany({
    where: {
      rapidAssessments: {
        some: {
          incidentId: incidentId,
          verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
          populationAssessment: {
            isNot: null
          }
        },
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  // Then fetch only the latest population assessment for each entity
  const latestPopulationAssessments = await Promise.all(
    entitiesWithPopulationAssessments.map(async (entity) => {
      return db.populationAssessment.findFirst({
        where: {
          rapidAssessment: {
            entityId: entity.id,
            incidentId: incidentId,
            verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
          },
        },
        include: {
          rapidAssessment: {
            select: {
              id: true,
              entityId: true,
            },
          },
        },
        orderBy: {
          rapidAssessment: {
            rapidAssessmentDate: 'desc',
          },
        },
      });
    })
  );

  // Filter out null results and ensure we have unique assessments per entity
  const populationData = latestPopulationAssessments.filter(
    (assessment): assessment is NonNullable<typeof assessment> => 
      assessment !== null
  );

  const populationAggregation = populationData.reduce(
    (acc, assessment) => ({
      totalPopulation: acc.totalPopulation + (assessment.totalPopulation || 0),
      totalHouseholds: acc.totalHouseholds + (assessment.totalHouseholds || 0),
      populationMale: acc.populationMale + (assessment.populationMale || 0),
      populationFemale: acc.populationFemale + (assessment.populationFemale || 0),
      under5: acc.under5 + (assessment.populationUnder5 || 0),
      elderly: acc.elderly + (assessment.elderlyPersons || 0),
      pwd: acc.pwd + (assessment.personWithDisability || 0),
      pregnantWomen: acc.pregnantWomen + (assessment.pregnantWomen || 0),
      lactatingMothers: acc.lactatingMothers + (assessment.lactatingMothers || 0),
      separatedChildren: acc.separatedChildren + (assessment.separatedChildren || 0),
      populationLivesLost: acc.populationLivesLost + (assessment.numberLivesLost || 0),
      populationInjured: acc.populationInjured + (assessment.numberInjured || 0),
      populationCount: acc.populationCount + 1,
    }),
    {
      totalPopulation: 0,
      totalHouseholds: 0,
      populationMale: 0,
      populationFemale: 0,
      under5: 0,
      elderly: 0,
      pwd: 0,
      pregnantWomen: 0,
      lactatingMothers: 0,
      separatedChildren: 0,
      populationLivesLost: 0,
      populationInjured: 0,
      populationCount: 0,
    }
  );

  // Use Prisma query to get preliminary assessment data
  const preliminaryData = await db.preliminaryAssessment.findMany({
    where: {
      incidentId: incidentId,
    },
  });

  const preliminaryAggregation = preliminaryData.reduce(
    (acc, assessment) => ({
      preliminaryLivesLost: acc.preliminaryLivesLost + (assessment.numberLivesLost || 0),
      preliminaryInjured: acc.preliminaryInjured + (assessment.numberInjured || 0),
      aggregatedDisplaced: acc.aggregatedDisplaced + (assessment.numberDisplaced || 0),
      preliminaryCount: acc.preliminaryCount + 1,
    }),
    {
      preliminaryLivesLost: 0,
      preliminaryInjured: 0,
      aggregatedDisplaced: 0,
      preliminaryCount: 0,
    }
  );

  return {
    totalPopulation: populationAggregation.totalPopulation,
    totalHouseholds: populationAggregation.totalHouseholds,
    aggregatedLivesLost: populationAggregation.populationLivesLost + preliminaryAggregation.preliminaryLivesLost,
    aggregatedInjured: populationAggregation.populationInjured + preliminaryAggregation.preliminaryInjured,
    aggregatedDisplaced: preliminaryAggregation.aggregatedDisplaced,
    demographicBreakdown: {
      under5: populationAggregation.under5,
      elderly: populationAggregation.elderly,
      pwd: populationAggregation.pwd,
      pregnantWomen: populationAggregation.pregnantWomen,
      lactatingMothers: populationAggregation.lactatingMothers,
      separatedChildren: populationAggregation.separatedChildren,
      populationMale: populationAggregation.populationMale,
      populationFemale: populationAggregation.populationFemale,
    },
    sourceAssessments: {
      populationCount: populationAggregation.populationCount,
      preliminaryCount: preliminaryAggregation.preliminaryCount,
    },
  };
}

async function getAggregateMetrics(incidentId: string): Promise<AggregateMetrics> {
  // Get affected entities count via rapid assessments
  const affectedEntitiesCount = await db.entity.count({
    where: {
      rapidAssessments: {
        some: {
          incidentId: incidentId,
        },
      },
      isActive: true,
    },
  });

  // Get assessment counts
  const totalAssessmentsCount = await db.rapidAssessment.count({
    where: {
      incidentId: incidentId,
    },
  });

  const verifiedAssessmentsCount = await db.rapidAssessment.count({
    where: {
      incidentId: incidentId,
      verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
    },
  });

  // Get response counts
  const responsesCount = await db.rapidResponse.count({
    where: {
      assessment: {
        incidentId: incidentId,
      },
    },
  });

  return {
    affectedEntitiesCount,
    totalAssessmentsCount,
    verifiedAssessmentsCount,
    responsesCount,
    deliveryRate: totalAssessmentsCount > 0 ? responsesCount / totalAssessmentsCount : 0,
    coverageRate: affectedEntitiesCount > 0 ? totalAssessmentsCount / affectedEntitiesCount : 0,
  };
}

function calculateDurationInfo(incident: any) {
  const now = new Date();
  const createdAt = new Date(incident.createdAt);
  const updatedAt = new Date(incident.updatedAt);
  
  const totalDurationHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
  const inCurrentStatusHours = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
  
  return {
    totalDuration: totalDurationHours,
    durationInCurrentStatus: inCurrentStatusHours,
    durationDays: Math.floor(totalDurationHours / 24),
  };
}

// Enhanced entity assessment functions
async function getEntityAssessments(incidentId: string, entityId?: string): Promise<EntityAssessment[]> {
  if (!incidentId || typeof incidentId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(incidentId)) {
    throw new Error('Invalid incident ID format');
  }

  const entitiesQuery = entityId
    ? db.$queryRaw`
        SELECT 
          e.id,
          e.name,
          e.type,
          e.location,
          e.coordinates,
          ra."rapidAssessmentDate" as "affectedAt",
          'MEDIUM' as severity,
          ra.id as "rapidAssessmentId",
          ra."rapidAssessmentDate",
          ra."verificationStatus",
          ra."assessorName"
        FROM entities e
        JOIN rapid_assessments ra ON e.id = ra."entityId" 
          AND ra."incidentId" = ${incidentId}
          AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
        WHERE e."isActive" = true
          AND e.id = ${entityId}
        ORDER BY ra."rapidAssessmentDate" DESC
      ` as any[]
    : db.$queryRaw`
        SELECT 
          e.id,
          e.name,
          e.type,
          e.location,
          e.coordinates,
          ra."rapidAssessmentDate" as "affectedAt",
          'MEDIUM' as severity,
          ra.id as "rapidAssessmentId",
          ra."rapidAssessmentDate",
          ra."verificationStatus",
          ra."assessorName"
        FROM entities e
        JOIN rapid_assessments ra ON e.id = ra."entityId" 
          AND ra."incidentId" = ${incidentId}
          AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
        WHERE e."isActive" = true
        ORDER BY e.name, ra."rapidAssessmentDate" DESC
        LIMIT 100
      ` as any[];

  const entities = await entitiesQuery;
  
  // Get latest assessments for each entity
  const entityAssessments: EntityAssessment[] = [];
  const entityMap = new Map<string, any>();

  entities.forEach(row => {
    if (!entityMap.has(row.id)) {
      entityMap.set(row.id, {
        id: row.id,
        name: row.name,
        type: row.type,
        location: row.location,
        coordinates: row.coordinates,
        affectedAt: row.affectedAt,
        severity: row.severity,
        latestAssessments: {},
        gapSummary: {
          totalGaps: 0,
          totalNoGaps: 0,
          criticalGaps: 0
        },
        lastUpdated: new Date()
      });
    }
  });

  // Fetch detailed assessment data for each entity
  for (const [entityId, entityData] of entityMap) {
    const assessments = await Promise.all([
      getLatestHealthAssessment(entityId),
      getLatestFoodAssessment(entityId),
      getLatestWASHAssessment(entityId),
      getLatestShelterAssessment(entityId),
      getLatestSecurityAssessment(entityId),
      getLatestPopulationAssessment(entityId)
    ]);

    entityData.latestAssessments = {
      health: assessments[0],
      food: assessments[1],
      wash: assessments[2],
      shelter: assessments[3],
      security: assessments[4],
      population: assessments[5]
    };

    // Calculate gap summary
    let totalGaps = 0;
    let totalNoGaps = 0;
    let criticalGaps = 0;

    assessments.slice(0, 5).forEach(assessment => { // Exclude population from gap analysis
      if (assessment) {
        if (assessment.gapAnalysis.hasGap) {
          totalGaps++;
          if (assessment.gapAnalysis.severity === 'CRITICAL') {
            criticalGaps++;
          }
        } else {
          totalNoGaps++;
        }
      }
    });

    entityData.gapSummary = { totalGaps, totalNoGaps, criticalGaps };
    entityAssessments.push(entityData);
  }

  return entityAssessments;
}

async function getAggregatedAssessments(incidentId: string): Promise<AggregatedAssessments> {
  if (!incidentId || typeof incidentId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(incidentId)) {
    throw new Error('Invalid incident ID format');
  }

  // Mock aggregated assessments for now
  const aggregatedHealth = { totalEntities: 3, entitiesWithGaps: 2, entitiesWithoutGaps: 1 };
  const aggregatedFood = { totalEntities: 3, entitiesWithGaps: 1, entitiesWithoutGaps: 2 };
  const aggregatedWASH = { totalEntities: 3, entitiesWithGaps: 1, entitiesWithoutGaps: 2 };
  const aggregatedShelter = { totalEntities: 3, entitiesWithGaps: 1, entitiesWithoutGaps: 2 };
  const aggregatedSecurity = { totalEntities: 3, entitiesWithGaps: 0, entitiesWithoutGaps: 3 };
  const aggregatedPopulation = { totalEntities: 3, totalPopulation: 25000, totalHouseholds: 5000, totalLivesLost: 0, totalInjured: 5 };

  // Calculate aggregated gap summary
  let totalGaps = 0;
  let totalNoGaps = 0;
  let criticalGaps = 0;
  let entitiesWithGaps = 0;
  let entitiesWithoutGaps = 0;

  // Calculate gap summary - remove this since entityAssessments is not available here
  totalGaps = 5; // Mock for now
  totalNoGaps = 10;
  criticalGaps = 2;
  entitiesWithGaps = 2;
  entitiesWithoutGaps = 1;

  return {
    health: aggregatedHealth,
    food: aggregatedFood,
    wash: aggregatedWASH,
    shelter: aggregatedShelter,
    security: aggregatedSecurity,
    population: aggregatedPopulation,
    gapSummary: {
      totalGaps,
      totalNoGaps,
      criticalGaps,
      entitiesWithGaps,
      entitiesWithoutGaps
    }
  };
}

// Individual assessment fetchers
async function getLatestHealthAssessment(entityId: string): Promise<(HealthAssessmentData & { gapAnalysis: HealthGapAnalysis }) | null> {
  const assessment = await db.healthAssessment.findFirst({
    where: {
      rapidAssessment: {
        entityId: entityId,
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
      },
    },
    include: {
      rapidAssessment: {
        select: {
          id: true,
          rapidAssessmentDate: true,
          verificationStatus: true,
          assessorName: true,
          assessor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      rapidAssessment: {
        rapidAssessmentDate: 'desc',
      },
    },
  });

  if (!assessment) return null;

  const data = {
    rapidAssessmentId: assessment.rapidAssessmentId,
    hasFunctionalClinic: assessment.hasFunctionalClinic,
    hasEmergencyServices: assessment.hasEmergencyServices,
    numberHealthFacilities: assessment.numberHealthFacilities,
    healthFacilityType: assessment.healthFacilityType,
    qualifiedHealthWorkers: assessment.qualifiedHealthWorkers,
    hasTrainedStaff: assessment.hasTrainedStaff,
    hasMedicineSupply: assessment.hasMedicineSupply,
    hasMedicalSupplies: assessment.hasMedicalSupplies,
    hasMaternalChildServices: assessment.hasMaternalChildServices,
    commonHealthIssues: assessment.commonHealthIssues,
    additionalHealthDetails: assessment.additionalHealthDetails,
    rapidAssessmentDate: assessment.rapidAssessment.rapidAssessmentDate,
    verificationStatus: assessment.rapidAssessment.verificationStatus,
    assessorName: assessment.rapidAssessment.assessorName || assessment.rapidAssessment.assessor?.name || 'Unknown',
  };

  const gapAnalysis = await analyzeHealthGaps(data);

  return {
    ...data,
    gapAnalysis
  };
}

async function getLatestFoodAssessment(entityId: string): Promise<(FoodAssessmentData & { gapAnalysis: FoodGapAnalysis }) | null> {
  const assessment = await db.foodAssessment.findFirst({
    where: {
      rapidAssessment: {
        entityId: entityId,
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
      },
    },
    include: {
      rapidAssessment: {
        select: {
          id: true,
          rapidAssessmentDate: true,
          verificationStatus: true,
          assessorName: true,
          assessor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      rapidAssessment: {
        rapidAssessmentDate: 'desc',
      },
    },
  });

  if (!assessment) return null;

  const data = {
    rapidAssessmentId: assessment.rapidAssessmentId,
    isFoodSufficient: assessment.isFoodSufficient,
    hasRegularMealAccess: assessment.hasRegularMealAccess,
    hasInfantNutrition: assessment.hasInfantNutrition,
    foodSource: assessment.foodSource,
    availableFoodDurationDays: assessment.availableFoodDurationDays,
    additionalFoodRequiredPersons: assessment.additionalFoodRequiredPersons,
    additionalFoodRequiredHouseholds: assessment.additionalFoodRequiredHouseholds,
    additionalFoodDetails: assessment.additionalFoodDetails,
    rapidAssessmentDate: assessment.rapidAssessment.rapidAssessmentDate,
    verificationStatus: assessment.rapidAssessment.verificationStatus,
    assessorName: assessment.rapidAssessment.assessorName || assessment.rapidAssessment.assessor?.name || 'Unknown',
  };

  const gapAnalysis = await analyzeFoodGaps(data);

  return {
    ...data,
    gapAnalysis
  };
}

async function getLatestWASHAssessment(entityId: string): Promise<(WASHAssessmentData & { gapAnalysis: WASHGapAnalysis }) | null> {
  const assessment = await db.wASHAssessment.findFirst({
    where: {
      rapidAssessment: {
        entityId: entityId,
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
      },
    },
    include: {
      rapidAssessment: {
        select: {
          id: true,
          rapidAssessmentDate: true,
          verificationStatus: true,
          assessorName: true,
          assessor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      rapidAssessment: {
        rapidAssessmentDate: 'desc',
      },
    },
  });

  if (!assessment) return null;

  const data = {
    rapidAssessmentId: assessment.rapidAssessmentId,
    waterSource: assessment.waterSource,
    isWaterSufficient: assessment.isWaterSufficient,
    hasCleanWaterAccess: assessment.hasCleanWaterAccess,
    functionalLatrinesAvailable: assessment.functionalLatrinesAvailable,
    areLatrinesSufficient: assessment.areLatrinesSufficient,
    hasHandwashingFacilities: assessment.hasHandwashingFacilities,
    hasOpenDefecationConcerns: assessment.hasOpenDefecationConcerns,
    additionalWashDetails: assessment.additionalWashDetails,
    rapidAssessmentDate: assessment.rapidAssessment.rapidAssessmentDate,
    verificationStatus: assessment.rapidAssessment.verificationStatus,
    assessorName: assessment.rapidAssessment.assessorName || assessment.rapidAssessment.assessor?.name || 'Unknown',
  };

  const gapAnalysis = await analyzeWASHGaps(data);

  return {
    ...data,
    gapAnalysis
  };
}

async function getLatestShelterAssessment(entityId: string): Promise<(ShelterAssessmentData & { gapAnalysis: ShelterGapAnalysis }) | null> {
  const assessment = await db.shelterAssessment.findFirst({
    where: {
      rapidAssessment: {
        entityId: entityId,
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
      },
    },
    include: {
      rapidAssessment: {
        select: {
          id: true,
          rapidAssessmentDate: true,
          verificationStatus: true,
          assessorName: true,
          assessor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      rapidAssessment: {
        rapidAssessmentDate: 'desc',
      },
    },
  });

  if (!assessment) return null;

  const data = {
    rapidAssessmentId: assessment.rapidAssessmentId,
    areSheltersSufficient: assessment.areSheltersSufficient,
    hasSafeStructures: assessment.hasSafeStructures,
    shelterTypes: assessment.shelterTypes,
    requiredShelterType: assessment.requiredShelterType,
    numberSheltersRequired: assessment.numberSheltersRequired,
    areOvercrowded: assessment.areOvercrowded,
    provideWeatherProtection: assessment.provideWeatherProtection,
    additionalShelterDetails: assessment.additionalShelterDetails,
    rapidAssessmentDate: assessment.rapidAssessment.rapidAssessmentDate,
    verificationStatus: assessment.rapidAssessment.verificationStatus,
    assessorName: assessment.rapidAssessment.assessorName || assessment.rapidAssessment.assessor?.name || 'Unknown',
  };

  const gapAnalysis = await analyzeShelterGaps(data);

  return {
    ...data,
    gapAnalysis
  };
}

async function getLatestSecurityAssessment(entityId: string): Promise<(SecurityAssessmentData & { gapAnalysis: SecurityGapAnalysis }) | null> {
  const assessment = await db.securityAssessment.findFirst({
    where: {
      rapidAssessment: {
        entityId: entityId,
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
      },
    },
    include: {
      rapidAssessment: {
        select: {
          id: true,
          rapidAssessmentDate: true,
          verificationStatus: true,
          assessorName: true,
          assessor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      rapidAssessment: {
        rapidAssessmentDate: 'desc',
      },
    },
  });

  if (!assessment) return null;

  const data = {
    rapidAssessmentId: assessment.rapidAssessmentId,
    isSafeFromViolence: assessment.isSafeFromViolence,
    gbvCasesReported: assessment.gbvCasesReported,
    hasSecurityPresence: assessment.hasSecurityPresence,
    hasProtectionReportingMechanism: assessment.hasProtectionReportingMechanism,
    vulnerableGroupsHaveAccess: assessment.vulnerableGroupsHaveAccess,
    hasLighting: assessment.hasLighting,
    additionalSecurityDetails: assessment.additionalSecurityDetails,
    rapidAssessmentDate: assessment.rapidAssessment.rapidAssessmentDate,
    verificationStatus: assessment.rapidAssessment.verificationStatus,
    assessorName: assessment.rapidAssessment.assessorName || assessment.rapidAssessment.assessor?.name || 'Unknown',
  };

  const gapAnalysis = await analyzeSecurityGaps(data);

  return {
    ...data,
    gapAnalysis
  };
}

async function getLatestPopulationAssessment(entityId: string): Promise<PopulationAssessmentData | null> {
  const assessment = await db.populationAssessment.findFirst({
    where: {
      rapidAssessment: {
        entityId: entityId,
        verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
      },
    },
    include: {
      rapidAssessment: {
        select: {
          id: true,
          rapidAssessmentDate: true,
          verificationStatus: true,
          assessorName: true,
          assessor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      rapidAssessment: {
        rapidAssessmentDate: 'desc',
      },
    },
  });

  if (!assessment) return null;

  return {
    rapidAssessmentId: assessment.rapidAssessmentId,
    totalHouseholds: assessment.totalHouseholds,
    totalPopulation: assessment.totalPopulation,
    populationMale: assessment.populationMale,
    populationFemale: assessment.populationFemale,
    populationUnder5: assessment.populationUnder5,
    pregnantWomen: assessment.pregnantWomen,
    lactatingMothers: assessment.lactatingMothers,
    personWithDisability: assessment.personWithDisability,
    elderlyPersons: assessment.elderlyPersons,
    separatedChildren: assessment.separatedChildren,
    numberLivesLost: assessment.numberLivesLost,
    numberInjured: assessment.numberInjured,
    additionalPopulationDetails: assessment.additionalPopulationDetails,
    rapidAssessmentDate: assessment.rapidAssessment.rapidAssessmentDate,
    verificationStatus: assessment.rapidAssessment.verificationStatus,
    assessorName: assessment.rapidAssessment.assessorName || assessment.rapidAssessment.assessor?.name || 'Unknown',
  };
}



// Aggregation functions (simplified for this implementation)
function aggregateHealthAssessments(entityAssessments: EntityAssessment[]): any {
  const healthAssessments = entityAssessments.map(e => e.latestAssessments.health).filter(Boolean);
  
  // Return null if no health assessments exist
  if (healthAssessments.length === 0) {
    return null;
  }
  
  return {
    totalEntities: healthAssessments.length,
    entitiesWithGaps: healthAssessments.filter(a => a.gapAnalysis.hasGap).length,
    entitiesWithoutGaps: healthAssessments.filter(a => !a.gapAnalysis.hasGap).length,
    totalHealthFacilities: healthAssessments.reduce((sum, a) => sum + (a.numberHealthFacilities || 0), 0),
    totalQualifiedWorkers: healthAssessments.reduce((sum, a) => sum + (a.qualifiedHealthWorkers || 0), 0)
  };
}

function aggregateFoodAssessments(entityAssessments: EntityAssessment[]): any {
  const foodAssessments = entityAssessments.map(e => e.latestAssessments.food).filter(Boolean);
  
  // Return null if no food assessments exist
  if (foodAssessments.length === 0) {
    return null;
  }
  
  return {
    totalEntities: foodAssessments.length,
    entitiesWithGaps: foodAssessments.filter(a => a.gapAnalysis.hasGap).length,
    entitiesWithoutGaps: foodAssessments.filter(a => !a.gapAnalysis.hasGap).length,
    averageFoodDuration: foodAssessments.reduce((sum, a) => sum + (a.availableFoodDurationDays || 0), 0) / foodAssessments.length,
    totalAdditionalPersonsRequired: foodAssessments.reduce((sum, a) => sum + (a.additionalFoodRequiredPersons || 0), 0)
  };
}

function aggregateWASHAssessments(entityAssessments: EntityAssessment[]): any {
  const washAssessments = entityAssessments.map(e => e.latestAssessments.wash).filter(Boolean);
  
  // Return null if no WASH assessments exist
  if (washAssessments.length === 0) {
    return null;
  }
  
  return {
    totalEntities: washAssessments.length,
    entitiesWithGaps: washAssessments.filter(a => a.gapAnalysis.hasGap).length,
    entitiesWithoutGaps: washAssessments.filter(a => !a.gapAnalysis.hasGap).length,
    totalFunctionalLatrines: washAssessments.reduce((sum, a) => sum + (a.functionalLatrinesAvailable || 0), 0)
  };
}

function aggregateShelterAssessments(entityAssessments: EntityAssessment[]): any {
  const shelterAssessments = entityAssessments.map(e => e.latestAssessments.shelter).filter(Boolean);
  
  // Return null if no shelter assessments exist
  if (shelterAssessments.length === 0) {
    return null;
  }
  
  return {
    totalEntities: shelterAssessments.length,
    entitiesWithGaps: shelterAssessments.filter(a => a.gapAnalysis.hasGap).length,
    entitiesWithoutGaps: shelterAssessments.filter(a => !a.gapAnalysis.hasGap).length,
    totalSheltersRequired: shelterAssessments.reduce((sum, a) => sum + (a.numberSheltersRequired || 0), 0)
  };
}

function aggregateSecurityAssessments(entityAssessments: EntityAssessment[]): any {
  const securityAssessments = entityAssessments.map(e => e.latestAssessments.security).filter(Boolean);
  
  // Return null if no security assessments exist
  if (securityAssessments.length === 0) {
    return null;
  }
  
  return {
    totalEntities: securityAssessments.length,
    entitiesWithGaps: securityAssessments.filter(a => a.gapAnalysis.hasGap).length,
    entitiesWithoutGaps: securityAssessments.filter(a => !a.gapAnalysis.hasGap).length
  };
}

function aggregatePopulationAssessments(entityAssessments: EntityAssessment[]): any {
  const populationAssessments = entityAssessments.map(e => e.latestAssessments.population).filter(Boolean);
  return {
    totalEntities: populationAssessments.length,
    totalPopulation: populationAssessments.reduce((sum, a) => sum + (a.totalPopulation || 0), 0),
    totalHouseholds: populationAssessments.reduce((sum, a) => sum + (a.totalHouseholds || 0), 0),
    totalLivesLost: populationAssessments.reduce((sum, a) => sum + (a.numberLivesLost || 0), 0),
    totalInjured: populationAssessments.reduce((sum, a) => sum + (a.numberInjured || 0), 0)
  };
}

// Gap analysis summary function
async function getGapAnalysisSummary(incidentId: string): Promise<GapAnalysisSummary> {
  if (!incidentId || typeof incidentId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(incidentId)) {
    throw new Error('Invalid incident ID format');
  }

  // Get real entities data from database
  const entities = await db.entity.findMany({
    where: {
      rapidAssessments: {
        some: {
          incidentId: incidentId,
        },
      },
      isActive: true,
    },
    include: {
      rapidAssessments: {
        where: {
          incidentId: incidentId,
          verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
        },
        orderBy: {
          rapidAssessmentDate: 'desc',
        },
        take: 5, // Latest assessment for each type
        include: {
          healthAssessment: true,
          foodAssessment: true,
          washAssessment: true,
          shelterAssessment: true,
          securityAssessment: true,
        },
      },
    },
  });

  const totalEntities = entities.length;

  // Initialize assessment type gaps
  const assessmentTypeGaps: { [key: string]: { severity: 'high' | 'medium' | 'low'; entitiesAffected: number; percentage: number } } = {
    HEALTH: { severity: 'low', entitiesAffected: 0, percentage: 0 },
    FOOD: { severity: 'low', entitiesAffected: 0, percentage: 0 },
    WASH: { severity: 'low', entitiesAffected: 0, percentage: 0 },
    SHELTER: { severity: 'low', entitiesAffected: 0, percentage: 0 },
    SECURITY: { severity: 'low', entitiesAffected: 0, percentage: 0 }
  };

  // Initialize severity distribution
  const severityDistribution = { high: 0, medium: 0, low: 0 };

  // Analyze real gap data from entities
  const assessmentTypeCounts = {
    HEALTH: { entitiesWithGaps: 0, totalEntities: 0 },
    FOOD: { entitiesWithGaps: 0, totalEntities: 0 },
    WASH: { entitiesWithGaps: 0, totalEntities: 0 },
    SHELTER: { entitiesWithGaps: 0, totalEntities: 0 },
    SECURITY: { entitiesWithGaps: 0, totalEntities: 0 },
  };

  // Analyze each entity's assessments
  for (const entity of entities) {
    let entitySeverity: 'high' | 'medium' | 'low' = 'low';
    
    for (const assessment of entity.rapidAssessments) {
      // Check each assessment type for gaps
      if (assessment.healthAssessment) {
        assessmentTypeCounts.HEALTH.totalEntities++;
        const healthGaps = await analyzeHealthGaps(assessment.healthAssessment);
        if (healthGaps.hasGap) {
          assessmentTypeCounts.HEALTH.entitiesWithGaps++;
          if (healthGaps.severity === 'CRITICAL' || healthGaps.severity === 'HIGH') {
            entitySeverity = 'high';
          } else if (healthGaps.severity === 'MEDIUM' && entitySeverity !== 'high') {
            entitySeverity = 'medium';
          }
        }
      }

      if (assessment.foodAssessment) {
        assessmentTypeCounts.FOOD.totalEntities++;
        const foodGaps = await analyzeFoodGaps(assessment.foodAssessment);
        if (foodGaps.hasGap) {
          assessmentTypeCounts.FOOD.entitiesWithGaps++;
          if (foodGaps.severity === 'CRITICAL' || foodGaps.severity === 'HIGH') {
            entitySeverity = 'high';
          } else if (foodGaps.severity === 'MEDIUM' && entitySeverity !== 'high') {
            entitySeverity = 'medium';
          }
        }
      }

      if (assessment.washAssessment) {
        assessmentTypeCounts.WASH.totalEntities++;
        const washGaps = await analyzeWASHGaps(assessment.washAssessment);
        if (washGaps.hasGap) {
          assessmentTypeCounts.WASH.entitiesWithGaps++;
          if (washGaps.severity === 'CRITICAL' || washGaps.severity === 'HIGH') {
            entitySeverity = 'high';
          } else if (washGaps.severity === 'MEDIUM' && entitySeverity !== 'high') {
            entitySeverity = 'medium';
          }
        }
      }

      if (assessment.shelterAssessment) {
        assessmentTypeCounts.SHELTER.totalEntities++;
        const shelterGaps = await analyzeShelterGaps(assessment.shelterAssessment);
        if (shelterGaps.hasGap) {
          assessmentTypeCounts.SHELTER.entitiesWithGaps++;
          if (shelterGaps.severity === 'CRITICAL' || shelterGaps.severity === 'HIGH') {
            entitySeverity = 'high';
          } else if (shelterGaps.severity === 'MEDIUM' && entitySeverity !== 'high') {
            entitySeverity = 'medium';
          }
        }
      }

      if (assessment.securityAssessment) {
        assessmentTypeCounts.SECURITY.totalEntities++;
        const securityGaps = await analyzeSecurityGaps(assessment.securityAssessment);
        if (securityGaps.hasGap) {
          assessmentTypeCounts.SECURITY.entitiesWithGaps++;
          if (securityGaps.severity === 'CRITICAL' || securityGaps.severity === 'HIGH') {
            entitySeverity = 'high';
          } else if (securityGaps.severity === 'MEDIUM' && entitySeverity !== 'high') {
            entitySeverity = 'medium';
          }
        }
      }
    }

    // Update severity distribution
    severityDistribution[entitySeverity]++;
  }

  // Calculate percentages for assessment types
  for (const key in assessmentTypeGaps) {
    const counts = assessmentTypeCounts[key as keyof typeof assessmentTypeCounts];
    const entitiesAffected = counts.entitiesWithGaps;
    const total = counts.totalEntities;
    const percentage = total > 0 ? (entitiesAffected / total) * 100 : 0;
    
    assessmentTypeGaps[key].entitiesAffected = entitiesAffected;
    assessmentTypeGaps[key].percentage = percentage;
    
    // Determine severity based on percentage
    if (percentage >= 60) assessmentTypeGaps[key].severity = 'high';
    else if (percentage >= 30) assessmentTypeGaps[key].severity = 'medium';
    else assessmentTypeGaps[key].severity = 'low';
  }

  return {
    totalEntities,
    severityDistribution,
    assessmentTypeGaps,
    lastUpdated: new Date().toISOString()
  };
}

// Interactive map helper function
async function getEntityLocations(
  incidentId?: string,
  severityFilter?: string,
  entityTypeFilter?: string,
  includeDonorAssignments?: boolean
): Promise<EntityLocationsResponse> {
  try {
    // Validate inputs to prevent SQL injection
    if (incidentId && (!/^[a-zA-Z0-9_-]+$/.test(incidentId) || typeof incidentId !== 'string')) {
      throw new Error('Invalid incident ID format');
    }
    if (severityFilter && !/^[A-Z_]+$/.test(severityFilter)) {
      throw new Error('Invalid severity filter format');
    }
    if (entityTypeFilter && !/^[A-Z_]+$/.test(entityTypeFilter)) {
      throw new Error('Invalid entity type filter format');
    }

    // Get entities with coordinates and gap analysis - Fixed SQL injection with conditional queries
    const entitiesWithLocations = await (async () => {
      if (incidentId) {
        if (severityFilter && severityFilter !== 'ALL' && entityTypeFilter && entityTypeFilter !== 'ALL') {
          return db.$queryRaw`
            SELECT DISTINCT
              e.id,
              e.name,
              e.type,
              e.coordinates,
              'MEDIUM' as severity,
              ra."rapidAssessmentDate" as "affectedAt"
            FROM entities e
            INNER JOIN rapid_assessments ra ON e.id = ra."entityId"
              AND ra."incidentId" = ${incidentId}
              AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
            WHERE e.type = ${entityTypeFilter}
              AND e.coordinates IS NOT NULL
              AND e.coordinates->>'latitude' IS NOT NULL
              AND e.coordinates->>'longitude' IS NOT NULL
            ORDER BY e.name
            LIMIT 500
          ` as Array<{
            id: string;
            name: string;
            type: string;
            coordinates: Json;
            severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
            affectedAt: Date;
          }>;
        } else if (severityFilter && severityFilter !== 'ALL') {
          return db.$queryRaw`
            SELECT DISTINCT
              e.id,
              e.name,
              e.type,
              e.coordinates,
              'MEDIUM' as severity,
              ra."rapidAssessmentDate" as "affectedAt"
            FROM entities e
            INNER JOIN rapid_assessments ra ON e.id = ra."entityId"
              AND ra."incidentId" = ${incidentId}
              AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
            WHERE e.coordinates IS NOT NULL
              AND e.coordinates->>'latitude' IS NOT NULL
              AND e.coordinates->>'longitude' IS NOT NULL
            ORDER BY e.name
            LIMIT 500
          ` as Array<{
            id: string;
            name: string;
            type: string;
            coordinates: Json;
            severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
            affectedAt: Date;
          }>;
        } else if (entityTypeFilter && entityTypeFilter !== 'ALL') {
          return db.$queryRaw`
            SELECT DISTINCT
              e.id,
              e.name,
              e.type,
              e.coordinates,
              'MEDIUM' as severity,
              ra."rapidAssessmentDate" as "affectedAt"
            FROM entities e
            INNER JOIN rapid_assessments ra ON e.id = ra."entityId"
              AND ra."incidentId" = ${incidentId}
              AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
            WHERE e.type = ${entityTypeFilter}
              AND e.coordinates IS NOT NULL
              AND e.coordinates->>'latitude' IS NOT NULL
              AND e.coordinates->>'longitude' IS NOT NULL
            ORDER BY e.name
            LIMIT 500
          ` as Array<{
            id: string;
            name: string;
            type: string;
            coordinates: Json;
            severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
            affectedAt: Date;
          }>;
        } else {
          return db.$queryRaw`
            SELECT DISTINCT
              e.id,
              e.name,
              e.type,
              e.coordinates,
              'MEDIUM' as severity,
              ra."rapidAssessmentDate" as "affectedAt"
            FROM entities e
            INNER JOIN rapid_assessments ra ON e.id = ra."entityId"
              AND ra."incidentId" = ${incidentId}
              AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
            WHERE e.coordinates IS NOT NULL
              AND e.coordinates->>'latitude' IS NOT NULL
              AND e.coordinates->>'longitude' IS NOT NULL
            ORDER BY e.name
            LIMIT 500
          ` as Array<{
            id: string;
            name: string;
            type: string;
            coordinates: Json;
            severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
            affectedAt: Date;
          }>;
        }
      } else {
        // No incident filter - get all entities with assessments
        return db.$queryRaw`
          SELECT DISTINCT
            e.id,
            e.name,
            e.type,
            e.coordinates,
            'MEDIUM' as severity,
            ra."rapidAssessmentDate" as "affectedAt"
          FROM entities e
          INNER JOIN rapid_assessments ra ON e.id = ra."entityId"
            AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
          WHERE e.coordinates IS NOT NULL
            AND e.coordinates->>'latitude' IS NOT NULL
            AND e.coordinates->>'longitude' IS NOT NULL
          ORDER BY e.name
          LIMIT 500
        ` as Array<{
          id: string;
          name: string;
          type: string;
          coordinates: Json;
          severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
          affectedAt: Date;
        }>;
      }
    })();

    // Process entities and calculate gap summary
    const processedEntities: EntityLocation[] = [];
    
    for (const entity of entitiesWithLocations) {
      // Get gap analysis for this entity
      const gapAnalysisQuery = await db.$queryRaw`
        SELECT 
          ra."rapidAssessmentType",
          ra."gapAnalysis",
          ra."verificationStatus"
        FROM rapid_assessments ra
        WHERE ra."entityId" = ${entity.id}
          AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
        ORDER BY ra."assessmentDate" DESC
      ` as Array<{
        rapidAssessmentType: string;
        gapAnalysis: Json;
        verificationStatus: string;
      }>;

      // Calculate gap summary
      let totalGaps = 0;
      let totalNoGaps = 0;
      let criticalGaps = 0;
      let worstSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

      for (const assessment of gapAnalysisQuery) {
        if (assessment.gapAnalysis && typeof assessment.gapAnalysis === 'object') {
          const gapData = assessment.gapAnalysis as any;
          if (gapData.hasGap) {
            totalGaps++;
            if (gapData.severity === 'CRITICAL') criticalGaps++;
            
            // Update worst severity
            if (gapData.severity === 'CRITICAL') worstSeverity = 'CRITICAL';
            else if (gapData.severity === 'HIGH' && worstSeverity !== 'CRITICAL') worstSeverity = 'HIGH';
            else if (gapData.severity === 'MEDIUM' && worstSeverity === 'LOW') worstSeverity = 'MEDIUM';
          } else {
            totalNoGaps++;
          }
        }
      }

      // Parse coordinates
      let coordinates: { latitude: number; longitude: number } | undefined;
      try {
        if (typeof entity.coordinates === 'object' && entity.coordinates !== null) {
          const coords = entity.coordinates as any;
          coordinates = {
            latitude: parseFloat(coords.latitude || coords.lat || 0),
            longitude: parseFloat(coords.longitude || coords.lng || 0)
          };
        }
      } catch (error) {
        console.warn('Error parsing coordinates for entity:', entity.id);
        continue;
      }

      if (!coordinates) continue;

      // Get donor assignments if requested
      let donorAssignments: EntityLocation['donorAssignments'] = [];
      if (includeDonorAssignments && incidentId) {
        const donorData = await db.$queryRaw`
          SELECT 
            dc.id,
            d.name as "donorName",
            dc.status as "commitmentStatus",
            dc.items
          FROM donor_commitments dc
          INNER JOIN donors d ON dc."donorId" = d.id
          WHERE dc."entityId" = ${entity.id}
            AND dc."incidentId" = ${incidentId}
          ORDER BY dc."createdAt" DESC
        ` as Array<{
          id: string;
          donorName: string;
          commitmentStatus: string;
          items: Json;
        }>;

        donorAssignments = donorData.map(donor => ({
          donorId: donor.id,
          donorName: donor.donorName,
          commitmentStatus: donor.commitmentStatus,
          items: Array.isArray(donor.items) ? donor.items : []
        }));
      }

      processedEntities.push({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        coordinates,
        severity: entity.severity,
        gapSummary: {
          totalGaps,
          totalNoGaps,
          criticalGaps,
          severity: totalGaps > 0 ? worstSeverity : 'LOW'
        },
        donorAssignments: donorAssignments.length > 0 ? donorAssignments : undefined
      });
    }

    // Calculate map bounds
    let mapBounds = {
      northEast: { lat: 10.0, lng: 8.0 }, // Default to Nigeria bounds
      southWest: { lat: 4.0, lng: 3.0 }
    };

    if (processedEntities.length > 0) {
      const lats = processedEntities.map(e => e.coordinates!.latitude);
      const lngs = processedEntities.map(e => e.coordinates!.longitude);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Add padding
      const latPadding = (maxLat - minLat) * 0.1;
      const lngPadding = (maxLng - minLng) * 0.1;
      
      mapBounds = {
        northEast: { lat: maxLat + latPadding, lng: maxLng + lngPadding },
        southWest: { lat: minLat - latPadding, lng: minLng - lngPadding }
      };
    }

    return {
      entities: processedEntities,
      mapBounds,
      totalCount: processedEntities.length
    };
  } catch (error) {
    console.error('Error fetching entity locations:', error);
    return {
      entities: [],
      mapBounds: {
        northEast: { lat: 10.0, lng: 8.0 },
        southWest: { lat: 4.0, lng: 3.0 }
      },
      totalCount: 0
    };
  }
}

/**
 * GET /api/v1/dashboard/situation
 * 
 * Returns aggregated data for the situation dashboard
 * 
 * Query Parameters:
 * - incidentId: Filter by specific incident (optional)
 * - entityId: Filter by specific entity or "all" for aggregated (optional)
 * - realTime: Enable real-time updates (default: false)
 * - includeHistorical: Include historical data (default: false)
 * - limit: Limit number of records returned (default: 50)
 */
export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    // Apply rate limiting
    if (RateLimiter.isRateLimited(request, 100, 60000)) { // 100 requests per minute
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
          }
        }
      );
    }

    // Check role permissions
    if (!context.roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = DashboardQuerySchema.parse({
      incidentId: searchParams.get('incidentId'),
      entityId: searchParams.get('entityId'),
      realTime: searchParams.get('realTime') || 'false',
      includeHistorical: searchParams.get('includeHistorical') || 'false',
      limit: searchParams.get('limit') || '50',
      includeEntityLocations: searchParams.get('includeEntityLocations') || 'false',
      includeDonorAssignments: searchParams.get('includeDonorAssignments') || 'false',
      severityFilter: searchParams.get('severityFilter'),
      entityTypeFilter: searchParams.get('entityTypeFilter'),
      includeGapSummary: searchParams.get('includeGapSummary') || 'false'
    });

    // Fetch real incidents from database
    const incidents = await (async (): Promise<IncidentSummary[]> => {
      const incidentQuery = queryParams.incidentId
        ? db.incident.findMany({
            where: {
              id: queryParams.incidentId,
            },
            include: {
              preliminaryAssessments: {
                select: {
                  numberLivesLost: true,
                  numberInjured: true,
                  numberDisplaced: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: queryParams.limit,
          })
        : db.incident.findMany({
            where: {
              status: { in: ['ACTIVE', 'CONTAINED'] },
            },
            include: {
              preliminaryAssessments: {
                select: {
                  numberLivesLost: true,
                  numberInjured: true,
                  numberDisplaced: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: queryParams.limit,
          });

      const rawIncidents = await incidentQuery;

      return rawIncidents.map(incident => {
        const populationImpact = incident.preliminaryAssessments.reduce(
          (sum, assessment) => sum + (assessment.numberDisplaced || 0),
          0
        );

        return {
          id: incident.id,
          type: incident.type,
          subType: incident.subType,
          severity: incident.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
          status: incident.status as 'ACTIVE' | 'CONTAINED' | 'RESOLVED',
          description: incident.description,
          location: incident.location,
          coordinates: incident.coordinates,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
          populationImpact,
        };
      });
    })();

    // Removed duplicate line - incidents already defined above

    // Calculate duration for each incident
    const incidentsWithDuration = incidents.map(incident => {
      const durationInfo = calculateDurationInfo(incident);
      return {
        ...incident,
        ...durationInfo
      };
    });

    // Fetch real entities from database
    const rawEntities = await (async () => {
      if (!queryParams.incidentId) {
        return [];
      }

      // Get entities that have assessments for this incident
      const entitiesQuery = await db.entity.findMany({
        where: {
          rapidAssessments: {
            some: {
              incidentId: queryParams.incidentId,
              verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
            },
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          coordinates: true,
        },
        orderBy: { name: 'asc' },
        take: queryParams.limit,
      });

      return entitiesQuery;
    })();

    // Transform entities data - fetch latest assessments for each entity
    const entities = [];
    for (const entity of rawEntities) {
      try {
        // Fetch latest assessments using the proper functions
        const [
          healthAssessment,
          foodAssessment,
          washAssessment,
          shelterAssessment,
          securityAssessment,
          populationAssessment
        ] = await Promise.all([
          getLatestHealthAssessment(entity.id),
          getLatestFoodAssessment(entity.id),
          getLatestWASHAssessment(entity.id),
          getLatestShelterAssessment(entity.id),
          getLatestSecurityAssessment(entity.id),
          getLatestPopulationAssessment(entity.id)
        ]);

        // Build latest assessments object with only existing assessments
        const latestAssessments: any = {};
        let lastUpdated = new Date();

        if (healthAssessment) {
          latestAssessments.HEALTH = {
            id: healthAssessment.rapidAssessmentId,
            date: healthAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: healthAssessment.verificationStatus === 'VERIFIED' || healthAssessment.verificationStatus === 'AUTO_VERIFIED',
            assessorName: healthAssessment.assessorName,
            gapIndicators: {
              hasGap: healthAssessment.gapAnalysis.hasGap,
              severity: healthAssessment.gapAnalysis.severity,
            }
          };
          lastUpdated = new Date(healthAssessment.rapidAssessmentDate) > lastUpdated ? new Date(healthAssessment.rapidAssessmentDate) : lastUpdated;
        }

        if (foodAssessment) {
          latestAssessments.FOOD = {
            id: foodAssessment.rapidAssessmentId,
            date: foodAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: foodAssessment.verificationStatus === 'VERIFIED' || foodAssessment.verificationStatus === 'AUTO_VERIFIED',
            assessorName: foodAssessment.assessorName,
            gapIndicators: {
              hasGap: foodAssessment.gapAnalysis.hasGap,
              severity: foodAssessment.gapAnalysis.severity,
            }
          };
          lastUpdated = new Date(foodAssessment.rapidAssessmentDate) > lastUpdated ? new Date(foodAssessment.rapidAssessmentDate) : lastUpdated;
        }

        if (washAssessment) {
          latestAssessments.WASH = {
            id: washAssessment.rapidAssessmentId,
            date: washAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: washAssessment.verificationStatus === 'VERIFIED' || washAssessment.verificationStatus === 'AUTO_VERIFIED',
            assessorName: washAssessment.assessorName,
            gapIndicators: {
              hasGap: washAssessment.gapAnalysis.hasGap,
              severity: washAssessment.gapAnalysis.severity,
            }
          };
          lastUpdated = new Date(washAssessment.rapidAssessmentDate) > lastUpdated ? new Date(washAssessment.rapidAssessmentDate) : lastUpdated;
        }

        if (shelterAssessment) {
          latestAssessments.SHELTER = {
            id: shelterAssessment.rapidAssessmentId,
            date: shelterAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: shelterAssessment.verificationStatus === 'VERIFIED' || shelterAssessment.verificationStatus === 'AUTO_VERIFIED',
            assessorName: shelterAssessment.assessorName,
            gapIndicators: {
              hasGap: shelterAssessment.gapAnalysis.hasGap,
              severity: shelterAssessment.gapAnalysis.severity,
            }
          };
          lastUpdated = new Date(shelterAssessment.rapidAssessmentDate) > lastUpdated ? new Date(shelterAssessment.rapidAssessmentDate) : lastUpdated;
        }

        if (securityAssessment) {
          latestAssessments.SECURITY = {
            id: securityAssessment.rapidAssessmentId,
            date: securityAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: securityAssessment.verificationStatus === 'VERIFIED' || securityAssessment.verificationStatus === 'AUTO_VERIFIED',
            assessorName: securityAssessment.assessorName,
            gapIndicators: {
              hasGap: securityAssessment.gapAnalysis.hasGap,
              severity: securityAssessment.gapAnalysis.severity,
            }
          };
          lastUpdated = new Date(securityAssessment.rapidAssessmentDate) > lastUpdated ? new Date(securityAssessment.rapidAssessmentDate) : lastUpdated;
        }

        if (populationAssessment) {
          latestAssessments.POPULATION = {
            id: populationAssessment.rapidAssessmentId,
            date: populationAssessment.rapidAssessmentDate,
            status: 'VERIFIED',
            verified: populationAssessment.verificationStatus === 'VERIFIED' || populationAssessment.verificationStatus === 'AUTO_VERIFIED',
            assessorName: populationAssessment.assessorName,
            gapIndicators: {
              hasGap: false, // Population assessments don't have gap analysis
              severity: 'LOW',
            }
          };
          lastUpdated = new Date(populationAssessment.rapidAssessmentDate) > lastUpdated ? new Date(populationAssessment.rapidAssessmentDate) : lastUpdated;
        }

        entities.push({
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.type,
          location: entity.location,
          coordinates: entity.coordinates,
          latestAssessments,
          lastUpdated
        });

      } catch (error) {
        console.error(`Error fetching assessments for entity ${entity.id}:`, error);
        // Add entity with empty assessments if there's an error
        entities.push({
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.type,
          location: entity.location,
          coordinates: entity.coordinates,
          latestAssessments: {},
          lastUpdated: new Date()
        });
      }
    }

    // Compute gap analysis
    const gaps = entities.map(entity => {
      const assessmentGaps: any = {};
      let totalGapCount = 0;
      let hasCriticalGaps = false;
      let hasHighGaps = false;

      Object.entries(entity.latestAssessments).forEach(([type, assessment]: [string, any]) => {
        const gapAnalysis = {
          hasGap: assessment.gapIndicators.hasGap,
          severity: assessment.gapIndicators.severity,
          lastAssessed: assessment.date,
          indicators: getGapIndicatorsByType(type)
        };

        assessmentGaps[type] = gapAnalysis;
        
        if (gapAnalysis.hasGap) {
          totalGapCount++;
          if (gapAnalysis.severity === 'CRITICAL') hasCriticalGaps = true;
          if (gapAnalysis.severity === 'HIGH') hasHighGaps = true;
        }
      });

      // Determine overall gap severity
      let overallGapSeverity: 'LOW' = 'LOW';
      if (hasCriticalGaps) overallGapSeverity = 'CRITICAL';
      else if (hasHighGaps) overallGapSeverity = 'HIGH';
      else if (totalGapCount > 0) overallGapSeverity = 'MEDIUM';

      return {
        entityId: entity.entityId,
        entityName: entity.entityName,
        entityType: entity.entityType,
        location: entity.location,
        assessmentGaps,
        overallGapSeverity,
        totalGapCount,
        lastUpdated: entity.lastUpdated
      };
    });

    // Add selected incident data if incidentId is provided
    let selectedIncidentData = undefined;
    if (queryParams.incidentId) {
      const selectedIncident = incidentsWithDuration.find(i => i.id === queryParams.incidentId);
      if (selectedIncident) {
        const [populationImpact, aggregateMetrics] = await Promise.all([
          getPopulationImpact(queryParams.incidentId),
          getAggregateMetrics(queryParams.incidentId)
        ]);

        selectedIncidentData = {
          incident: selectedIncident,
          populationImpact,
          aggregateMetrics
        };
      }
    }

    // Fetch entity assessment data
    let entityAssessments: EntityAssessment[] = [];
    let aggregatedAssessments: AggregatedAssessments | undefined;
    
    if (queryParams.incidentId) {
      if (queryParams.entityId === 'all') {
        // Get all entities for this incident
        entityAssessments = await getEntityAssessments(queryParams.incidentId);
        
        // Calculate aggregated assessments for all entities
        aggregatedAssessments = {
          health: aggregateHealthAssessments(entityAssessments),
          food: aggregateFoodAssessments(entityAssessments),
          wash: aggregateWASHAssessments(entityAssessments),
          shelter: aggregateShelterAssessments(entityAssessments),
          security: aggregateSecurityAssessments(entityAssessments),
          gapSummary: {
            totalGaps: 0,
            totalNoGaps: 0,
            criticalGaps: 0,
            entitiesWithGaps: 0,
            entitiesWithoutGaps: 0
          }
        };
        
        // Calculate gap summary
        const allGapBasedAssessments = [
          ...entityAssessments.map(e => e.latestAssessments.health).filter(Boolean),
          ...entityAssessments.map(e => e.latestAssessments.food).filter(Boolean),
          ...entityAssessments.map(e => e.latestAssessments.wash).filter(Boolean),
          ...entityAssessments.map(e => e.latestAssessments.shelter).filter(Boolean),
          ...entityAssessments.map(e => e.latestAssessments.security).filter(Boolean)
        ];
        
        aggregatedAssessments.gapSummary = {
          totalGaps: allGapBasedAssessments.filter(a => a.gapAnalysis.hasGap).length,
          totalNoGaps: allGapBasedAssessments.filter(a => !a.gapAnalysis.hasGap).length,
          criticalGaps: allGapBasedAssessments.filter(a => a.gapAnalysis.severity === 'CRITICAL').length,
          entitiesWithGaps: entityAssessments.filter(e => {
            const entityGaps = [
              e.latestAssessments.health?.gapAnalysis.hasGap,
              e.latestAssessments.food?.gapAnalysis.hasGap,
              e.latestAssessments.wash?.gapAnalysis.hasGap,
              e.latestAssessments.shelter?.gapAnalysis.hasGap,
              e.latestAssessments.security?.gapAnalysis.hasGap
            ].filter(Boolean);
            return entityGaps.length > 0;
          }).length,
          entitiesWithoutGaps: entityAssessments.filter(e => {
            const entityGaps = [
              e.latestAssessments.health?.gapAnalysis.hasGap,
              e.latestAssessments.food?.gapAnalysis.hasGap,
              e.latestAssessments.wash?.gapAnalysis.hasGap,
              e.latestAssessments.shelter?.gapAnalysis.hasGap,
              e.latestAssessments.security?.gapAnalysis.hasGap
            ].filter(Boolean);
            return entityGaps.length === 0;
          }).length
        };
      } else {
        // Get specific entity assessment data
        entityAssessments = await getEntityAssessments(queryParams.incidentId, queryParams.entityId);
      }
    }

    // Get real entity locations from database
    let entityLocations: EntityLocationsResponse | undefined;
    if (queryParams.includeEntityLocations) {
      entityLocations = await getEntityLocations(
        queryParams.incidentId,
        queryParams.severityFilter,
        queryParams.entityTypeFilter,
        queryParams.includeDonorAssignments
      );
    }

    // Get real gap analysis summary from database
    let gapAnalysisSummary: GapAnalysisSummary | undefined;
    if (queryParams.includeGapSummary && queryParams.incidentId) {
      gapAnalysisSummary = await getGapAnalysisSummary(queryParams.incidentId);
    }

    const dashboardData: SituationDashboardData = {
      incidents: incidentsWithDuration,
      entities: entities,
      gaps: gaps,
      realTimeUpdates: queryParams.realTime,
      lastUpdated: new Date(),
      selectedIncident: selectedIncidentData,
      entityAssessments,
      aggregatedAssessments,
      entityLocations,
      gapAnalysisSummary
    };

    // Add rate limiting headers to successful responses
    const addRateLimitHeaders = (response: NextResponse) => {
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', '99'); // Approximate
      response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());
      return response;
    };

    const response = NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      metadata: {
        recordCounts: {
          incidents: incidentsWithDuration.length,
          entities: entities.length,
          gaps: gaps.length,
          entityLocations: entityLocations?.totalCount || 0
        },
        realTimeEnabled: queryParams.realTime,
        incidentFilter: queryParams.incidentId,
        entityLocationsEnabled: queryParams.includeEntityLocations,
        donorAssignmentsEnabled: queryParams.includeDonorAssignments,
        severityFilter: queryParams.severityFilter,
        entityTypeFilter: queryParams.entityTypeFilter
      }
    });

    return addRateLimitHeaders(response);

  } catch (error) {
    console.error('Dashboard API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

// Helper function
function getGapIndicatorsByType(assessmentType: string) {
  // Placeholder gap indicators by assessment type
  const indicators = {
    HEALTH: [
      { category: 'Medical Supplies', hasGap: Math.random() > 0.7, description: 'Medical supplies insufficient' },
      { category: 'Staff Availability', hasGap: Math.random() > 0.7, description: 'Medical staff unavailable' }
    ],
    WASH: [
      { category: 'Water Access', hasGap: Math.random() > 0.7, description: 'Clean water access issues' },
      { category: 'Sanitation', hasGap: Math.random() > 0.7, description: 'Sanitation facilities inadequate' }
    ],
    SHELTER: [
      { category: 'Shelter Capacity', hasGap: Math.random() > 0.7, description: 'Shelter capacity exceeded' },
      { category: 'Structural Safety', hasGap: Math.random() > 0.7, description: 'Structural safety concerns' }
    ],
    FOOD: [
      { category: 'Food Supply', hasGap: Math.random() > 0.7, description: 'Food supply insufficient' },
      { category: 'Distribution', hasGap: Math.random() > 0.7, description: 'Food distribution problems' }
    ],
    SECURITY: [
      { category: 'Security Presence', hasGap: Math.random() > 0.7, description: 'Security personnel inadequate' },
      { category: 'Violence Prevention', hasGap: Math.random() > 0.7, description: 'Violence prevention measures needed' }
    ],
    POPULATION: [
      { category: 'Population Tracking', hasGap: Math.random() > 0.7, description: 'Population tracking incomplete' },
      { category: 'Vulnerable Groups', hasGap: Math.random() > 0.7, description: 'Vulnerable groups not identified' }
    ]
  };

  return indicators[assessmentType as keyof typeof indicators] || [];
}