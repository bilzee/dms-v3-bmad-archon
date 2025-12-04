'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X, BarChart3, UserCheck, Eye } from 'lucide-react';

interface IndividualEntityGapInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentType?: 'health' | 'food' | 'wash' | 'shelter' | 'security';
}

export function IndividualEntityGapInfoPopup({ 
  isOpen, 
  onClose, 
  assessmentType = 'health'
}: IndividualEntityGapInfoPopupProps) {
  if (!isOpen) return null;

  const assessmentConfig = {
    health: {
      title: 'Health Assessment',
      icon: '🏥',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      fields: [
        {
          name: 'Medical Supplies',
          key: 'hasMedicalSupplies',
          description: 'Availability of medicines, equipment, diagnostic tools, and protective equipment'
        },
        {
          name: 'Trained Staff',
          key: 'hasTrainedStaff',
          description: 'Presence of qualified medical personnel and health workers'
        },
        {
          name: 'Functional Clinic',
          key: 'hasFunctionalClinic',
          description: 'Operational healthcare facility with basic infrastructure'
        },
        {
          name: 'Emergency Services',
          key: 'hasEmergencyServices',
          description: 'Emergency room, trauma care, and emergency medical response capability'
        },
        {
          name: 'Medicine Supply',
          key: 'hasMedicineSupply',
          description: 'Availability of essential medicines and medical commodities'
        },
        {
          name: 'Maternal & Child Services',
          key: 'hasMaternalChildServices',
          description: 'Prenatal, delivery, postnatal, and pediatric healthcare services'
        }
      ]
    },
    food: {
      title: 'Food Security',
      icon: '🍲',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      fields: [
        {
          name: 'Food Sufficiency',
          key: 'isFoodSufficient',
          description: 'Enough food available to meet population needs'
        },
        {
          name: 'Regular Meal Access',
          key: 'hasRegularMealAccess',
          description: 'Consistent access to regular meals throughout the day'
        },
        {
          name: 'Infant Nutrition',
          key: 'hasInfantNutrition',
          description: 'Specialized nutrition support for infants and young children'
        }
      ]
    },
    wash: {
      title: 'WASH (Water & Sanitation)',
      icon: '💧',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      fields: [
        {
          name: 'Water Sufficiency',
          key: 'isWaterSufficient',
          description: 'Adequate water quantity for drinking, cooking, and hygiene'
        },
        {
          name: 'Clean Water Access',
          key: 'hasCleanWaterAccess',
          description: 'Access to safe, potable water that meets WHO standards'
        },
        {
          name: 'Functional Latrines',
          key: 'functionalLatrinesAvailable',
          description: 'Working sanitation facilities that separate waste from human contact'
        },
        {
          name: 'Latrine Sufficiency',
          key: 'areLatrinesSufficient',
          description: 'Adequate number of latrines based on population served'
        },
        {
          name: 'Handwashing Facilities',
          key: 'hasHandwashingFacilities',
          description: 'Access to handwashing stations with soap and water'
        }
      ]
    },
    shelter: {
      title: 'Shelter Assessment',
      icon: '🏠',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      fields: [
        {
          name: 'Shelter Sufficiency',
          key: 'areSheltersSufficient',
          description: 'Adequate number of shelters for affected population'
        },
        {
          name: 'Safe Structures',
          key: 'hasSafeStructures',
          description: 'Structurally sound buildings that provide protection from elements'
        },
        {
          name: 'Weather Protection',
          key: 'provideWeatherProtection',
          description: 'Protection from rain, wind, extreme temperatures, and environmental hazards'
        },
        {
          name: 'Overcrowding',
          key: 'areOvercrowded',
          description: 'Appropriate space allocation per person in shelters'
        }
      ]
    },
    security: {
      title: 'Security Assessment',
      icon: '🛡️',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      fields: [
        {
          name: 'Safety from Violence',
          key: 'isSafeFromViolence',
          description: 'Protection from physical harm, violence, and security threats'
        },
        {
          name: 'Security Presence',
          key: 'hasSecurityPresence',
          description: 'Availability of security personnel or law enforcement'
        },
        {
          name: 'Protection Reporting',
          key: 'hasProtectionReportingMechanism',
          description: 'System for reporting protection concerns and accessing help'
        },
        {
          name: 'Vulnerable Groups Access',
          key: 'vulnerableGroupsHaveAccess',
          description: 'Prioritized access to services for women, children, elderly, and persons with disabilities'
        },
        {
          name: 'Lighting',
          key: 'hasLighting',
          description: 'Adequate lighting in communal areas and around facilities'
        }
      ]
    }
  };

  const config = assessmentConfig[assessmentType];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-blue-600" />
              Understanding {config.title} for Individual Entities
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Overview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              What This Assessment Shows
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Individual entity assessments evaluate gap indicators at a <span className="font-medium">specific location or facility</span>. 
              Unlike aggregated "All Entities" view which shows patterns across many locations, this assessment focuses on 
              the actual conditions at <span className="font-medium">this specific entity</span>.
            </p>
          </div>

          {/* How Gap Detection Works */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              How Gaps Are Identified
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-700">
                Gaps are identified through rapid assessments where field teams evaluate specific criteria:
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  <div>
                    <span className="font-semibold">Gap Detected (❌)</span> - Field doesn't meet required standards
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <div>
                    <span className="font-semibold">No Gap (✅)</span> - Field meets required standards
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What the Colors Mean */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              What the Colors Indicate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">Red (Critical)</span>
                </div>
                <p className="text-xs text-gray-600 pl-6">
                  Life-threatening or immediate safety risks
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-orange-700">Orange (High)</span>
                </div>
                <p className="text-xs text-gray-600 pl-6">
                  Significant impact on service delivery
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-yellow-700">Yellow (Medium)</span>
                </div>
                <p className="text-xs text-gray-600 pl-6">
                  Moderate issues affecting service quality
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Green (Low)</span>
                </div>
                <p className="text-xs text-gray-600 pl-6">
                  No significant issues detected
                </p>
              </div>
            </div>
          </div>

          {/* Specific Assessment Fields */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {config.icon}
              <span>{config.title} Fields</span>
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-blue-800">
                This assessment evaluates the following gap indicators for {config.title}:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.fields.map((field, index) => (
                  <div key={field.key} className="bg-white rounded border border-blue-200 p-3">
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {field.name}
                    </div>
                    <p className="text-xs text-gray-600">
                      {field.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assessment Process */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Assessment Process
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">1</div>
                  <div>
                    <div className="font-medium">Field Assessment</div>
                    <p className="text-gray-600">Evaluate each gap indicator against standards</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">2</div>
                  <div>
                    <div className="font-medium">Gap Detection</div>
                    <p className="text-gray-600">Identify which indicators have gaps</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">3</div>
                  <div>
                    <div className="font-medium">Severity Assignment</div>
                    <p className="text-gray-600">Assign severity level based on impact</p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Assessment is conducted by trained field teams and verified by supervisors.
              </p>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Key Benefits</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Provides detailed understanding of conditions at specific locations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Enables targeted interventions based on actual gaps identified</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Supports monitoring of improvement over time at individual sites</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Helps identify which specific resources are needed at each location</span>
              </li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              Got it, thanks!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IndividualEntityGapInfoPopup;