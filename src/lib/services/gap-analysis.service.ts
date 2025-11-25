/**
 * Gap Analysis Service
 * 
 * Provides gap analysis calculation functions that can be used across
 * the application for real-time form indicators and submission workflow.
 */

// Types for gap analysis results
export interface HealthGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

export interface FoodGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

export interface WASHGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

export interface ShelterGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

export interface SecurityGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

// Gap analysis calculation functions
export function analyzeHealthGaps(data: any): HealthGapAnalysis {
  const gapFields: string[] = [];
  let hasGap = false;
  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  // Gap-Indicating fields (when false, indicates a gap)
  if (!data.hasFunctionalClinic) { gapFields.push('hasFunctionalClinic'); hasGap = true; }
  if (!data.hasEmergencyServices) { gapFields.push('hasEmergencyServices'); hasGap = true; }
  if (!data.hasTrainedStaff) { gapFields.push('hasTrainedStaff'); hasGap = true; }
  if (!data.hasMedicineSupply) { gapFields.push('hasMedicineSupply'); hasGap = true; }
  if (!data.hasMedicalSupplies) { gapFields.push('hasMedicalSupplies'); hasGap = true; }
  if (!data.hasMaternalChildServices) { gapFields.push('hasMaternalChildServices'); hasGap = true; }

  // Determine severity based on number of gaps
  if (gapFields.length >= 4) severity = 'CRITICAL';
  else if (gapFields.length >= 3) severity = 'HIGH';
  else if (gapFields.length >= 1) severity = 'MEDIUM';

  const recommendations = generateHealthRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations };
}

export function analyzeFoodGaps(data: any): FoodGapAnalysis {
  const gapFields: string[] = [];
  let hasGap = false;
  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  if (!data.isFoodSufficient) { gapFields.push('isFoodSufficient'); hasGap = true; }
  if (!data.hasRegularMealAccess) { gapFields.push('hasRegularMealAccess'); hasGap = true; }
  if (!data.hasInfantNutrition) { gapFields.push('hasInfantNutrition'); hasGap = true; }

  if (gapFields.length >= 3) severity = 'CRITICAL';
  else if (gapFields.length >= 2) severity = 'HIGH';
  else if (gapFields.length >= 1) severity = 'MEDIUM';

  const recommendations = generateFoodRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations };
}

export function analyzeWASHGaps(data: any): WASHGapAnalysis {
  const gapFields: string[] = [];
  let hasGap = false;
  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  if (!data.isWaterSufficient) { gapFields.push('isWaterSufficient'); hasGap = true; }
  if (!data.hasCleanWaterAccess) { gapFields.push('hasCleanWaterAccess'); hasGap = true; }
  if (!data.areLatrinesSufficient) { gapFields.push('areLatrinesSufficient'); hasGap = true; }
  if (!data.hasHandwashingFacilities) { gapFields.push('hasHandwashingFacilities'); hasGap = true; }
  if (data.hasOpenDefecationConcerns) { gapFields.push('hasOpenDefecationConcerns'); hasGap = true; }

  if (gapFields.length >= 4) severity = 'CRITICAL';
  else if (gapFields.length >= 3) severity = 'HIGH';
  else if (gapFields.length >= 1) severity = 'MEDIUM';

  const recommendations = generateWASHRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations };
}

export function analyzeShelterGaps(data: any): ShelterGapAnalysis {
  const gapFields: string[] = [];
  let hasGap = false;
  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  if (!data.areSheltersSufficient) { gapFields.push('areSheltersSufficient'); hasGap = true; }
  if (!data.hasSafeStructures) { gapFields.push('hasSafeStructures'); hasGap = true; }
  if (data.areOvercrowded) { gapFields.push('areOvercrowded'); hasGap = true; }
  if (!data.provideWeatherProtection) { gapFields.push('provideWeatherProtection'); hasGap = true; }

  if (gapFields.length >= 3) severity = 'CRITICAL';
  else if (gapFields.length >= 2) severity = 'HIGH';
  else if (gapFields.length >= 1) severity = 'MEDIUM';

  const recommendations = generateShelterRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations };
}

