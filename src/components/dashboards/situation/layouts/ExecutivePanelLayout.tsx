'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ExecutiveIncidentsTable } from '@/components/dashboards/situation/executive/ExecutiveIncidentsTable';
import { GroupedImpactSummary } from '@/components/dashboards/situation/executive/GroupedImpactSummary';
import { CompactAssessmentTile } from '@/components/dashboards/situation/executive/CompactAssessmentTile';

// Dynamic import for client-side only map component
const AssessmentRelationshipMap = dynamic(
  () => import('@/components/coordinator/AssessmentRelationshipMap').then(mod => ({ default: mod.AssessmentRelationshipMap })),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">Loading map...</div>
  }
);

interface ExecutivePanelLayoutProps {
  incidentId: string;
  onIncidentChange: (incidentId: string) => void;
  onEntityChange: (entityId: string) => void;
  className?: string;
}

export function ExecutivePanelLayout({
  incidentId,
  onIncidentChange,
  onEntityChange,
  className
}: ExecutivePanelLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full transition-all duration-300 ease-in-out", className)}>
      {/* Upper Center: Executive Content - 70% */}
      <div className="flex-[7] min-h-0 space-y-4 overflow-y-auto">
        {/* Active Incidents Overview - Executive Table Format */}
        <div className="transition-all duration-300 ease-out">
          <ExecutiveIncidentsTable />
        </div>
        
        {/* Grouped Preliminary Impact Assessment */}
        <div className="transition-all duration-300 ease-out">
          <GroupedImpactSummary incidentId={incidentId} />
        </div>
        
        {/* Compact Assessment Status Overview */}
        <div className="transition-all duration-300 ease-out">
          <CompactAssessmentTile incidentId={incidentId} />
        </div>
      </div>
      
      {/* Lower Center: Assessment Relationship Map - 30% (unchanged from coordinator) */}
      <div className="flex-[3] min-h-0 mt-2">
        <AssessmentRelationshipMap
          incidentId={incidentId}
          showTimeline={false}
          priorityFilter={[]}
          assessmentTypeFilter={[]}
          onEntitySelect={(entityId) => {
            console.log('Map entity selected:', entityId);
          }}
          onIncidentSelect={(incidentId) => {
            console.log('Map incident selected:', incidentId);
            onIncidentChange(incidentId);
          }}
          onAssessmentSelect={(assessmentId) => {
            console.log('Map assessment selected:', assessmentId);
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}