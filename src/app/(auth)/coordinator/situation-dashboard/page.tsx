'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { SituationDashboardLayout } from '@/components/dashboards/situation/SituationDashboardLayout';
import { IncidentOverviewPanel } from '@/components/dashboards/situation/IncidentOverviewPanel';
import { EntityAssessmentPanel } from '@/components/dashboards/situation/EntityAssessmentPanel';
import { AggregateMetrics } from '@/components/dashboards/situation/components/AggregateMetrics';
import { TopDonorsSection } from '@/components/dashboards/situation/components/TopDonorsSection';
import { useIncidentSelection, useIncidentActions } from '@/stores/dashboardLayout.store';
import { apiGet } from '@/lib/api';

// Dynamic import for client-side only map component
const AssessmentRelationshipMap = dynamic(
  () => import('@/components/coordinator/AssessmentRelationshipMap').then(mod => ({ default: mod.AssessmentRelationshipMap })),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">Loading map...</div>
  }
);

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
 * - Center Panel: Divided into two sections:
 *   - Upper Center: Entity Assessment (Story 7.3) - IMPLEMENTED
 *   - Lower Center: Interactive Leaflet Map from entity-incident-map - NEW
 * - Right Panel: Aggregate Metrics (moved from left panel)
 * 
 * The map dynamically updates based on the selected incident from the left panel.
 * Map component dynamically imported for client-side rendering (SSR-safe).
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

          {/* Center Panel: Divided into upper and lower sections (70-30) */}
          <div className="flex flex-col h-full">
            {/* Upper Center: Entity Assessment Panel - 70% */}
            <div className="flex-[7] min-h-0">
              <EntityAssessmentPanel
                incidentId={currentIncidentId}
                onEntityChange={(entityId) => {
                  console.log('Entity changed to:', entityId);
                }}
                className="h-full"
              />
            </div>
            
            {/* Lower Center: Assessment Relationship Map - 30% */}
            <div className="flex-[3] min-h-0 mt-2">
              <AssessmentRelationshipMap
                incidentId={currentIncidentId}
                showTimeline={false}
                priorityFilter={[]}
                assessmentTypeFilter={[]}
                onEntitySelect={(entityId) => {
                  console.log('Map entity selected:', entityId);
                }}
                onIncidentSelect={(incidentId) => {
                  console.log('Map incident selected:', incidentId);
                }}
                onAssessmentSelect={(assessmentId) => {
                  console.log('Map assessment selected:', assessmentId);
                }}
                className="h-full"
              />
            </div>
          </div>

          {/* Right Panel: Aggregate Metrics + Top Donors */}
          <div className="flex flex-col h-full space-y-4">
            <AggregateMetrics
              incidentId={currentIncidentId}
              className="flex-1"
            />
            <TopDonorsSection
              incidentId={currentIncidentId}
              className="flex-shrink-0"
            />
          </div>
        </SituationDashboardLayout>
      </div>
  );
}