export function analyzeSecurityGaps(data: any): SecurityGapAnalysis {
  const gapFields: string[] = [];
  let hasGap = false;
  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  if (!data.isSafeFromViolence) { gapFields.push('isSafeFromViolence'); hasGap = true; }
  if (data.gbvCasesReported) { gapFields.push('gbvCasesReported'); hasGap = true; }
  if (!data.hasSecurityPresence) { gapFields.push('hasSecurityPresence'); hasGap = true; }
  if (!data.hasProtectionReportingMechanism) { gapFields.push('hasProtectionReportingMechanism'); hasGap = true; }
  if (!data.vulnerableGroupsHaveAccess) { gapFields.push('vulnerableGroupsHaveAccess'); hasGap = true; }
  if (!data.hasLighting) { gapFields.push('hasLighting'); hasGap = true; }

  if (gapFields.length >= 4) severity = 'CRITICAL';
  else if (gapFields.length >= 2) severity = 'HIGH';
  else if (gapFields.length >= 1) severity = 'MEDIUM';

  const recommendations = generateSecurityRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations };
}

// Recommendation generation functions
function generateHealthRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('hasFunctionalClinic')) {
    recommendations.push('Deploy mobile clinics or establish temporary health facilities');
  }
  if (gapFields.includes('hasEmergencyServices')) {
    recommendations.push('Establish emergency medical response team with proper equipment');
  }
  if (gapFields.includes('hasTrainedStaff')) {
    recommendations.push('Deploy trained medical personnel and provide emergency training');
  }
  if (gapFields.includes('hasMedicineSupply')) {
    recommendations.push('Procure and distribute essential medicines and medical supplies');
  }
  if (gapFields.includes('hasMedicalSupplies')) {
    recommendations.push('Secure medical equipment, diagnostic tools, and protective equipment');
  }
  if (gapFields.includes('hasMaternalChildServices')) {
    recommendations.push('Establish maternal and child health services with emergency obstetric care');
  }
  return recommendations;
}

function generateFoodRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('isFoodSufficient')) {
    recommendations.push('Request emergency food assistance and establish food distribution points');
  }
  if (gapFields.includes('hasRegularMealAccess')) {
    recommendations.push('Implement regular meal distribution programs and community kitchens');
  }
  if (gapFields.includes('hasInfantNutrition')) {
    recommendations.push('Distribute therapeutic feeding and infant nutrition supplements');
  }
  return recommendations;
}

function generateWASHRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('isWaterSufficient')) {
    recommendations.push('Deploy water trucking services and install water purification systems');
  }
  if (gapFields.includes('hasCleanWaterAccess')) {
    recommendations.push('Establish water treatment points and ensure water quality testing');
  }
  if (gapFields.includes('areLatrinesSufficient')) {
    recommendations.push('Construct emergency sanitation facilities and improve existing latrines');
  }
  if (gapFields.includes('hasHandwashingFacilities')) {
    recommendations.push('Distribute soap and hand sanitizer, establish handwashing stations');
  }
  if (gapFields.includes('hasOpenDefecationConcerns')) {
    recommendations.push('Implement safe defecation campaigns and monitor sanitation practices');
  }
  return recommendations;
}

function generateShelterRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('areSheltersSufficient')) {
    recommendations.push('Deploy emergency shelter kits and establish temporary housing');
  }
  if (gapFields.includes('hasSafeStructures')) {
    recommendations.push('Identify and retrofit safe buildings for emergency shelter use');
  }
  if (gapFields.includes('areOvercrowded')) {
    recommendations.push('Decongest existing shelters and establish additional shelter sites');
  }
  if (gapFields.includes('provideWeatherProtection')) {
    recommendations.push('Provide weatherproofing materials and improve shelter insulation');
  }
  return recommendations;
}

function generateSecurityRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('isSafeFromViolence')) {
    recommendations.push('Establish security patrols and safe zones for vulnerable populations');
  }
  if (gapFields.includes('gbvCasesReported')) {
    recommendations.push('Deploy specialized GBV response teams and establish safe reporting mechanisms');
  }
  if (gapFields.includes('hasSecurityPresence')) {
    recommendations.push('Request security personnel deployment and establish local security committees');
  }
  if (gapFields.includes('hasProtectionReportingMechanism')) {
    recommendations.push('Establish confidential protection reporting channels and community alert systems');
  }
  if (gapFields.includes('vulnerableGroupsHaveAccess')) {
    recommendations.push('Ensure priority access to services for women, children, elderly, and persons with disabilities');
  }
  if (gapFields.includes('hasLighting')) {
    recommendations.push('Install lighting systems in high-risk areas and communal spaces');
  }
  return recommendations;
}

export default {
  analyzeHealthGaps,
  analyzeFoodGaps,
  analyzeWASHGaps,
  analyzeShelterGaps,
  analyzeSecurityGaps
};