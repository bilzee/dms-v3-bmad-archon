import { z } from 'zod';

// Assessment type enum from schema
export const AssessmentTypeSchema = z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']);

// Verification status enum from schema  
export const VerificationStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']);

// Entity type enum from schema
export const EntityTypeSchema = z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP']);

// Query parameter validation schemas
export const EntityAssessmentsQuerySchema = z.object({
  category: AssessmentTypeSchema.optional(),
  status: VerificationStatusSchema.optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const LatestAssessmentsQuerySchema = z.object({
  categories: z.array(AssessmentTypeSchema).optional(),
  includeUnverified: z.boolean().optional().default(false)
});

export const AssessmentTrendsQuerySchema = z.object({
  timeframe: z.enum(['3m', '6m', '1y', '2y']).optional().default('1y'),
  categories: z.array(AssessmentTypeSchema).optional(),
  granularity: z.enum(['monthly', 'quarterly', 'yearly']).optional().default('monthly')
});

export const GapAnalysisQuerySchema = z.object({
  categories: z.array(AssessmentTypeSchema).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  includeTrends: z.boolean().optional().default(true)
});

export const ExportRequestSchema = z.object({
  format: z.enum(['pdf', 'csv']).default('pdf'),
  categories: z.array(AssessmentTypeSchema).optional(),
  timeframe: z.string().optional(),
  includeCharts: z.boolean().default(false),
  includeGapAnalysis: z.boolean().default(true),
  includeTrends: z.boolean().default(true)
});

// Entity demographics schema
export const EntityDemographicsSchema = z.object({
  id: z.string().min(1), // Accept any string ID (entity-1, etc.)
  name: z.string(),
  type: EntityTypeSchema,
  location: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional().nullable(), // Allow null coordinates
  demographics: z.object({
    population: z.number().optional().nullable().default(0), // Allow null values with default
    vulnerableCount: z.number().optional().nullable().default(0),
    lga: z.string().optional().nullable(),
    ward: z.string().optional().nullable(),
    campDetails: z.record(z.any()).optional().nullable(),
    communityDetails: z.record(z.any()).optional().nullable(),
    facilityDetails: z.record(z.any()).optional().nullable(),
    householdCount: z.number().optional().nullable(),
    malePopulation: z.number().optional().nullable(),
    femalePopulation: z.number().optional().nullable(),
    childrenUnder5: z.number().optional().nullable(),
    elderlyCount: z.number().optional().nullable(),
    disabilityCount: z.number().optional().nullable()
  }).optional().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Assessment data schemas
export const AssessmentDataSchema = z.object({
  id: z.string().min(1), // Accept any string ID
  type: AssessmentTypeSchema,
  date: z.date(),
  status: VerificationStatusSchema,
  data: z.record(z.any()), // Aggregated data from type-specific tables
  assessor: z.object({
    id: z.string().min(1), // Accept any string ID
    name: z.string(),
    organization: z.string().optional()
  }),
  entity: z.object({
    id: z.string().min(1), // Accept any string ID (entity-1, etc.)
    name: z.string(),
    type: EntityTypeSchema
  })
});

export const EntityAssessmentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    entity: EntityDemographicsSchema,
    assessments: z.array(AssessmentDataSchema),
    pagination: z.object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      hasMore: z.boolean()
    }),
    summary: z.object({
      totalAssessments: z.number(),
      verifiedAssessments: z.number(),
      categories: z.array(z.object({
        type: AssessmentTypeSchema,
        count: z.number(),
        latestDate: z.date().optional()
      }))
    })
  })
});

export const LatestAssessmentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    entityId: z.string(),
    latestAssessments: z.array(z.object({
      type: AssessmentTypeSchema,
      assessment: AssessmentDataSchema.extend({
        summary: z.object({
          overallScore: z.number().optional(),
          criticalGaps: z.array(z.string()),
          keyMetrics: z.record(z.any())
        })
      })
    })),
    lastUpdated: z.date()
  })
});

export const GapAnalysisResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    entityId: z.string().min(1),
    analysisDate: z.date(),
    overallGapScore: z.number(),
    gaps: z.array(z.object({
      category: AssessmentTypeSchema,
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      description: z.string(),
      affectedPopulation: z.number(),
      recommendedActions: z.array(z.string()),
      trend: z.enum(['improving', 'worsening', 'stable']).optional()
    })),
    summary: z.object({
      totalGaps: z.number(),
      criticalGaps: z.number(),
      highPriorityGaps: z.number(),
      mostAffectedCategory: AssessmentTypeSchema
    })
  })
});

export const AssessmentTrendsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    entityId: z.string().min(1),
    timeframe: z.object({
      start: z.date(),
      end: z.date(),
      granularity: z.enum(['monthly', 'quarterly', 'yearly'])
    }),
    trends: z.array(z.object({
      type: AssessmentTypeSchema,
      dataPoints: z.array(z.object({
        period: z.string(),
        score: z.number(),
        gapCount: z.number(),
        assessmentCount: z.number(),
        trend: z.enum(['improving', 'declining', 'stable'])
      }))
    })),
    insights: z.array(z.object({
      category: AssessmentTypeSchema,
      trend: z.string(),
      recommendation: z.string()
    }))
  })
});

export const ExportResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    downloadUrl: z.string(),
    expiresAt: z.date(),
    fileSize: z.number(),
    format: z.string(),
    metadata: z.object({
      entityId: z.string().min(1),
      generatedAt: z.date(),
      categories: z.array(AssessmentTypeSchema).optional(),
      timeframe: z.string().optional()
    })
  })
});

// Type inference from schemas
export type EntityAssessmentsQuery = z.infer<typeof EntityAssessmentsQuerySchema>;
export type LatestAssessmentsQuery = z.infer<typeof LatestAssessmentsQuerySchema>;
export type AssessmentTrendsQuery = z.infer<typeof AssessmentTrendsQuerySchema>;
export type GapAnalysisQuery = z.infer<typeof GapAnalysisQuerySchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type EntityDemographics = z.infer<typeof EntityDemographicsSchema>;
export type AssessmentData = z.infer<typeof AssessmentDataSchema>;
export type EntityAssessmentsResponse = z.infer<typeof EntityAssessmentsResponseSchema>;
export type LatestAssessmentsResponse = z.infer<typeof LatestAssessmentsResponseSchema>;
export type GapAnalysisResponse = z.infer<typeof GapAnalysisResponseSchema>;
export type AssessmentTrendsResponse = z.infer<typeof AssessmentTrendsResponseSchema>;
export type ExportResponse = z.infer<typeof ExportResponseSchema>;