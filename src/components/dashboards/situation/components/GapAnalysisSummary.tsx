'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { exportGapAnalysisToCsv, validateGapAnalysisData } from '@/utils/export/gapAnalysisCsv';
import { 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react';
import { GapIndicator } from './GapIndicator';

interface GapAnalysisSummaryProps {
  incidentId: string;
  incidentName?: string;
  data?: {
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
  };
  onExport?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Assessment type configuration
const assessmentTypeConfig = {
  HEALTH: {
    title: 'Health Services',
    icon: '🏥',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  FOOD: {
    title: 'Food Security',
    icon: '🍲',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  WASH: {
    title: 'Water & Sanitation',
    icon: '💧',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  SHELTER: {
    title: 'Shelter & Housing',
    icon: '🏠',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  SECURITY: {
    title: 'Security & Protection',
    icon: '🛡️',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
} as const;

// Severity color mapping
const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500', 
  medium: 'bg-yellow-500',
  low: 'bg-green-500'
} as const;

/**
 * GapAnalysisSummary Component
 * 
 * Summary panel with visual indicators for gap analysis across entities
 * - Overall severity distribution with progress bars
 * - Assessment type breakdown with color coding
 * - Real-time update indicators
 * - Export functionality
 */
export function GapAnalysisSummary({
  incidentId,
  incidentName,
  data,
  onExport,
  isLoading = false,
  className
}: GapAnalysisSummaryProps) {
  // Handle CSV export
  const handleCsvExport = () => {
    if (!data) return;

    // Validate data before export
    const validation = validateGapAnalysisData(data);
    if (!validation.isValid) {
      console.error('Invalid gap analysis data:', validation.error);
      return;
    }

    // Export to CSV
    try {
      exportGapAnalysisToCsv(data, {
        incidentId,
        incidentName,
        includeMetadata: true,
        includeTimestamps: true
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  // Calculate derived metrics
  const metrics = useMemo(() => {
    if (!data) return null;

    const { totalEntities, severityDistribution, assessmentTypeGaps } = data;
    
    // Calculate percentages for severity distribution
    const totalWithGaps = severityDistribution.high + severityDistribution.medium + severityDistribution.low;
    const severityPercentages = {
      high: totalWithGaps > 0 ? (severityDistribution.high / totalWithGaps) * 100 : 0,
      medium: totalWithGaps > 0 ? (severityDistribution.medium / totalWithGaps) * 100 : 0,
      low: totalWithGaps > 0 ? (severityDistribution.low / totalWithGaps) * 100 : 0
    };

    // Calculate overall gap status - use severity distribution totals for accuracy
    const entitiesWithGaps = totalWithGaps;
    const gapCoverageRate = totalEntities > 0 ? (entitiesWithGaps / totalEntities) * 100 : 0;

    // Determine overall status
    let overallStatus: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (severityDistribution.high > 0) overallStatus = 'critical';
    else if (severityDistribution.medium > 0) overallStatus = 'high';
    else if (severityDistribution.low > 0) overallStatus = 'medium';

    return {
      totalEntities,
      entitiesWithGaps,
      gapCoverageRate,
      severityPercentages,
      overallStatus,
      totalWithGaps
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-2"> {/* Reduced from pb-3 */}
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Gap Analysis Summary
            </CardTitle>
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={cn("h-full opacity-60", className)}>
        <CardHeader className="pb-2"> {/* Reduced from pb-3 */}
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Gap Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No gap analysis data available</p>
            <p className="text-xs text-gray-400 mt-1">
              Select an incident to view gap analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2"> {/* Reduced from pb-4 */}
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Gap Analysis Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Overall status indicator */}
            <div className="flex items-center gap-2">
              <GapIndicator 
                hasGap={metrics.gapCoverageRate > 0}
                severity={metrics.overallStatus.toUpperCase() as any}
                size="sm"
                showLabel={false}
              />
              <span className="text-sm font-medium">
                {metrics.overallStatus.toUpperCase()}
              </span>
            </div>
            
            {/* Export button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onExport || handleCsvExport}
              disabled={!data}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {metrics.entitiesWithGaps} of {metrics.totalEntities} entities have gaps
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {metrics.gapCoverageRate.toFixed(1)}% coverage rate
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 overflow-y-auto flex-1">
        {/* Severity Distribution */}
        <div className="mb-4"> {/* Reduced from mb-6 */}
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Severity Distribution
          </h3>
          <div className="space-y-3">
            {/* High severity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", severityColors.high)} />
                <span className="text-sm font-medium">High Priority</span>
              </div>
              <span className="text-sm text-gray-600">
                {data.severityDistribution.high} entities ({metrics.severityPercentages.high.toFixed(1)}%)
              </span>
            </div>
            <Progress 
              value={metrics.severityPercentages.high} 
              className="h-1.5"  // Reduced from h-2
              indicatorclassname="bg-orange-500"
            />

            {/* Medium severity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", severityColors.medium)} />
                <span className="text-sm font-medium">Medium Priority</span>
              </div>
              <span className="text-sm text-gray-600">
                {data.severityDistribution.medium} entities ({metrics.severityPercentages.medium.toFixed(1)}%)
              </span>
            </div>
            <Progress 
              value={metrics.severityPercentages.medium} 
              className="h-1.5"  // Reduced from h-2
              indicatorclassname="bg-yellow-500"
            />

            {/* Low severity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", severityColors.low)} />
                <span className="text-sm font-medium">Low Priority</span>
              </div>
              <span className="text-sm text-gray-600">
                {data.severityDistribution.low} entities ({metrics.severityPercentages.low.toFixed(1)}%)
              </span>
            </div>
            <Progress 
              value={metrics.severityPercentages.low} 
              className="h-1.5"  // Reduced from h-2
              indicatorclassname="bg-green-500"
            />
          </div>
        </div>

        {/* Assessment Type Breakdown */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Assessment Type Gaps
          </h3>
          <div className="grid grid-cols-1 gap-2"> {/* Single column to prevent text overflow - wider tiles */}
            {Object.entries(data.assessmentTypeGaps).map(([type, gapData]) => {
              const config = assessmentTypeConfig[type as keyof typeof assessmentTypeConfig];
              if (!config) return null;

              return (
                <div 
                  key={type}
                  className={cn(
                    "p-2 rounded-lg border", // Reduced padding from p-3 to p-2
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <div>
                        <div className={cn("font-medium text-sm", config.color)}>
                          {config.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {gapData.entitiesAffected} entities affected
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <GapIndicator
                        hasGap={gapData.entitiesAffected > 0}
                        severity={gapData.severity.toUpperCase() as any}
                        size="sm"
                      />
                      <span className="text-sm font-medium">
                        {gapData.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <Progress 
                    value={gapData.percentage} 
                    className="h-1.5"
                    indicatorClassName={cn(
                      gapData.severity === 'high' ? 'bg-orange-500' :
                      gapData.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Last updated info */}
        {data.lastUpdated && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <RefreshCw className="h-3 w-3" />
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GapAnalysisSummary;