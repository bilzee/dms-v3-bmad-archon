import { z } from 'zod';
import { RapidAssessmentType, HEALTH_ISSUES_OPTIONS, FOOD_SOURCE_OPTIONS, WATER_SOURCE_OPTIONS, SHELTER_TYPE_OPTIONS } from '@/types/rapid-assessment';

// Base GPS coordinates schema
export const gpsCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  timestamp: z.date(),
  captureMethod: z.enum(['GPS', 'MANUAL'])
});

// Base rapid assessment schema
export const baseRapidAssessmentSchema = z.object({
  rapidAssessmentType: z.nativeEnum(RapidAssessmentType),
  rapidAssessmentDate: z.date(),
  affectedEntityId: z.string().min(1, 'Entity is required'),
  assessorName: z.string().min(1, 'Assessor name is required'),
  gpsCoordinates: gpsCoordinatesSchema.optional(),
  photos: z.array(z.string()).optional()
});

// Health assessment schema
export const healthAssessmentSchema = z.object({
  hasFunctionalClinic: z.boolean(),
  numberHealthFacilities: z.number().int().min(0),
  healthFacilityType: z.string().min(1, 'Health facility type is required'),
  qualifiedHealthWorkers: z.number().int().min(0),
  hasMedicineSupply: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasMaternalChildServices: z.boolean(),
  commonHealthIssues: z.array(z.enum(HEALTH_ISSUES_OPTIONS)),
  additionalHealthDetails: z.record(z.any()).optional()
});

// Population assessment schema
export const populationAssessmentSchema = z.object({
  totalHouseholds: z.number().int().min(0),
  totalPopulation: z.number().int().min(0),
  populationMale: z.number().int().min(0),
  populationFemale: z.number().int().min(0),
  populationUnder5: z.number().int().min(0),
  pregnantWomen: z.number().int().min(0),
  lactatingMothers: z.number().int().min(0),
  personWithDisability: z.number().int().min(0),
  elderlyPersons: z.number().int().min(0),
  separatedChildren: z.number().int().min(0),
  numberLivesLost: z.number().int().min(0),
  numberInjured: z.number().int().min(0),
  additionalPopulationDetails: z.record(z.any()).optional()
});

// Food assessment schema
export const foodAssessmentSchema = z.object({
  foodSource: z.array(z.enum(FOOD_SOURCE_OPTIONS)).min(1, 'At least one food source is required'),
  availableFoodDurationDays: z.number().int().min(0, 'Duration must be a positive number'),
  additionalFoodRequiredPersons: z.number().int().min(0),
  additionalFoodRequiredHouseholds: z.number().int().min(0),
  additionalFoodDetails: z.record(z.any()).optional()
});

// WASH assessment schema
export const washAssessmentSchema = z.object({
  waterSource: z.array(z.enum(WATER_SOURCE_OPTIONS)).min(1, 'At least one water source is required'),
  isWaterSufficient: z.boolean(),
  functionalLatrinesAvailable: z.number().int().min(0),
  areLatrinesSufficient: z.boolean(),
  hasOpenDefecationConcerns: z.boolean(),
  additionalWashDetails: z.record(z.any()).optional()
});

// Shelter assessment schema
export const shelterAssessmentSchema = z.object({
  areSheltersSufficient: z.boolean(),
  shelterTypes: z.array(z.enum(SHELTER_TYPE_OPTIONS)),
  requiredShelterType: z.array(z.enum(SHELTER_TYPE_OPTIONS)),
  numberSheltersRequired: z.number().int().min(0),
  areOvercrowded: z.boolean(),
  provideWeatherProtection: z.boolean(),
  additionalShelterDetails: z.record(z.any()).optional()
});

// Security assessment schema
export const securityAssessmentSchema = z.object({
  gbvCasesReported: z.boolean(),
  hasProtectionReportingMechanism: z.boolean(),
  vulnerableGroupsHaveAccess: z.boolean(),
  additionalSecurityDetails: z.record(z.any()).optional()
});

// Complete assessment schemas for each type
export const createHealthAssessmentSchema = baseRapidAssessmentSchema.extend({
  healthAssessment: healthAssessmentSchema
});

export const createPopulationAssessmentSchema = baseRapidAssessmentSchema.extend({
  populationAssessment: populationAssessmentSchema
});

export const createFoodAssessmentSchema = baseRapidAssessmentSchema.extend({
  foodAssessment: foodAssessmentSchema
});

export const createWASHAssessmentSchema = baseRapidAssessmentSchema.extend({
  washAssessment: washAssessmentSchema
});

export const createShelterAssessmentSchema = baseRapidAssessmentSchema.extend({
  shelterAssessment: shelterAssessmentSchema
});

export const createSecurityAssessmentSchema = baseRapidAssessmentSchema.extend({
  securityAssessment: securityAssessmentSchema
});

// Request parameter schemas
export const assessmentIdSchema = z.string().min(1, 'Assessment ID is required');
export const userIdSchema = z.string().min(1, 'User ID is required');
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10)
});

// Export all schemas for use in API routes
export const rapidAssessmentSchemas = {
  health: createHealthAssessmentSchema,
  population: createPopulationAssessmentSchema,
  food: createFoodAssessmentSchema,
  wash: createWASHAssessmentSchema,
  shelter: createShelterAssessmentSchema,
  security: createSecurityAssessmentSchema
};

// Type exports
export type CreateHealthAssessmentInput = z.infer<typeof createHealthAssessmentSchema>;
export type CreatePopulationAssessmentInput = z.infer<typeof createPopulationAssessmentSchema>;
export type CreateFoodAssessmentInput = z.infer<typeof createFoodAssessmentSchema>;
export type CreateWASHAssessmentInput = z.infer<typeof createWASHAssessmentSchema>;
export type CreateShelterAssessmentInput = z.infer<typeof createShelterAssessmentSchema>;
export type CreateSecurityAssessmentInput = z.infer<typeof createSecurityAssessmentSchema>;
export type GPSCoordinatesInput = z.infer<typeof gpsCoordinatesSchema>;