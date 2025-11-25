'use client';

import React from 'react';
import { cn } from '@/lib/utils';
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
  TrendingUp
} from 'lucide-react';

// Types for population impact data
interface PopulationImpactProps {
  data: {
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
  };
  className?: string;
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
export function PopulationImpact({ data, className }: PopulationImpactProps) {
  const casualtySeverity = getCasualtySeverity(data.aggregatedLivesLost, data.aggregatedInjured);
  const totalVulnerable = data.demographicBreakdown.under5 + 
                          data.demographicBreakdown.elderly + 
                          data.demographicBreakdown.pwd + 
                          data.demographicBreakdown.pregnantWomen + 
                          data.demographicBreakdown.lactatingMothers + 
                          data.demographicBreakdown.separatedChildren;

  // Demographic data for visualization
  const demographics: DemographicItem[] = [
    {
      label: 'Under 5 years',
      value: data.demographicBreakdown.under5,
      total: data.totalPopulation,
      percentage: calculatePercentage(data.demographicBreakdown.under5, data.totalPopulation),
      icon: Baby,
      color: 'bg-blue-500'
    },
    {
      label: 'Elderly',
      value: data.demographicBreakdown.elderly,
      total: data.totalPopulation,
      percentage: calculatePercentage(data.demographicBreakdown.elderly, data.totalPopulation),
      icon: Users2,
      color: 'bg-gray-500'
    },
    {
      label: 'Persons with Disability',
      value: data.demographicBreakdown.pwd,
      total: data.totalPopulation,
      percentage: calculatePercentage(data.demographicBreakdown.pwd, data.totalPopulation),
      icon: Accessibility,
      color: 'bg-purple-500'
    },
    {
      label: 'Pregnant Women',
      value: data.demographicBreakdown.pregnantWomen,
      total: data.totalPopulation,
      percentage: calculatePercentage(data.demographicBreakdown.pregnantWomen, data.totalPopulation),
      icon: User,
      color: 'bg-pink-500'
    },
    {
      label: 'Lactating Mothers',
      value: data.demographicBreakdown.lactatingMothers,
      total: data.totalPopulation,
      percentage: calculatePercentage(data.demographicBreakdown.lactatingMothers, data.totalPopulation),
      icon: Heart,
      color: 'bg-green-500'
    },
    {
      label: 'Separated Children',
      value: data.demographicBreakdown.separatedChildren,
      total: data.totalPopulation,
      percentage: calculatePercentage(data.demographicBreakdown.separatedChildren, data.totalPopulation),
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
        {data.totalPopulation === 0 && data.sourceAssessments.populationCount === 0 && data.sourceAssessments.preliminaryCount === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No population assessment data available</p>
            <p className="text-xs text-gray-400 mt-1">
              Complete population assessments to see impact statistics
            </p>
          </div>
        )}

        {(data.totalPopulation > 0 || data.sourceAssessments.preliminaryCount > 0) && (
          <>
            {/* Total Population and Households */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-xl font-bold text-blue-900">
                  {formatNumber(data.totalPopulation)}
                </div>
                <div className="text-xs text-blue-600">Total Population</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <Home className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <div className="text-xl font-bold text-green-900">
                  {formatNumber(data.totalHouseholds)}
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
                    {formatNumber(data.aggregatedLivesLost)}
                  </div>
                  <div className="text-xs text-red-600">Lives Lost</div>
                </div>
                
                <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                  <div className="text-lg font-bold text-orange-700">
                    {formatNumber(data.aggregatedInjured)}
                  </div>
                  <div className="text-xs text-orange-600">Injured</div>
                </div>
                
                <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-lg font-bold text-yellow-700">
                    {formatNumber(data.aggregatedDisplaced)}
                  </div>
                  <div className="text-xs text-yellow-600">Displaced</div>
                </div>
              </div>
            </div>

            {/* Gender Distribution */}
            {(data.demographicBreakdown.populationMale > 0 || data.demographicBreakdown.populationFemale > 0) && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Gender Distribution</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="text-lg font-bold text-blue-700">
                      {formatNumber(data.demographicBreakdown.populationMale)}
                    </div>
                    <div className="text-xs text-blue-600">Male</div>
                    <div className="text-xs text-gray-400">
                      {calculatePercentage(data.demographicBreakdown.populationMale, data.totalPopulation)}%
                    </div>
                  </div>
                  
                  <div className="text-center p-2 bg-pink-50 rounded border border-pink-200">
                    <div className="text-lg font-bold text-pink-700">
                      {formatNumber(data.demographicBreakdown.populationFemale)}
                    </div>
                    <div className="text-xs text-pink-600">Female</div>
                    <div className="text-xs text-gray-400">
                      {calculatePercentage(data.demographicBreakdown.populationFemale, data.totalPopulation)}%
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
                <span>{data.sourceAssessments.populationCount} Population Assessments</span>
                {data.sourceAssessments.preliminaryCount > 0 && (
                  <span>{data.sourceAssessments.preliminaryCount} Preliminary Reports</span>
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