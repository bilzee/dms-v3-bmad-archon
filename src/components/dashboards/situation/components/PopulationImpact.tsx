'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Home,
  Heart,
  AlertTriangle,
  Baby,
  User,
  Accessibility,
  Users2,
  FileText,
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Types for population impact data
interface PopulationImpactProps {
  incidentId?: string;
  className?: string;
}

interface PopulationImpactData {
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

interface DemographicItem {
  label: string;
  value: number;
  total: number;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

/**
 * Format large numbers with commas
 */
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Get severity level based on casualty counts
 */
const getCasualtySeverity = (livesLost: number, injured: number) => {
  if (livesLost > 100 || injured > 500) return { level: 'Critical', color: 'text-red-600 bg-red-100' };
  if (livesLost > 10 || injured > 100) return { level: 'High', color: 'text-orange-600 bg-orange-100' };
  if (livesLost > 0 || injured > 0) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
  return { level: 'Low', color: 'text-green-600 bg-green-100' };
};

// Fetch population impact from dashboard API
const fetchPopulationImpact = async (incidentId?: string): Promise<PopulationImpactData> => {
  if (!incidentId) {
    // Return empty data if no incident selected
    return {
      totalPopulation: 0,
      totalHouseholds: 0,
      aggregatedLivesLost: 0,
      aggregatedInjured: 0,
      aggregatedDisplaced: 0,
      demographicBreakdown: {
        under5: 0,
        elderly: 0,
        pwd: 0,
        pregnantWomen: 0,
        lactatingMothers: 0,
        separatedChildren: 0,
        populationMale: 0,
        populationFemale: 0
      },
      sourceAssessments: {
        populationCount: 0,
        preliminaryCount: 0
      }
    };
  }

  const params = new URLSearchParams({ incidentId });
  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch population impact');
  }

  // Extract population impact from selected incident
  const populationImpact = response.data.selectedIncident?.populationImpact || {
    totalPopulation: 0,
    totalHouseholds: 0,
    aggregatedLivesLost: 0,
    aggregatedInjured: 0,
    aggregatedDisplaced: 0,
    demographicBreakdown: {
      under5: 0,
      elderly: 0,
      pwd: 0,
      pregnantWomen: 0,
      lactatingMothers: 0,
      separatedChildren: 0,
      populationMale: 0,
      populationFemale: 0
    },
    sourceAssessments: {
      populationCount: 0,
      preliminaryCount: 0
    }
  };

  return populationImpact;
};

/**
 * PopulationImpact Component
 * 
 * Displays comprehensive population impact statistics including:
 * - Total population and households affected
 * - Casualty statistics (lives lost, injured, displaced)
 * - Demographic breakdown with visual indicators
 * - Assessment source information
 * - Vulnerable population highlights
 */
export function PopulationImpact({ incidentId, className }: PopulationImpactProps) {
  // Fetch population impact data
  const {
    data: populationData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['populationImpact', incidentId],
    queryFn: () => fetchPopulationImpact(incidentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!incidentId // Only fetch if incident is selected
  });

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Population Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading population impact data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error || !populationData) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Population Impact Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load population impact data</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle no incident selected
  if (!incidentId) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Population Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select an incident to view population impact</p>
            <p className="text-xs text-gray-400 mt-1">
              Complete population assessments to see impact statistics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const casualtySeverity = getCasualtySeverity(populationData.aggregatedLivesLost, populationData.aggregatedInjured);
  const totalVulnerable = populationData.demographicBreakdown.under5 + 
                          populationData.demographicBreakdown.elderly + 
                          populationData.demographicBreakdown.pwd + 
                          populationData.demographicBreakdown.pregnantWomen + 
                          populationData.demographicBreakdown.lactatingMothers + 
                          populationData.demographicBreakdown.separatedChildren;

