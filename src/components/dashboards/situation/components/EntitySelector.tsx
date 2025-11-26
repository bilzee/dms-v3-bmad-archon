'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, MapPin, Building2 } from 'lucide-react';
import { useEntitySelection, useEntityActions } from '@/stores/dashboardLayout.store';
import { useIncidentSelection } from '@/stores/dashboardLayout.store';

// Types for entity selector
interface EntityOption {
  id: string;
  name: string;
  type: 'COMMUNITY' | 'WARD' | 'LGA' | 'STATE' | 'FACILITY' | 'CAMP';
  subType?: string;
  location?: string;
  affectedAt: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface EntitySelectorProps {
  selectedEntityId?: string;
  incidentId: string;
  onEntityChange: (entityId: string) => void;
  includeAllOption?: boolean;
  className?: string;
}

// Entity type icons and labels
const entityTypeConfig = {
  COMMUNITY: { label: 'Community', icon: Building2 },
  WARD: { label: 'Ward', icon: MapPin },
  LGA: { label: 'Local Govt', icon: MapPin },
  STATE: { label: 'State', icon: MapPin },
  FACILITY: { label: 'Facility', icon: Building2 },
  CAMP: { label: 'Camp', icon: Building2 }
} as const;

// Severity badge variants
const severityVariants = {
  CRITICAL: 'destructive',
  HIGH: 'secondary',
  MEDIUM: 'outline',
  LOW: 'outline'
} as const;

// Fetch entities from dashboard API
const fetchEntities = async (incidentId: string): Promise<EntityOption[]> => {
  if (!incidentId) {
    return [];
  }

  const response = await apiGet(`/api/v1/dashboard/situation?incidentId=${incidentId}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch entities');
  }

  return response.data.entities.map((entity: any) => ({
    id: entity.entityId,
    name: entity.entityName,
    type: entity.entityType,
    location: entity.location,
    affectedAt: entity.lastUpdated,
    severity: entity.gapSummary?.criticalGaps > 0 ? 'CRITICAL' : 
             entity.gapSummary?.totalGaps > 0 ? 'HIGH' : 'LOW'
  }));
};

/**
 * EntitySelector Component
 * 
 * Provides dropdown functionality for selecting entities with:
 * - Entity fetching filtered by selected incident
 * - "All Entities" as default option for aggregated view
 * - Entity type indicators and severity badges
 * - Loading and error states
 * - Integration with dashboard state management
 */
export function EntitySelector({
  selectedEntityId,
  incidentId,
  onEntityChange,
  includeAllOption = true,
  className
}: EntitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { entityHistory, includeAllEntities } = useEntitySelection();
  const { setSelectedEntity, setIncludeAllEntities } = useEntityActions();

  // Fetch entities data
  const {
    data: entities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['api-v1-dashboard-situation', incidentId, 'selector'],
    queryFn: () => fetchEntities(incidentId),
    enabled: !!incidentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Group entities by type for better organization
  const groupedEntities = useMemo(() => {
    const groups: Record<string, EntityOption[]> = {};
    
    entities.forEach(entity => {
      if (!groups[entity.type]) {
        groups[entity.type] = [];
      }
      groups[entity.type].push(entity);
    });

    // Sort entities within each group by name
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [entities]);

  // Get recently selected entities from history
  const recentEntities = useMemo(() => {
    return entityHistory
      .map(id => entities.find(e => e.id === id))
      .filter(Boolean) as EntityOption[];
  }, [entityHistory, entities]);

  // Handle entity selection
  const handleEntityChange = (entityId: string) => {
    setSelectedEntity(entityId);
    onEntityChange(entityId);
    setIsOpen(false);
  };

  // Handle "All Entities" selection
  const handleAllEntitiesSelection = () => {
    setIncludeAllEntities(true);
    onEntityChange('all');
    setIsOpen(false);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedEntity(null);
    onEntityChange('');
    setIsOpen(false);
  };

  // Get selected entity details
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  // Show loading state when incident changes
  if (!incidentId) {
    return (
      <div className={cn("p-3 border border-gray-200 bg-gray-50 rounded-md", className)}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="h-4 w-4" />
          <span>Select an incident first</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-md", className)}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-700">Failed to load entities</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="ml-auto text-red-700 hover:text-red-800"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          Entity Selection
        </label>
        {entityHistory.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Building2 className="h-3 w-3" />
            <span>{entityHistory.length} recent</span>
          </div>
        )}
      </div>

      <Select
        value={selectedEntityId || (includeAllEntities ? 'all' : '')}
        onValueChange={(value) => {
          if (value === 'all') {
            handleAllEntitiesSelection();
          } else {
            handleEntityChange(value);
          }
        }}
        open={isOpen}
        onOpenChange={setIsOpen}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading entities...</span>
            </div>
          ) : includeAllEntities ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">All Entities</span>
              <span className="text-gray-500">({entities.length} total)</span>
            </div>
          ) : selectedEntity ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {React.createElement(entityTypeConfig[selectedEntity.type].icon, {
                  className: "h-4 w-4"
                })}
                <span className="font-medium">{selectedEntity.name}</span>
                <span className="text-gray-500 text-xs">
                  ({entityTypeConfig[selectedEntity.type].label})
                </span>
              </div>
              <Badge variant={severityVariants[selectedEntity.severity]} className="text-xs">
                {selectedEntity.severity}
              </Badge>
            </div>
          ) : (
            <span>Select an entity...</span>
          )}
        </SelectTrigger>

        <SelectContent className="max-h-80">
          {/* "All Entities" option */}
          {includeAllOption && (
            <SelectItem value="all" className="font-medium">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>All Entities</span>
                <span className="text-gray-500">({entities.length} total)</span>
              </div>
            </SelectItem>
          )}

          {/* Divider if "All Entities" option is shown */}
          {includeAllOption && entities.length > 0 && (
            <div className="border-t my-1" />
          )}

          {/* Recently selected entities */}
          {recentEntities.length > 0 && (
            <div className="border-b pb-1 mb-1">
              <div className="px-2 py-1.5 text-xs font-medium text-gray-500 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Recently Selected
              </div>
              {recentEntities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id} className="pl-6">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {React.createElement(entityTypeConfig[entity.type].icon, {
                        className: "h-4 w-4"
                      })}
                      <span className="font-medium">{entity.name}</span>
                      <span className="text-gray-500 text-xs">
                        ({entityTypeConfig[entity.type].label})
                      </span>
                    </div>
                    <Badge variant={severityVariants[entity.severity]} className="text-xs">
                      {entity.severity}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </div>
          )}

          {/* Entities grouped by type */}
          {Object.entries(groupedEntities).map(([type, typeEntities]) => (
            <div key={type} className="mb-1">
              <div className="px-2 py-1.5 text-xs font-medium text-gray-600 flex items-center gap-1">
                {React.createElement(entityTypeConfig[type as keyof typeof entityTypeConfig].icon, {
                  className: "h-3 w-3"
                })}
                {entityTypeConfig[type as keyof typeof entityTypeConfig].label} 
                ({typeEntities.length})
              </div>
              {typeEntities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id} className="pl-6">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entity.name}</span>
                      {entity.location && (
                        <span className="text-gray-400 text-xs truncate ml-2">
                          📍 {entity.location}
                        </span>
                      )}
                    </div>
                    <Badge variant={severityVariants[entity.severity]} className="text-xs">
                      {entity.severity}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}

          {/* No entities found */}
          {entities.length === 0 && !isLoading && (
            <div className="px-2 py-4 text-center text-sm text-gray-500">
              No entities found for this incident
            </div>
          )}

          {/* Clear selection option */}
          {selectedEntityId && (
            <div className="border-t pt-1 mt-1">
              <button
                onClick={handleClearSelection}
                className="w-full px-2 py-1.5 text-left text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded"
              >
                Clear Selection
              </button>
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Selected entity details */}
      {selectedEntity && (
        <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs text-gray-600">
          <div className="font-medium text-gray-700">{selectedEntity.name}</div>
          <div className="mt-1 text-gray-500">
            Type: {entityTypeConfig[selectedEntity.type].label}
            {selectedEntity.location && ` • Location: ${selectedEntity.location}`}
          </div>
          <div className="text-gray-400">
            Affected: {new Date(selectedEntity.affectedAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default EntitySelector;