// Rapid Assessment Types for Disaster Management PWA

export enum RapidAssessmentType {
  HEALTH = 'HEALTH',
  WASH = 'WASH',
  SHELTER = 'SHELTER',
  FOOD = 'FOOD',
  SECURITY = 'SECURITY',
  POPULATION = 'POPULATION'
}

export interface BaseRapidAssessment {
  id: string;
  rapidAssessmentType: RapidAssessmentType;
  rapidAssessmentDate: Date;
  affectedEntityId: string;
  assessorName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthAssessment {
  rapidAssessmentId: string;
  hasFunctionalClinic: boolean;
  numberHealthFacilities: number;
  healthFacilityType: string;
  qualifiedHealthWorkers: number;
  hasMedicineSupply: boolean;
  hasMedicalSupplies: boolean;
  hasMaternalChildServices: boolean;
  commonHealthIssues: string[]; // Parsed from JSON string
  additionalHealthDetails?: Record<string, any>;
}

export interface PopulationAssessment {
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
  additionalPopulationDetails?: Record<string, any>;
}

export interface FoodAssessment {
  rapidAssessmentId: string;
  foodSource: string[]; // Parsed from JSON string
  availableFoodDurationDays: number;
  additionalFoodRequiredPersons: number;
  additionalFoodRequiredHouseholds: number;
  additionalFoodDetails?: Record<string, any>;
}

export interface WASHAssessment {
  rapidAssessmentId: string;
  waterSource: string[]; // Parsed from JSON string
  isWaterSufficient: boolean;
  functionalLatrinesAvailable: number;
  areLatrinesSufficient: boolean;
  hasOpenDefecationConcerns: boolean;
  additionalWashDetails?: Record<string, any>;
}

export interface ShelterAssessment {
  rapidAssessmentId: string;
  areSheltersSufficient: boolean;
  shelterTypes: string[]; // Parsed from JSON string
  requiredShelterType: string[]; // Parsed from JSON string
  numberSheltersRequired: number;
  areOvercrowded: boolean;
  provideWeatherProtection: boolean;
  additionalShelterDetails?: Record<string, any>;
}

export interface SecurityAssessment {
  rapidAssessmentId: string;
  gbvCasesReported: boolean;
  hasProtectionReportingMechanism: boolean;
  vulnerableGroupsHaveAccess: boolean;
  additionalSecurityDetails?: Record<string, any>;
}

// Complete assessment with type-specific data
export interface RapidAssessment extends BaseRapidAssessment {
  healthAssessment?: HealthAssessment;
  populationAssessment?: PopulationAssessment;
  foodAssessment?: FoodAssessment;
  washAssessment?: WASHAssessment;
  shelterAssessment?: ShelterAssessment;
  securityAssessment?: SecurityAssessment;
}

// Form submission types
export interface CreateRapidAssessmentRequest {
  rapidAssessmentType: RapidAssessmentType;
  rapidAssessmentDate: Date;
  affectedEntityId: string;
  assessorName: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL';
  };
  photos?: string[]; // Array of file URLs or base64 strings
}

export interface CreateHealthAssessmentRequest extends CreateRapidAssessmentRequest {
  healthAssessment: Omit<HealthAssessment, 'rapidAssessmentId'>;
}

export interface CreatePopulationAssessmentRequest extends CreateRapidAssessmentRequest {
  populationAssessment: Omit<PopulationAssessment, 'rapidAssessmentId'>;
}

export interface CreateFoodAssessmentRequest extends CreateRapidAssessmentRequest {
  foodAssessment: Omit<FoodAssessment, 'rapidAssessmentId'>;
}

export interface CreateWASHAssessmentRequest extends CreateRapidAssessmentRequest {
  washAssessment: Omit<WASHAssessment, 'rapidAssessmentId'>;
}

export interface CreateShelterAssessmentRequest extends CreateRapidAssessmentRequest {
  shelterAssessment: Omit<ShelterAssessment, 'rapidAssessmentId'>;
}

export interface CreateSecurityAssessmentRequest extends CreateRapidAssessmentRequest {
  securityAssessment: Omit<SecurityAssessment, 'rapidAssessmentId'>;
}

export type CreateAssessmentRequest = 
  | CreateHealthAssessmentRequest
  | CreatePopulationAssessmentRequest
  | CreateFoodAssessmentRequest
  | CreateWASHAssessmentRequest
  | CreateShelterAssessmentRequest
  | CreateSecurityAssessmentRequest;

// API Response types
export interface RapidAssessmentResponse {
  success: boolean;
  data?: RapidAssessment;
  message?: string;
  errors?: string[];
}

export interface RapidAssessmentListResponse {
  success: boolean;
  data?: RapidAssessment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  errors?: string[];
}

// Gap analysis types
export interface GapAnalysis {
  assessmentType: RapidAssessmentType;
  hasGaps: boolean;
  gapFields: string[];
  criticalGaps: string[];
  recommendations: string[];
}

export const HEALTH_ISSUES_OPTIONS = [
  'Diarrhea',
  'Malaria', 
  'Respiratory',
  'Malnutrition',
  'Other'
] as const;

export const FOOD_SOURCE_OPTIONS = [
  'Government kitchen',
  'Humanitarian Partners',
  'Community',
  'Individuals',
  'Other'
] as const;

export const WATER_SOURCE_OPTIONS = [
  'Borehole',
  'River/Stream',
  'Water trucks',
  'Tap water',
  'Sachet water',
  'Other'
] as const;

export const SHELTER_TYPE_OPTIONS = [
  'Trampoline',
  'Open space',
  'Local materials',
  'Communal structure',
  'Other'
] as const;