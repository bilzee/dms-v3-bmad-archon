'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building,
  FileCheck,
  Truck,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

// Types for aggregate metrics data
interface AggregateMetricsProps {
  data: {
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
  };
  className?: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

/**
 * Format percentage values
 */
const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100)}%`;
};

/**
 * Get trend icon and color
 */
const getTrendIndicator = (trend: number | undefined) => {
  if (!trend) return null;
  
  const isPositive = trend > 0;
  const isNeutral = trend === 0;
  
  return {
    icon: isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown,
    color: isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600',
    label: isNeutral ? 'No change' : `${isPositive ? '+' : ''}${trend}%`
  };
};

/**
 * Get delivery rate status
 */
const getDeliveryRateStatus = (rate: number) => {
  if (rate >= 0.8) return { status: 'Excellent', color: 'text-green-600 bg-green-100' };
  if (rate >= 0.6) return { status: 'Good', color: 'text-blue-600 bg-blue-100' };
  if (rate >= 0.4) return { status: 'Fair', color: 'text-yellow-600 bg-yellow-100' };
  return { status: 'Poor', color: 'text-red-600 bg-red-100' };
};

/**
 * Get coverage rate status
 */
const getCoverageRateStatus = (rate: number) => {
  if (rate >= 1.0) return { status: 'Complete', color: 'text-green-600 bg-green-100' };
  if (rate >= 0.8) return { status: 'Good', color: 'text-blue-600 bg-blue-100' };
  if (rate >= 0.6) return { status: 'Partial', color: 'text-yellow-600 bg-yellow-100' };
  return { status: 'Low', color: 'text-red-600 bg-red-100' };
};

/**
 * AggregateMetrics Component
 * 
 * Displays comprehensive incident-wide statistics including:
 * - Affected entities count and trend
 * - Assessment metrics with verification status
 * - Response tracking and delivery rates
 * - Coverage metrics and progress indicators
 * - Trend analysis with visual indicators
 */
export function AggregateMetrics({ data, className }: AggregateMetricsProps) {
  const deliveryStatus = getDeliveryRateStatus(data.deliveryRate);
  const coverageStatus = getCoverageRateStatus(data.coverageRate);
  const verificationRate = data.totalAssessmentsCount > 0 
    ? data.verifiedAssessmentsCount / data.totalAssessmentsCount 
    : 0;

  // Prepare metric cards data
  const metrics: MetricCard[] = [
    {
      title: 'Affected Entities',
      value: data.affectedEntitiesCount,
      subtitle: 'Locations impacted',
      icon: Building,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      trend: data.trends?.entitiesChange ? {
        value: data.trends.entitiesChange,
        direction: data.trends.entitiesChange > 0 ? 'up' : 
                   data.trends.entitiesChange < 0 ? 'down' : 'neutral'
      } : undefined
    },
    {
      title: 'Total Assessments',
      value: data.totalAssessmentsCount,
      subtitle: `${data.verifiedAssessmentsCount} verified`,
      icon: FileCheck,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      trend: data.trends?.assessmentsChange ? {
        value: data.trends.assessmentsChange,
        direction: data.trends.assessmentsChange > 0 ? 'up' : 
                   data.trends.assessmentsChange < 0 ? 'down' : 'neutral'
      } : undefined
    },
    {
      title: 'Responses',
      value: data.responsesCount,
      subtitle: 'Resources delivered',
      icon: Truck,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      trend: data.trends?.responsesChange ? {
        value: data.trends.responsesChange,
        direction: data.trends.responsesChange > 0 ? 'up' : 
                   data.trends.responsesChange < 0 ? 'down' : 'neutral'
      } : undefined
    }
  ];

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Aggregate Metrics
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 gap-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const trendIndicator = metric.trend ? getTrendIndicator(metric.trend.value) : null;
            
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border",
                  metric.bgColor,
                  metric.borderColor
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-white", metric.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {metric.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {metric.subtitle}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={cn("text-lg font-bold", metric.color)}>
                        {typeof metric.value === 'number' 
                          ? metric.value.toLocaleString() 
                          : metric.value
                        }
                      </div>
                      {trendIndicator && (
                        <div className={cn("flex items-center gap-1 text-xs", trendIndicator.color)}>
                          <trendIndicator.icon className="h-3 w-3" />
                          <span>{trendIndicator.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assessment Verification Status */}
        {data.totalAssessmentsCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Assessment Verification</span>
              <Badge variant="outline" className="text-xs">
                {formatPercentage(verificationRate)} verified
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-bold text-green-700">
                  {data.verifiedAssessmentsCount}
                </div>
                <div className="text-xs text-green-600">Verified</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                <Clock className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                <div className="text-lg font-bold text-yellow-700">
                  {data.totalAssessmentsCount - data.verifiedAssessmentsCount}
                </div>
                <div className="text-xs text-yellow-600">Pending</div>
              </div>
            </div>
          </div>
        )}

        {/* Response Delivery Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Response Delivery Rate</span>
            <Badge className={cn("gap-1", deliveryStatus.color)}>
              <Activity className="h-3 w-3" />
              {deliveryStatus.status}
            </Badge>
          </div>
          <Progress 
            value={data.deliveryRate * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatPercentage(data.deliveryRate)} delivered</span>
            <span>{data.responsesCount} of {data.totalAssessmentsCount} assessments</span>
          </div>
        </div>

        {/* Entity Coverage Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Entity Coverage</span>
            <Badge className={cn("gap-1", coverageStatus.color)}>
              <Building className="h-3 w-3" />
              {coverageStatus.status}
            </Badge>
          </div>
          <Progress 
            value={Math.min(data.coverageRate * 100, 100)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatPercentage(Math.min(data.coverageRate, 1))} coverage</span>
            <span>{Math.min(data.affectedEntitiesCount, data.totalAssessmentsCount)} of {data.affectedEntitiesCount} entities</span>
          </div>
        </div>

        {/* Overall Status Summary */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-sm font-medium text-gray-700 mb-2">Overall Status</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-700">
                {formatPercentage(verificationRate)}
              </div>
              <div className="text-xs text-blue-600">Verification</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-sm font-medium text-green-700">
                {formatPercentage(data.deliveryRate)}
              </div>
              <div className="text-xs text-green-600">Delivery</div>
            </div>
          </div>
        </div>

        {/* Trend Information */}
        {data.trends && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">24h Trends</div>
            <div className="space-y-1">
              {Object.entries(data.trends).map(([key, value]) => {
                const trendIndicator = getTrendIndicator(value);
                if (!trendIndicator) return null;
                
                const TrendIcon = trendIndicator.icon;
                const labels = {
                  assessmentsChange: 'Assessments',
                  responsesChange: 'Responses', 
                  entitiesChange: 'Entities'
                };
                
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{labels[key as keyof typeof labels]}</span>
                    <div className={cn("flex items-center gap-1", trendIndicator.color)}>
                      <TrendIcon className="h-3 w-3" />
                      <span>{trendIndicator.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AggregateMetrics;