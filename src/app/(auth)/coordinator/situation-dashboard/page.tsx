'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SituationDashboardLayout } from '@/components/dashboards/situation/SituationDashboardLayout';
import { IncidentOverviewPanel } from '@/components/dashboards/situation/IncidentOverviewPanel';
import { EntityAssessmentPanel } from '@/components/dashboards/situation/EntityAssessmentPanel';
import { AggregateMetrics } from '@/components/dashboards/situation/components/AggregateMetrics';
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
 * - Right Panel: Aggregate Metrics (moved from left panel)
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

  // Set default incident on component mount
  useEffect(() => {
    if (!selectedIncidentId) {
      setSelectedIncident(defaultIncidentId);
    }
  }, [selectedIncidentId, setSelectedIncident]);

  return (
    <div className="w-full h-screen overflow-hidden pl-4"> {/* Use full screen height with left padding */}
        {/* Ultra-compact header - minimal spacing optimized for monitors/tablets */}
        <div className="mb-0 px-1 py-0.5 bg-white border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-900">Situation Dashboard</h1>
          <p className="text-xs text-gray-500">
            Real-time disaster situation monitoring and analysis
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

          {/* Right Panel: Aggregate Metrics (moved from left panel) */}
          <div className="flex flex-col h-full">
            <AggregateMetrics
              incidentId={currentIncidentId}
              className="h-full"
            />
          </div>
        </SituationDashboardLayout>
      </div>
  );
}