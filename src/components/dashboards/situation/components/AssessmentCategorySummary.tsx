'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { GapIndicator } from './GapIndicator';
import type { 
  HealthAssessmentData, 
  FoodAssessmentData, 
  WASHAssessmentData,
  ShelterAssessmentData,
  SecurityAssessmentData,
  PopulationAssessmentData
} from '@/app/api/v1/dashboard/situation/route';

interface AssessmentCategorySummaryProps {
  category: 'health' | 'food' | 'wash' | 'shelter' | 'security' | 'population';
  assessment: any;
  gapAnalysis?: any;
  layout: 'split' | 'full';
  className?: string;
  showRecommendations?: boolean;
}

// Category configuration
const categoryConfig = {
  health: {
    title: 'Health Assessment',
    icon: '🏥',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  food: {
    title: 'Food Security',
    icon: '🍲',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  wash: {
    title: 'WASH (Water & Sanitation)',
    icon: '💧',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  shelter: {
    title: 'Shelter & Housing',
    icon: '🏠',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  security: {
    title: 'Security & Protection',
    icon: '🛡️',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  population: {
    title: 'Population Overview',
    icon: '👥',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
} as const;

// Field definitions for gap vs non-gap indicating fields
const fieldDefinitions = {
  health: {
    gapIndicators: [
      { key: 'hasFunctionalClinic', label: 'Functional Clinic', boolean: true },
      { key: 'hasEmergencyServices', label: 'Emergency Services', boolean: true },
      { key: 'hasTrainedStaff', label: 'Trained Staff', boolean: true },
      { key: 'hasMedicineSupply', label: 'Medicine Supply', boolean: true },
      { key: 'hasMedicalSupplies', label: 'Medical Supplies', boolean: true },
      { key: 'hasMaternalChildServices', label: 'Maternal/Child Services', boolean: true }
    ],
    nonGapIndicators: [
      { key: 'numberHealthFacilities', label: 'Health Facilities', boolean: false },
      { key: 'healthFacilityType', label: 'Facility Type', boolean: false },
      { key: 'qualifiedHealthWorkers', label: 'Qualified Workers', boolean: false },
      { key: 'commonHealthIssues', label: 'Common Issues', boolean: false }
    ]
  },
  food: {
    gapIndicators: [
      { key: 'isFoodSufficient', label: 'Food Sufficiency', boolean: true },
      { key: 'hasRegularMealAccess', label: 'Regular Meal Access', boolean: true },
      { key: 'hasInfantNutrition', label: 'Infant Nutrition', boolean: true }
    ],
    nonGapIndicators: [
      { key: 'foodSource', label: 'Food Source', boolean: false },
      { key: 'availableFoodDurationDays', label: 'Food Duration (Days)', boolean: false },
      { key: 'additionalFoodRequiredPersons', label: 'Additional Food Needed (Persons)', boolean: false },
      { key: 'additionalFoodRequiredHouseholds', label: 'Additional Food Needed (Households)', boolean: false }
    ]
  },
  wash: {
    gapIndicators: [
      { key: 'isWaterSufficient', label: 'Water Sufficiency', boolean: true },
      { key: 'hasCleanWaterAccess', label: 'Clean Water Access', boolean: true },
      { key: 'areLatrinesSufficient', label: 'Sufficient Latrines', boolean: true },
      { key: 'hasHandwashingFacilities', label: 'Handwashing Facilities', boolean: true },
      { key: 'hasOpenDefecationConcerns', label: 'Open Defecation Concerns', boolean: true, invert: true }
    ],
    nonGapIndicators: [
      { key: 'waterSource', label: 'Water Source', boolean: false },
      { key: 'functionalLatrinesAvailable', label: 'Functional Latrines', boolean: false }
    ]
  },
  shelter: {
    gapIndicators: [
      { key: 'areSheltersSufficient', label: 'Sufficient Shelters', boolean: true },
      { key: 'hasSafeStructures', label: 'Safe Structures', boolean: true },
      { key: 'areOvercrowded', label: 'Overcrowding', boolean: true, invert: true },
      { key: 'provideWeatherProtection', label: 'Weather Protection', boolean: true }
    ],
    nonGapIndicators: [
      { key: 'shelterTypes', label: 'Shelter Types', boolean: false },
      { key: 'requiredShelterType', label: 'Required Shelter Type', boolean: false },
      { key: 'numberSheltersRequired', label: 'Shelters Required', boolean: false }
    ]
  },
  security: {
    gapIndicators: [
      { key: 'isSafeFromViolence', label: 'Safe from Violence', boolean: true },
      { key: 'gbvCasesReported', label: 'GBV Cases', boolean: true, invert: true },
      { key: 'hasSecurityPresence', label: 'Security Presence', boolean: true },
      { key: 'hasProtectionReportingMechanism', label: 'Protection Reporting', boolean: true },
      { key: 'vulnerableGroupsHaveAccess', label: 'Vulnerable Groups Access', boolean: true },
      { key: 'hasLighting', label: 'Lighting', boolean: true }
    ],
    nonGapIndicators: []
  },
  population: {
    gapIndicators: [], // Population doesn't have gap indicators
    nonGapIndicators: [
      { key: 'totalPopulation', label: 'Total Population', boolean: false },
      { key: 'totalHouseholds', label: 'Total Households', boolean: false },
      { key: 'populationMale', label: 'Male Population', boolean: false },
      { key: 'populationFemale', label: 'Female Population', boolean: false },
      { key: 'populationUnder5', label: 'Children Under 5', boolean: false },
      { key: 'pregnantWomen', label: 'Pregnant Women', boolean: false },
      { key: 'lactatingMothers', label: 'Lactating Mothers', boolean: false },
      { key: 'personWithDisability', label: 'Persons with Disability', boolean: false },
      { key: 'elderlyPersons', label: 'Elderly Persons', boolean: false },
      { key: 'separatedChildren', label: 'Separated Children', boolean: false },
      { key: 'numberLivesLost', label: 'Lives Lost', boolean: false },
      { key: 'numberInjured', label: 'Injured', boolean: false }
    ]
  }
} as const;

/**
 * AssessmentCategorySummary Component
 * 
 * Displays assessment data for a specific category with:
 * - Split layout: Non-gap indicators on left, gap indicators on right
 * - Gap analysis with visual indicators
 * - Assessment metadata (date, assessor)
 * - No data state when assessment is missing
 */
export function AssessmentCategorySummary({
  category,
  assessment,
  gapAnalysis,
  layout = 'split',
  className,
  showRecommendations = false
}: AssessmentCategorySummaryProps) {
  const config = categoryConfig[category];
  const fieldConfig = fieldDefinitions[category];
  
  // State for dynamic field severities
  const [fieldSeverities, setFieldSeverities] = useState<Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>>({});

  // Use the gap fields and severity mapping from gapAnalysis if available
  const gapFields = gapAnalysis?.gapFields || [];
  const fieldSeverityMap = gapAnalysis?.fieldSeverityMap || {};
  
  // Fetch individual field severities when component mounts
  useEffect(() => {
    const fetchFieldSeverities = async () => {
      const severities: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {};
      
      // Only fetch severities for fields that are actually in the gap analysis
      for (const field of fieldConfig.gapIndicators) {
        if (gapFields.includes(field.key)) {
          try {
            const severity = await getFieldSeverity(field.key);
            severities[field.key] = severity;
          } catch (error) {
            console.warn(`Failed to fetch severity for ${field.key}:`, error);
            severities[field.key] = getFieldSeveritySync(field.key);
          }
        }
      }
      
      setFieldSeverities(severities);
    };
    
    if (gapFields.length > 0) {
      fetchFieldSeverities();
    }
  }, [gapFields, category]);

  // Function to get field severity using the API
  const getFieldSeverity = async (fieldName: string): Promise<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> => {
    // If we have field severity mapping from aggregated analysis, use it
    if (fieldSeverityMap[fieldName]) {
      return fieldSeverityMap[fieldName];
    }

    // If this field is not in the gap fields, no gap
    if (!gapFields.includes(fieldName)) {
      return 'LOW'; // No gap
    }

    // Get assessment type for this category
    const assessmentTypeMap = {
      health: 'HEALTH',
      food: 'FOOD',
      wash: 'WASH',
      shelter: 'SHELTER',
      security: 'SECURITY',
      population: 'POPULATION'
    };

    const assessmentType = assessmentTypeMap[category];
    
    try {
      // Call the API to get field severity
      const response = await fetch(
        `/api/v1/gap-field-severities?assessmentType=${assessmentType}&fieldName=${fieldName}`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.severity) {
        return result.data.severity;
      } else {
        console.warn('API returned error for field severity:', result.error);
        throw new Error(result.error || 'API error');
      }
    } catch (error) {
      console.warn('Failed to fetch field severity from API, using fallback logic:', error);
    }

    // Fallback: Use hardcoded field importance logic
    const criticalFields = [
      'hasEmergencyServices', 'hasFunctionalClinic', 'isWaterSufficient', 
      'areSheltersSufficient', 'hasSafetyConcerns', 'hasImmediateThreats'
    ];
    
    const highFields = [
      'hasCleanWaterAccess', 'hasTrainedStaff', 'hasMedicineSupply',
      'isFoodSufficient', 'hasRegularMealAccess', 'hasSafeStructures'
    ];
    
    const mediumFields = [
      'hasHandwashingFacilities', 'areLatrinesSufficient', 'hasMedicalSupplies',
      'hasInfantNutrition', 'areOvercrowded', 'provideWeatherProtection'
    ];

    if (criticalFields.includes(fieldName)) {
      return 'CRITICAL';
    } else if (highFields.includes(fieldName)) {
      return 'HIGH';
    } else if (mediumFields.includes(fieldName)) {
      return 'MEDIUM';
    }
    
    // Default to HIGH for any other gap fields not explicitly categorized
    return 'HIGH';
  };

  // Synchronous version using cached/fallback data for immediate rendering
  const getFieldSeveritySync = (fieldName: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
    // If we have field severity mapping from aggregated analysis, use it
    if (fieldSeverityMap[fieldName]) {
      return fieldSeverityMap[fieldName];
    }

    // If this field is not in the gap fields, no gap
    if (!gapFields.includes(fieldName)) {
      return 'LOW'; // No gap
    }

    // Fallback logic for immediate rendering
    const criticalFields = [
      'hasEmergencyServices', 'hasFunctionalClinic', 'isWaterSufficient', 
      'areSheltersSufficient', 'hasSafetyConcerns', 'hasImmediateThreats'
    ];
    
    const highFields = [
      'hasCleanWaterAccess', 'hasTrainedStaff', 'hasMedicineSupply',
      'isFoodSufficient', 'hasRegularMealAccess', 'hasSafeStructures'
    ];
    
    const mediumFields = [
      'hasHandwashingFacilities', 'areLatrinesSufficient', 'hasMedicalSupplies',
      'hasInfantNutrition', 'areOvercrowded', 'provideWeatherProtection'
    ];

    if (criticalFields.includes(fieldName)) {
      return 'CRITICAL';
    } else if (highFields.includes(fieldName)) {
      return 'HIGH';
    } else if (mediumFields.includes(fieldName)) {
      return 'MEDIUM';
    }
    
    // Default to HIGH for any other gap fields not explicitly categorized
    return 'HIGH';
  };

  if (!assessment) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>{config.icon}</span>
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No assessment data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderField = (key: string, label: string, boolean: boolean, invert = false) => {
    const value = assessment[key];
    
    if (boolean) {
      const hasGap = invert ? value : !value;
      // Use fetched field severity if available, otherwise use sync fallback
      const severity = hasGap ? (fieldSeverities[key] || getFieldSeveritySync(key)) : 'LOW';
      return (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{label}</span>
          <GapIndicator hasGap={hasGap} severity={severity} size="sm" />
        </div>
      );
    }

    // Format non-boolean values
    let displayValue = value;
    if (typeof value === 'number') {
      displayValue = value.toLocaleString();
    } else if (typeof value === 'object' && value !== null) {
      displayValue = JSON.stringify(value);
    }

    return (
      <div key={key} className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium">{displayValue || 'N/A'}</span>
      </div>
    );
  };

  const gapFieldElements = fieldConfig.gapIndicators.map(field => 
    renderField(field.key, field.label, field.boolean, field.invert)
  );
  
  const nonGapFieldElements = fieldConfig.nonGapIndicators.map(field => 
    renderField(field.key, field.label, field.boolean)
  );

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>{config.icon}</span>
            {config.title}
          </CardTitle>
          {gapAnalysis && (
            <div className="flex items-center gap-2">
              {gapAnalysis.hasGap ? (
                <Badge 
                  variant="destructive" 
                  className="text-xs font-bold border-2 border-red-300 bg-red-600"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {gapAnalysis.severity}
                </Badge>
              ) : (
                <Badge 
                  variant="default" 
                  className="text-xs font-bold bg-green-600 text-white border-2 border-green-300"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  No Gaps
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Assessment metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {assessment.rapidAssessmentDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(assessment.rapidAssessmentDate).toLocaleDateString()}
            </div>
          )}
          {assessment.assessorName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {assessment.assessorName}
            </div>
          )}
          {assessment.verificationStatus && (
            <Badge variant="outline" className="text-xs">
              {assessment.verificationStatus}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {layout === 'split' && gapFieldElements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Non-gap indicators (left side) */}
            <div className="space-y-2">
              {nonGapFieldElements.length > 0 ? (
                <>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Overview</h4>
                  {nonGapFieldElements}
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No overview data</p>
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="hidden md:block" />

            {/* Gap indicators (right side) */}
            <div className="space-y-2">
              {gapFieldElements.length > 0 ? (
                <>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Gap Analysis</h4>
                  {gapFieldElements}
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-xs">No gap indicators</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Full layout - all fields together
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Assessment Details</h4>
            {[...nonGapFieldElements, ...gapFieldElements]}
          </div>
        )}

        {/* Recommendations - only show if enabled */}
        {showRecommendations && gapAnalysis?.recommendations && gapAnalysis.recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {gapAnalysis.recommendations.map((recommendation: string, index: number) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AssessmentCategorySummary;