  // Demographic data for visualization
  const demographics: DemographicItem[] = [
    {
      label: 'Under 5 years',
      value: populationData.demographicBreakdown.under5,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.under5, populationData.totalPopulation),
      icon: Baby,
      color: 'bg-blue-500'
    },
    {
      label: 'Elderly',
      value: populationData.demographicBreakdown.elderly,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.elderly, populationData.totalPopulation),
      icon: Users2,
      color: 'bg-gray-500'
    },
    {
      label: 'Persons with Disability',
      value: populationData.demographicBreakdown.pwd,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.pwd, populationData.totalPopulation),
      icon: Accessibility,
      color: 'bg-purple-500'
    },
    {
      label: 'Pregnant Women',
      value: populationData.demographicBreakdown.pregnantWomen,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.pregnantWomen, populationData.totalPopulation),
      icon: User,
      color: 'bg-pink-500'
    },
    {
      label: 'Lactating Mothers',
      value: populationData.demographicBreakdown.lactatingMothers,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.lactatingMothers, populationData.totalPopulation),
      icon: Heart,
      color: 'bg-green-500'
    },
    {
      label: 'Separated Children',
      value: populationData.demographicBreakdown.separatedChildren,
      total: populationData.totalPopulation,
      percentage: calculatePercentage(populationData.demographicBreakdown.separatedChildren, populationData.totalPopulation),
      icon: AlertTriangle,
      color: 'bg-yellow-500'
    }
  ];

  // Sort demographics by percentage (highest first)
  const sortedDemographics = demographics.sort((a, b) => b.percentage - a.percentage);

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Population Impact
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* No data state */}
        {populationData.totalPopulation === 0 && populationData.sourceAssessments.populationCount === 0 && populationData.sourceAssessments.preliminaryCount === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No population assessment data available</p>
            <p className="text-xs text-gray-400 mt-1">
              Complete population assessments to see impact statistics
            </p>
          </div>
        )}

        {(populationData.totalPopulation > 0 || populationData.sourceAssessments.preliminaryCount > 0) && (
          <>
            {/* Total Population and Households */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-xl font-bold text-blue-900">
                  {formatNumber(populationData.totalPopulation)}
                </div>
                <div className="text-xs text-blue-600">Total Population</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <Home className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <div className="text-xl font-bold text-green-900">
                  {formatNumber(populationData.totalHouseholds)}
                </div>
                <div className="text-xs text-green-600">Households</div>
              </div>
            </div>

            {/* Casualty Statistics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Casualty Impact</span>
                <Badge className={cn("gap-1", casualtySeverity.color)}>
                  <AlertTriangle className="h-3 w-3" />
                  {casualtySeverity.level}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                  <div className="text-lg font-bold text-red-700">
                    {formatNumber(populationData.aggregatedLivesLost)}
                  </div>
                  <div className="text-xs text-red-600">Lives Lost</div>
                </div>
                
                <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                  <div className="text-lg font-bold text-orange-700">
                    {formatNumber(populationData.aggregatedInjured)}
                  </div>
                  <div className="text-xs text-orange-600">Injured</div>
                </div>
                
                <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-lg font-bold text-yellow-700">
                    {formatNumber(populationData.aggregatedDisplaced)}
                  </div>
                  <div className="text-xs text-yellow-600">Displaced</div>
                </div>
              </div>
            </div>

            {/* Gender Distribution */}
            {(populationData.demographicBreakdown.populationMale > 0 || populationData.demographicBreakdown.populationFemale > 0) && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Gender Distribution</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="text-lg font-bold text-blue-700">
                      {formatNumber(populationData.demographicBreakdown.populationMale)}
                    </div>
                    <div className="text-xs text-blue-600">Male</div>
                    <div className="text-xs text-gray-400">
                      {calculatePercentage(populationData.demographicBreakdown.populationMale, populationData.totalPopulation)}%
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-pink-50 rounded border border-pink-200">
                    <div className="text-lg font-bold text-pink-700">
                      {formatNumber(populationData.demographicBreakdown.populationFemale)}
                    </div>
                    <div className="text-xs text-pink-600">Female</div>
                    <div className="text-xs text-gray-400">
                      {calculatePercentage(populationData.demographicBreakdown.populationFemale, populationData.totalPopulation)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vulnerable Populations */}
            {totalVulnerable > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Vulnerable Populations</span>
                  <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    {formatNumber(totalVulnerable)} total
                  </div>
                </div>
                
                <div className="space-y-2">
                  {sortedDemographics
                    .filter(demo => demo.value > 0)
                    .slice(0, 4) // Show top 4 most significant
                    .map((demo, index) => {
                      const Icon = demo.icon;
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Icon className="h-3 w-3" />
                              <span className="text-gray-600">{demo.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatNumber(demo.value)}</span>
                              <span className="text-gray-400">{demo.percentage}%</span>
                            </div>
                          </div>
                          <Progress 
                            value={demo.percentage} 
                            className="h-1"
                            // Custom color for each demographic type
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Data Sources */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FileText className="h-3 w-3" />
                <span>Data Sources:</span>
              </div>
              <div className="flex items-center gap-4 ml-5 text-xs text-gray-400">
                <span>{populationData.sourceAssessments.populationCount} Population Assessments</span>
                {populationData.sourceAssessments.preliminaryCount > 0 && (
                  <span>{populationData.sourceAssessments.preliminaryCount} Preliminary Reports</span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PopulationImpact;