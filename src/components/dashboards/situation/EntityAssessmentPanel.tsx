'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, TrendingUp, MapPin, Users } from 'lucide-react';
import { EntitySelector } from './components/EntitySelector';
import { AssessmentCategorySummary } from './components/AssessmentCategorySummary';
import { useIncidentSelection, useEntitySelection } from '@/stores/dashboardLayout.store';

interface EntityAssessmentPanelProps {
  incidentId: string;
  entityId?: string;
  className?: string;
  onEntityChange?: (entityId: string) => void;
}

// Types for aggregated assessment data
interface AggregatedAssessments {
  health: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    totalHealthFacilities: number;
    totalQualifiedWorkers: number;
  };
  food: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    averageFoodDuration: number;
    totalAdditionalPersonsRequired: number;
  };
  wash: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    totalFunctionalLatrines: number;
  };
  shelter: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
    totalSheltersRequired: number;
  };
  security: {
    totalEntities: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
  };
  population: {
    totalEntities: number;
    totalPopulation: number;
    totalHouseholds: number;
    totalLivesLost: number;
    totalInjured: number;
  };
  gapSummary: {
    totalGaps: number;
    totalNoGaps: number;
    criticalGaps: number;
    entitiesWithGaps: number;
    entitiesWithoutGaps: number;
  };
}

// Fetch dashboard data with entity assessments
const fetchDashboardData = async (incidentId: string, entityId?: string) => {
  const params = new URLSearchParams({ incidentId });
  if (entityId) {
    params.append('entityId', entityId);
  }

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch dashboard data');
  }

  return response;
};

/**
 * EntityAssessmentPanel Component
 * 
 * Main panel component that integrates:
 * - Entity selector for filtering
 * - Assessment category summaries for each entity
 * - Aggregated view for "All Entities" selection
 * - Loading and error states
 * - Responsive design for mobile/desktop
 */
