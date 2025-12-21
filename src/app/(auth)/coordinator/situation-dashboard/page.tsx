'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { SituationDashboardLayout } from '@/components/dashboards/situation/SituationDashboardLayout';
import { IncidentOverviewPanel } from '@/components/dashboards/situation/IncidentOverviewPanel';
import { CoordinatorPanelLayout } from '@/components/dashboards/situation/layouts/CoordinatorPanelLayout';
import { ExecutivePanelLayout } from '@/components/dashboards/situation/layouts/ExecutivePanelLayout';
import { AggregateMetrics } from '@/components/dashboards/situation/components/AggregateMetrics';
import { TopDonorsSection } from '@/components/dashboards/situation/components/TopDonorsSection';
import { ModeToggle, type DashboardMode } from '@/components/dashboards/situation/shared/ModeToggle';
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
 * - Center Panel: Divided into two sections:
 *   - Upper Center: Entity Assessment (Story 7.3) - IMPLEMENTED
 *   - Lower Center: Interactive Leaflet Map from entity-incident-map - NEW
 * - Right Panel: Aggregate Metrics (moved from left panel)
 * 
 * The map dynamically updates based on the selected incident from the left panel.
 * Map component dynamically imported for client-side rendering (SSR-safe).
 */
export default function SituationDashboardPage() {
  // Dashboard mode state management
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('coordinator');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // State management for selected incident
  const { selectedIncidentId } = useIncidentSelection();
  const { setSelectedIncident } = useIncidentActions();

  // Handle mode change with transition
  const handleModeChange = (newMode: DashboardMode) => {
    if (newMode !== dashboardMode) {
      setIsTransitioning(true);
      setTimeout(() => {
        setDashboardMode(newMode);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 250);
    }
  };
  
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
        {/* Enhanced header with mode toggle */}
        <div className="mb-2 px-1 py-2 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-semibold text-gray-900">Situation Dashboard</h1>
              <p className="text-xs text-gray-500">
                Real-time disaster situation monitoring and analysis
              </p>
            </div>
            <ModeToggle 
              mode={dashboardMode} 
              onModeChange={handleModeChange}
              className="flex-shrink-0"
            />
          </div>
        </div>
        
        {/* Dynamic dashboard layout with enhanced smooth transitions */}
        <div className="relative w-full h-full">
          <SituationDashboardLayout>
          {/* Left Panel: Incident Overview - Always visible with subtle transition */}
          <div className="transition-all duration-300 ease-out">
            <IncidentOverviewPanel
              incidentId={currentIncidentId}
              onIncidentChange={(incidentId) => {
                console.log('Incident changed to:', incidentId);
                setSelectedIncident(incidentId);
              }}
              dashboardMode={dashboardMode}
              className="h-full"
            />
          </div>

          {/* Dynamic Center Panel with fade transition */}
          <div className="relative h-full">
            <div className={`h-full transition-all duration-500 ease-in-out transform ${
              isTransitioning 
                ? 'opacity-0 translate-y-4' 
                : 'opacity-100 translate-y-0'
            }`}>
              {dashboardMode === 'coordinator' ? (
                <CoordinatorPanelLayout
                  incidentId={currentIncidentId}
                  onIncidentChange={setSelectedIncident}
                  onEntityChange={(entityId) => {
                    console.log('Entity changed to:', entityId);
                  }}
                />
              ) : (
                <ExecutivePanelLayout
                  incidentId={currentIncidentId}
                  onIncidentChange={setSelectedIncident}
                  onEntityChange={(entityId) => {
                    console.log('Entity changed to:', entityId);
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Panel: Aggregate Metrics + Top Donors with subtle scale transition */}
          <div className="flex flex-col h-full space-y-4 transition-all duration-300 ease-out">
            <AggregateMetrics
              incidentId={currentIncidentId}
              className="flex-1 transition-all duration-300 ease-out"
            />
            <TopDonorsSection
              incidentId={currentIncidentId}
              className="flex-shrink-0 transition-all duration-300 ease-out"
            />
          </div>
          </SituationDashboardLayout>
        </div>
      </div>
  );
}