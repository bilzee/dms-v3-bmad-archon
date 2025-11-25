'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layouts/AppShell';
import { SituationDashboardLayout } from '@/components/dashboards/situation/SituationDashboardLayout';
import { IncidentOverviewPanel } from '@/components/dashboards/situation/IncidentOverviewPanel';
import { EntityAssessmentPanel } from '@/components/dashboards/situation/EntityAssessmentPanel';
import { GapAnalysisSummary } from '@/components/dashboards/situation/components/GapAnalysisSummary';
import { useGapAnalysisRealtime } from '@/hooks/useGapAnalysisRealtime';
import { useIncidentSelection, useIncidentActions } from '@/stores/dashboardLayout.store';
import { apiGet } from '@/lib/api';

// Fetch incident data for dynamic incident name
const fetchIncidentData = async (incidentId: string) => {
  const response = await apiGet(`/api/v1/dashboard/situation?incidentId=${incidentId}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch incident data');
  }
  return response.data;
};

/**
 * Coordinator Situation Dashboard Page
 * 
 * This page provides a comprehensive situation awareness dashboard with three panels:
 * - Left Panel: Incident Overview (Story 7.2) - IMPLEMENTED
 * - Center Panel: Entity Assessment (Story 7.3) - IMPLEMENTED
 * - Right Panel: Gap Analysis Summary (Story 7.5) - IMPLEMENTED
 * 
 * Note: Interactive Map (Story 7.4) temporarily disabled due to SSR issues
 */
export default function SituationDashboardPage() {
  // State management for selected incident
  const { selectedIncidentId } = useIncidentSelection();
  const { setSelectedIncident } = useIncidentActions();
  
  // Default incident if none selected
  const defaultIncidentId = 'incident-flood-001';
  const currentIncidentId = selectedIncidentId || defaultIncidentId;

  // Fetch incident data for dynamic incident name
  const { data: incidentData } = useQuery({
    queryKey: ['api-v1-dashboard-situation', currentIncidentId, 'all'],
    queryFn: () => fetchIncidentData(currentIncidentId!),
    enabled: !!currentIncidentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get dynamic incident name
  const currentIncidentName = incidentData?.selectedIncident?.incident?.description || 
                            incidentData?.incidents?.find((inc: any) => inc.id === currentIncidentId)?.description || 
                            'Selected Incident';

  // Set default incident on component mount
  useEffect(() => {
    if (!selectedIncidentId) {
      setSelectedIncident(defaultIncidentId);
    }
  }, [selectedIncidentId, setSelectedIncident]);

  // Real-time gap analysis data
  const { 
    data: gapAnalysisData, 
    isLoading: isGapAnalysisLoading,
    isError: isGapAnalysisError 
  } = useGapAnalysisRealtime({
    incidentId: currentIncidentId,
    enabled: !!currentIncidentId,
    refetchInterval: 30000, // 30 seconds
    onSuccess: (data) => {
      console.log('Gap analysis data updated:', data);
    },
    onError: (error) => {
      console.error('Gap analysis error:', error);
    }
  });

  return (
    <AppShell>
      <div className="w-full h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Situation Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive view of disaster situation, entity assessments, and gap analysis
          </p>
        </div>
        
        {/* Three-panel dashboard layout */}
        <SituationDashboardLayout>
          {/* Left Panel: Incident Overview - Story 7.2 IMPLEMENTED */}
          <IncidentOverviewPanel
            incidentId={currentIncidentId}
            onIncidentChange={(incidentId) => {
              console.log('Incident changed to:', incidentId);
              setSelectedIncident(incidentId);
            }}
            className="h-full"
          />

          {/* Center Panel: Entity Assessment - Story 7.3 IMPLEMENTED */}
          <div className="flex flex-col h-full">
            <EntityAssessmentPanel
              incidentId={currentIncidentId}
              onEntityChange={(entityId) => {
                console.log('Entity changed to:', entityId);
              }}
              className="h-full"
            />
            
            {/* Map placeholder - Story 7.4 implementation temporarily disabled due to SSR issues */}
            <div className="flex-1 max-h-[50%] overflow-hidden mt-4">
              <div className="h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-lg mb-2">🗺️</div>
                  <p className="text-sm font-medium">Interactive Map</p>
                  <p className="text-xs">Story 7.4 - Temporarily disabled due to SSR issues</p>
                  <p className="text-xs">Implementation complete, will be restored after SSR fix</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Gap Analysis Summary - Story 7.5 IMPLEMENTED */}
          <div className="flex flex-col h-full">
            <GapAnalysisSummary
              incidentId={currentIncidentId}
              incidentName={currentIncidentName}
              data={gapAnalysisData}
              isLoading={isGapAnalysisLoading}
              className="h-full"
            />
            
            {isGapAnalysisError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Error loading gap analysis data</strong>
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Please check your connection and try again
                </p>
              </div>
            )}
          </div>
        </SituationDashboardLayout>
      </div>
    </AppShell>
  );
}