export function EntityAssessmentPanel({
  incidentId,
  entityId,
  className,
  onEntityChange
}: EntityAssessmentPanelProps) {
  const { selectedIncidentId } = useIncidentSelection();
  const { selectedEntityId, includeAllEntities } = useEntitySelection();
  
  const effectiveEntityId = entityId || selectedEntityId;
  const effectiveIncidentId = incidentId || selectedIncidentId;

  
  // Determine the entity ID to use for API call
  const entityIdForApi = useMemo(() => {
    if (includeAllEntities) {
      return 'all'; // Explicitly request all entities
    }
    return effectiveEntityId; // Use selected entity or undefined
  }, [includeAllEntities, effectiveEntityId]);

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['api-v1-dashboard-situation', effectiveIncidentId, entityIdForApi],
    queryFn: () => {
      return fetchDashboardData(effectiveIncidentId!, entityIdForApi);
    },
    enabled: !!effectiveIncidentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter entities based on selection
  const entityAssessments = useMemo(() => {
    const allEntityAssessments = dashboardData?.data?.entities || [];
    
    if (includeAllEntities || !effectiveEntityId || effectiveEntityId === 'all') {
      return allEntityAssessments;
    }
    return allEntityAssessments.filter(entity => entity.entityId === effectiveEntityId);
  }, [dashboardData?.data?.entities, includeAllEntities, effectiveEntityId]);

  const aggregatedAssessments = dashboardData?.data?.aggregatedAssessments;

  // Handle entity selection
  const handleEntityChange = (newEntityId: string) => {
    onEntityChange?.(newEntityId);
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load assessment data
            </h3>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No incident selected
  if (!effectiveIncidentId) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select an incident
            </h3>
            <p className="text-gray-600">
              Choose an incident from the left panel to view entity assessments
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Entity Assessment Panel
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Detailed assessment analysis with gap indicators
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Entity Selector */}
        <EntitySelector
          incidentId={effectiveIncidentId}
          selectedEntityId={effectiveEntityId}
          onEntityChange={handleEntityChange}
          includeAllOption={true}
        />

        {/* Gap Summary for "All Entities" view */}
        {includeAllEntities && aggregatedAssessments && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                Aggregated Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {aggregatedAssessments.gapSummary.entitiesWithGaps}
                  </div>
                  <div className="text-xs text-gray-600">Entities with Gaps</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {aggregatedAssessments.gapSummary.entitiesWithoutGaps}
                  </div>
                  <div className="text-xs text-gray-600">Entities without Gaps</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {aggregatedAssessments.gapSummary.criticalGaps}
                  </div>
                  <div className="text-xs text-gray-600">Critical Gaps</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {aggregatedAssessments.gapSummary.totalGaps}
                  </div>
                  <div className="text-xs text-gray-600">Total Gaps</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Assessment Categories */}
        <div className="space-y-4">
          {includeAllEntities && aggregatedAssessments ? (
            // Aggregated view - show aggregated data for each category
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
              {/* Only show aggregated gap-based assessments */}
              {aggregatedAssessments.health && (
                <AssessmentCategorySummary
                  category="health"
                  assessment={aggregatedAssessments.health}
                  layout="full"
                />
              )}
              {aggregatedAssessments.food && (
                <AssessmentCategorySummary
                  category="food"
                  assessment={aggregatedAssessments.food}
                  layout="full"
                />
              )}
              {aggregatedAssessments.wash && (
                <AssessmentCategorySummary
                  category="wash"
                  assessment={aggregatedAssessments.wash}
                  layout="full"
                />
              )}
              {aggregatedAssessments.shelter && (
                <AssessmentCategorySummary
                  category="shelter"
                  assessment={aggregatedAssessments.shelter}
                  layout="full"
                />
              )}
              {aggregatedAssessments.security && (
                <AssessmentCategorySummary
                  category="security"
                  assessment={aggregatedAssessments.security}
                  layout="full"
                />
              )}
            </div>
          ) : entityAssessments.length > 0 ? (
            // Individual entity view - show detailed assessments for selected entity
            <div className="space-y-6">
              {entityAssessments.map((entity: any, index: number) => (
                <div key={entity.entityId || index} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {entity.entityName}
                    </h3>
                    <span className="text-sm text-gray-500">
                      ({entity.entityType})
                    </span>
                    {entity.location && (
                      <span className="text-sm text-gray-500">
                        • {entity.location}
                      </span>
                    )}
                  </div>

                  {/* Gap-based Assessments Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                    {/* Only render gap-based assessment categories that have data */}
                    {entity.latestAssessments?.HEALTH && (
                      <AssessmentCategorySummary
                        category="health"
                        assessment={entity.latestAssessments?.HEALTH}
                        gapAnalysis={entity.latestAssessments?.HEALTH?.gapAnalysis}
                        layout="split"
                      />
                    )}
                    {entity.latestAssessments?.FOOD && (
                      <AssessmentCategorySummary
                        category="food"
                        assessment={entity.latestAssessments?.FOOD}
                        gapAnalysis={entity.latestAssessments?.FOOD?.gapAnalysis}
                        layout="split"
                      />
                    )}
                    {entity.latestAssessments?.WASH && (
                      <AssessmentCategorySummary
                        category="wash"
                        assessment={entity.latestAssessments?.WASH}
                        gapAnalysis={entity.latestAssessments?.WASH?.gapAnalysis}
                        layout="split"
                      />
                    )}
                    {entity.latestAssessments?.SHELTER && (
                      <AssessmentCategorySummary
                        category="shelter"
                        assessment={entity.latestAssessments?.SHELTER}
                        gapAnalysis={entity.latestAssessments?.SHELTER?.gapAnalysis}
                        layout="split"
                      />
                    )}
                    {entity.latestAssessments?.SECURITY && (
                      <AssessmentCategorySummary
                        category="security"
                        assessment={entity.latestAssessments?.SECURITY}
                        gapAnalysis={entity.latestAssessments?.SECURITY?.gapAnalysis}
                        layout="split"
                      />
                    )}
                  </div>

                  {/* No gap-based assessments available */}
                  {!entity.latestAssessments?.HEALTH && 
                   !entity.latestAssessments?.FOOD && 
                   !entity.latestAssessments?.WASH && 
                   !entity.latestAssessments?.SHELTER && 
                   !entity.latestAssessments?.SECURITY && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Gap-Based Assessments Available
                      </h3>
                      <p className="text-gray-600 mb-4">
                        This entity doesn&apos;t have gap-based assessments yet.
                      </p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>Gap-based assessments include:</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Health</span>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Food</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">WASH</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Shelter</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Security</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gap-based Assessments Note */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <div className="font-medium mb-1">💡 Gap-Based Assessments</div>
                      <div className="text-xs">
                        These assessments identify gaps in critical services and infrastructure for effective humanitarian response.
                      </div>
                    </div>
                  </div>

                  {index < entityAssessments.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            // No entities found
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No entities found
              </h3>
              <p className="text-gray-600">
                No entities are associated with this incident yet.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EntityAssessmentPanel;