'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { EntityAssessmentPanel } from '@/components/dashboards/situation/EntityAssessmentPanel';
import { AggregateMetrics } from '@/components/dashboards/situation/components/AggregateMetrics';
import { TopDonorsSection } from '@/components/dashboards/situation/components/TopDonorsSection';
import { cn } from '@/lib/utils';

// Dynamic import for client-side only map component
const AssessmentRelationshipMap = dynamic(
  () => import('@/components/coordinator/AssessmentRelationshipMap').then(mod => ({ default: mod.AssessmentRelationshipMap })),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">Loading map...</div>
  }
);

interface CoordinatorPanelLayoutProps {
  incidentId: string;
  onIncidentChange: (incidentId: string) => void;
  onEntityChange: (entityId: string) => void;
  className?: string;
}

export function CoordinatorPanelLayout({
  incidentId,
  onIncidentChange,
  onEntityChange,
  className
}: CoordinatorPanelLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full transition-all duration-300 ease-in-out", className)}>
      {/* Upper Center: Entity Assessment Panel - 70% */}
      <div className="flex-[7] min-h-0">
        <div className="transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-left-2" style={{ animationDelay: '0ms' }}>
          <EntityAssessmentPanel
            incidentId={incidentId}
            onEntityChange={(entityId) => {
              console.log('Entity changed to:', entityId);
              onEntityChange(entityId);
            }}
            className="h-full"
          />
        </div>
      </div>
      
      {/* Lower Center: Assessment Relationship Map - 30% */}
      <div className="flex-[3] min-h-0 mt-2">
        <div className="transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-left-2" style={{ animationDelay: '100ms' }}>
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
    </div>
  );
}