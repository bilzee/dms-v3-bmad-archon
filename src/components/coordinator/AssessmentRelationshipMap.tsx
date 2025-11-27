'use client';

/**
 * Assessment Relationship Map Component
 * 
 * Interactive map visualization showing entity-incident relationships through assessments.
 * Features priority-based color coding, assessment type filtering, timeline controls,
 * and cluster visualization for performance with large datasets.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup, LayerGroup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { 
  EntityIncidentRelationship,
  RelationshipQueryParams 
} from '@/types/assessment-relationships';
import type { Priority, AssessmentType } from '@prisma/client';

// Fix Leaflet default markers
import L from 'leaflet';

// Fix default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AssessmentRelationshipMapProps {
  incidentId?: string;
  entityId?: string;
  showTimeline?: boolean;
  priorityFilter?: Priority[];
  assessmentTypeFilter?: AssessmentType[];
  onEntitySelect?: (entityId: string) => void;
  onIncidentSelect?: (incidentId: string) => void;
  onAssessmentSelect?: (assessmentId: string) => void;
  className?: string;
}

// Priority color mapping for map visualization
const PRIORITY_COLORS = {
  CRITICAL: '#dc2626', // red-600
  HIGH: '#ea580c',     // orange-600
  MEDIUM: '#ca8a04',   // yellow-600
  LOW: '#16a34a',      // green-600
} as const;

// Assessment type icons/symbols
const ASSESSMENT_TYPE_SYMBOLS = {
  HEALTH: '⚕️',
  WASH: '💧',
  SHELTER: '🏠',
  FOOD: '🍽️',
  SECURITY: '🛡️',
  POPULATION: '👥',
} as const;

export function AssessmentRelationshipMap({
  incidentId,
  entityId,
  showTimeline = true,
  priorityFilter = [],
  assessmentTypeFilter = [],
  onEntitySelect,
  onIncidentSelect,
  onAssessmentSelect,
  className,
}: AssessmentRelationshipMapProps) {
  // State management
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>(priorityFilter);
  const [selectedAssessmentTypes, setSelectedAssessmentTypes] = useState<AssessmentType[]>(assessmentTypeFilter);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [zoomLevel, setZoomLevel] = useState(10);
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.8311, 13.1511]); // Maiduguri center
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Query parameters
  const queryParams: RelationshipQueryParams = useMemo(() => ({
    incidentId,
    entityId,
    priorityFilter: selectedPriorities.length > 0 ? selectedPriorities : undefined,
    assessmentTypeFilter: selectedAssessmentTypes.length > 0 ? selectedAssessmentTypes : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  }), [incidentId, entityId, selectedPriorities, selectedAssessmentTypes, dateRange]);

  // Fetch latest assessments for selected entity
  const { data: entityAssessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['entity-assessments', selectedEntityId],
    queryFn: async () => {
      if (!selectedEntityId) return null;
      
      const response = await fetch(`/api/v1/entities/${selectedEntityId}/assessments/latest`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch entity assessments');
      }
      
      return response.json();
    },
    enabled: !!selectedEntityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch relationship data
  const { data: relationships, isLoading, error } = useQuery({
    queryKey: ['assessment-relationships', queryParams],
    queryFn: async () => {
      const response = await fetch('/api/v1/relationships/statistics?' + new URLSearchParams({
        ...(queryParams.incidentId && { incidentId: queryParams.incidentId }),
        ...(queryParams.entityId && { entityId: queryParams.entityId }),
        ...(queryParams.priorityFilter && { priorityFilter: queryParams.priorityFilter.join(',') }),
        ...(queryParams.assessmentTypeFilter && { assessmentTypeFilter: queryParams.assessmentTypeFilter.join(',') }),
        ...(queryParams.startDate && { startDate: queryParams.startDate.toISOString() }),
        ...(queryParams.endDate && { endDate: queryParams.endDate.toISOString() }),
      }));
      
      if (!response.ok) {
        throw new Error('Failed to fetch relationship data');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch detailed relationship data for map markers
  const { data: detailedRelationships } = useQuery({
    queryKey: ['detailed-relationships', queryParams],
    queryFn: async () => {
      if (incidentId) {
        // Get entities for specific incident
        const response = await fetch(`/api/v1/incidents/${incidentId}/entities?` + new URLSearchParams({
          ...(queryParams.priorityFilter && { priorityFilter: queryParams.priorityFilter.join(',') }),
          ...(queryParams.assessmentTypeFilter && { assessmentTypeFilter: queryParams.assessmentTypeFilter.join(',') }),
          ...(queryParams.startDate && { startDate: queryParams.startDate.toISOString() }),
          ...(queryParams.endDate && { endDate: queryParams.endDate.toISOString() }),
        }));
        
        if (!response.ok) {
          throw new Error('Failed to fetch incident entities');
        }
        
        const result = await response.json();
        
        // console.log('Entities API response:', result);
        // console.log('Number of entities received:', result.data?.length);
        
        // Transform EntityWithRelationships[] to EntityIncidentRelationship[]
        return result.data.map((entity: any) => ({
          entityId: entity.id,
          incidentId: incidentId,
          entity: entity,
          incident: { id: incidentId }, // Will be populated from context
          assessments: [],
          priorityDistribution: entity.priorityDistribution || {
            CRITICAL: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
          },
          latestAssessment: { id: `assessment-${entity.id}` }, // Placeholder
          totalAssessments: entity.assessmentCount || 0,
          firstAssessmentDate: new Date(),
          lastAssessmentDate: new Date(),
        }));
      } else {
        // Get comprehensive relationships
        const response = await fetch('/api/v1/relationships?' + new URLSearchParams({
          ...(queryParams.entityId && { entityId: queryParams.entityId }),
          ...(queryParams.priorityFilter && { priorityFilter: queryParams.priorityFilter.join(',') }),
          ...(queryParams.assessmentTypeFilter && { assessmentTypeFilter: queryParams.assessmentTypeFilter.join(',') }),
          ...(queryParams.startDate && { startDate: queryParams.startDate.toISOString() }),
          ...(queryParams.endDate && { endDate: queryParams.endDate.toISOString() }),
        }));
        
        if (!response.ok) {
          throw new Error('Failed to fetch relationship data');
        }
        
        const result = await response.json();
        return result.data as EntityIncidentRelationship[];
      }
    },
    enabled: !!relationships?.success,
  });

  // Filter handlers
  const handlePriorityFilterChange = (priorities: string[]) => {
    setSelectedPriorities(priorities as Priority[]);
  };

  const handleAssessmentTypeFilterChange = (types: string[]) => {
    setSelectedAssessmentTypes(types as AssessmentType[]);
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  // Map marker creation
  const createMarkerForRelationship = (relationship: EntityIncidentRelationship) => {
    const entity = relationship.entity;
    const coordinates = entity.coordinates as any;
    
    // console.log('Creating marker for entity:', entity.name, 'coordinates:', coordinates);
    
    if (!coordinates?.lat || !coordinates?.lng) {
      // console.log('No valid coordinates for entity:', entity.name);
      return null;
    }

    const dominantPriority = Object.entries(relationship.priorityDistribution)
      .reduce((max, [priority, count]) => count > max.count ? { priority: priority as Priority, count } : max, 
        { priority: 'LOW' as Priority, count: 0 }).priority;

    const markerColor = PRIORITY_COLORS[dominantPriority];

    // console.log(`Creating CircleMarker at [${coordinates.lat}, ${coordinates.lng}] with priority ${dominantPriority} for ${entity.name}`);

    return (
      <CircleMarker
        key={`${relationship.entityId}-${relationship.incidentId}`}
        center={[coordinates.lat, coordinates.lng]}
        radius={12}
        pathOptions={{
          fillColor: markerColor,
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
        }}
        eventHandlers={{
          click: () => {
            // console.log(`Clicked on entity: ${entity.name}`);
            setSelectedEntityId(relationship.entityId);
            onEntitySelect?.(relationship.entityId);
            onIncidentSelect?.(relationship.incidentId);
          },
        }}
      >
        <Popup>
          <div className="p-2 min-w-64">
            <h3 className="font-semibold text-sm mb-2">{entity.name}</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Type:</span>
                <Badge variant="outline" className="text-xs">{entity.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Total Assessments:</span>
                <span className="font-medium">{relationship.totalAssessments}</span>
              </div>
              <div className="flex justify-between">
                <span>Incident:</span>
                <span className="font-medium text-xs">{relationship.incident.type}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium">Priority Distribution:</span>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(relationship.priorityDistribution).map(([priority, count]) => (
                    count > 0 && (
                      <div key={priority} className="flex justify-between">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ backgroundColor: PRIORITY_COLORS[priority as Priority], color: 'white' }}
                        >
                          {priority}
                        </Badge>
                        <span>{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t">
                <Button 
                  size="sm" 
                  className="w-full text-xs"
                  variant={selectedEntityId === relationship.entityId ? "default" : "outline"}
                  onClick={() => setSelectedEntityId(relationship.entityId)}
                >
                  {selectedEntityId === relationship.entityId ? "✓ Selected" : "Select Entity"}
                </Button>
              </div>
            </div>
          </div>
        </Popup>
      </CircleMarker>
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full h-96", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Loading relationship map...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full h-96", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-destructive">Failed to load relationship data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Assessment-Based Relationships
            {relationships?.data && (
              <Badge variant="outline">
                {relationships.data.totalAssessments} assessments
              </Badge>
            )}
          </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select onValueChange={(value) => handlePriorityFilterChange([value])}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="z-[1001]">
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => handleAssessmentTypeFilterChange([value])}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Assessment" />
            </SelectTrigger>
            <SelectContent className="z-[1001]">
              <SelectItem value="HEALTH">Health</SelectItem>
              <SelectItem value="WASH">WASH</SelectItem>
              <SelectItem value="SHELTER">Shelter</SelectItem>
              <SelectItem value="FOOD">Food</SelectItem>
              <SelectItem value="SECURITY">Security</SelectItem>
              <SelectItem value="POPULATION">Population</SelectItem>
            </SelectContent>
          </Select>

          {showTimeline && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Date Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  onSelect={(range) => {
                    handleDateRangeChange(range?.from || null, range?.to || null);
                  }}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Legend */}
          <div className="flex gap-2 ml-auto">
            {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
              <div key={priority} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{priority}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="h-96 w-full relative">
          <MapContainer
            center={mapCenter}
            zoom={zoomLevel}
            style={{ height: '100%', width: '100%' }}
            className="rounded-b-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <LayerGroup>
              {detailedRelationships?.map(createMarkerForRelationship).filter(Boolean)}
            </LayerGroup>
          </MapContainer>

          {/* Statistics Overlay */}
          {relationships?.data && (
            <Card className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">{relationships.data.totalEntities}</div>
                      <div className="text-muted-foreground text-xs">Entities</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="font-medium">{relationships.data.totalIncidents}</div>
                      <div className="text-muted-foreground text-xs">Incidents</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Assessment Details Panel */}
    {selectedEntityId && (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Latest Assessments
            {entityAssessments?.data?.entity && (
              <Badge variant="outline">
                {entityAssessments.data.entity.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assessmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading assessment details...</div>
            </div>
          ) : entityAssessments?.data?.latestAssessments?.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entityAssessments.data.latestAssessments.map((assessmentData: any) => (
                <Card key={assessmentData.type} className="bg-gray-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{ASSESSMENT_TYPE_SYMBOLS[assessmentData.type as keyof typeof ASSESSMENT_TYPE_SYMBOLS]}</span>
                        <span>{assessmentData.type}</span>
                      </div>
                      <Badge 
                        variant="outline"
                        style={{ 
                          backgroundColor: PRIORITY_COLORS[assessmentData.assessment.priority as Priority],
                          color: 'white'
                        }}
                      >
                        {assessmentData.assessment.priority}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Assessment Score */}
                    {assessmentData.assessment.summary.overallScore !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Score:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-blue-600"
                              style={{ width: `${assessmentData.assessment.summary.overallScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {assessmentData.assessment.summary.overallScore}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Critical Gaps */}
                    {assessmentData.assessment.summary.criticalGaps.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <AlertTriangle className="h-3 w-3 text-orange-600" />
                          <span className="text-xs font-medium text-orange-800">Critical Gaps</span>
                        </div>
                        <div className="space-y-1">
                          {assessmentData.assessment.summary.criticalGaps.slice(0, 3).map((gap: string, index: number) => (
                            <div key={index} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                              {gap}
                            </div>
                          ))}
                          {assessmentData.assessment.summary.criticalGaps.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{assessmentData.assessment.summary.criticalGaps.length - 3} more gaps
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Key Metrics */}
                    <div>
                      <span className="text-xs font-medium text-gray-700 mb-2 block">Key Metrics</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(assessmentData.assessment.summary.keyMetrics).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground truncate pr-1">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                            </span>
                            <span className="font-medium">
                              {typeof value === 'boolean' ? (value ? '✓' : '✗') : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assessment Date */}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Assessed:</span>
                        <span>{new Date(assessmentData.assessment.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>By:</span>
                        <span className="truncate pl-1">{assessmentData.assessment.assessor?.name}</span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs"
                      onClick={() => {
                        onAssessmentSelect?.(assessmentData.assessment.id);
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground">No assessments available for this entity</div>
              <div className="text-xs text-muted-foreground mt-1">
                Select a different entity on the map to view assessments
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )}
    </div>
  );
}