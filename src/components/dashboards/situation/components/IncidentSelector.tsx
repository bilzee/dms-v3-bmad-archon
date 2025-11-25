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
import { Loader2, AlertCircle, History } from 'lucide-react';
import { useIncidentSelection, useIncidentActions } from '@/stores/dashboardLayout.store';

// Types for incident selector
interface IncidentOption {
  id: string;
  type: string;
  subType: string;
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  location: string;
  description: string;
}

interface IncidentSelectorProps {
  selectedIncidentId?: string;
  onIncidentChange: (incidentId: string) => void;
  includeHistorical?: boolean;
  className?: string;
}

// Status badge variants
const statusVariants = {
  ACTIVE: 'destructive',
  CONTAINED: 'secondary', 
  RESOLVED: 'default'
} as const;

// Severity badge variants
const severityVariants = {
  CRITICAL: 'destructive',
  HIGH: 'secondary',
  MEDIUM: 'outline',
  LOW: 'outline'
} as const;

// Fetch incidents from dashboard API
const fetchIncidents = async (includeHistorical = false): Promise<IncidentOption[]> => {
  const params = new URLSearchParams({
    includeHistorical: includeHistorical.toString(),
    limit: '50'
  });

  const response = await apiGet(`/api/v1/dashboard/situation?${params}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch incidents');
  }

  return response.data.incidents.map((incident: any) => ({
    id: incident.id,
    type: incident.type,
    subType: incident.subType,
    status: incident.status,
    severity: incident.severity,
    createdAt: incident.createdAt,
    location: incident.location,
    description: incident.description
  }));
};

/**
 * IncidentSelector Component
 * 
 * Provides dropdown functionality for selecting incidents with:
 * - Real-time incident fetching with filtering
 * - Status and severity indicators
 * - Historical incident access
 * - Loading and error states
 * - Integration with dashboard state management
 */
export function IncidentSelector({
  selectedIncidentId,
  onIncidentChange,
  includeHistorical = false,
  className
}: IncidentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { incidentHistory } = useIncidentSelection();
  const { setSelectedIncident } = useIncidentActions();

  // Fetch incidents data
  const {
    data: incidents = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['incidents', includeHistorical],
    queryFn: () => fetchIncidents(includeHistorical),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Group incidents by status for better organization
  const groupedIncidents = useMemo(() => {
    const groups = {
      active: incidents.filter(i => i.status === 'ACTIVE'),
      contained: incidents.filter(i => i.status === 'CONTAINED'),
      resolved: incidents.filter(i => i.status === 'RESOLVED')
    };
    return groups;
  }, [incidents]);

  // Get recently selected incidents from history
  const recentIncidents = useMemo(() => {
    return incidentHistory
      .map(id => incidents.find(i => i.id === id))
      .filter(Boolean) as IncidentOption[];
  }, [incidentHistory, incidents]);

  // Handle incident selection
  const handleIncidentChange = (incidentId: string) => {
    setSelectedIncident(incidentId);
    onIncidentChange(incidentId);
    setIsOpen(false);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIncident(null);
    onIncidentChange('');
    setIsOpen(false);
  };

  // Get selected incident details
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-md", className)}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-700">Failed to load incidents</span>
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
          Incident Selection
        </label>
        {incidentHistory.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <History className="h-3 w-3" />
            <span>{incidentHistory.length} recent</span>
          </div>
        )}
      </div>

      <Select
        value={selectedIncidentId || ''}
        onValueChange={handleIncidentChange}
        open={isOpen}
        onOpenChange={setIsOpen}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading incidents...</span>
            </div>
          ) : selectedIncident ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedIncident.type}</span>
                {selectedIncident.subType && (
                  <span className="text-gray-500">- {selectedIncident.subType}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={statusVariants[selectedIncident.status]} className="text-xs">
                  {selectedIncident.status}
                </Badge>
                <Badge variant={severityVariants[selectedIncident.severity]} className="text-xs">
                  {selectedIncident.severity}
                </Badge>
              </div>
            </div>
          ) : (
            <span>Select an incident...</span>
          )}
        </SelectTrigger>

        <SelectContent className="max-h-80">
          {/* Recently selected incidents */}
          {recentIncidents.length > 0 && (
            <div className="border-b pb-1 mb-1">
              <div className="px-2 py-1.5 text-xs font-medium text-gray-500 flex items-center gap-1">
                <History className="h-3 w-3" />
                Recently Selected
              </div>
              {recentIncidents.map((incident) => (
                <SelectItem key={incident.id} value={incident.id} className="pl-6">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{incident.type}</span>
                      {incident.subType && (
                        <span className="text-gray-500 text-xs">- {incident.subType}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={statusVariants[incident.status]} className="text-xs">
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </div>
          )}

          {/* Active incidents */}
          {groupedIncidents.active.length > 0 && (
            <div className="mb-1">
              <div className="px-2 py-1.5 text-xs font-medium text-red-600">
                Active Incidents ({groupedIncidents.active.length})
              </div>
              {groupedIncidents.active.map((incident) => (
                <SelectItem key={incident.id} value={incident.id} className="pl-6">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{incident.type}</span>
                      {incident.subType && (
                        <span className="text-gray-500 text-xs">- {incident.subType}</span>
                      )}
                      <span className="text-gray-400 text-xs truncate ml-2">
                        {incident.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={severityVariants[incident.severity]} className="text-xs">
                        {incident.severity}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </div>
          )}

          {/* Contained incidents */}
          {includeHistorical && groupedIncidents.contained.length > 0 && (
            <div className="mb-1">
              <div className="px-2 py-1.5 text-xs font-medium text-yellow-600">
                Contained Incidents ({groupedIncidents.contained.length})
              </div>
              {groupedIncidents.contained.map((incident) => (
                <SelectItem key={incident.id} value={incident.id} className="pl-6">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{incident.type}</span>
                      {incident.subType && (
                        <span className="text-gray-500 text-xs">- {incident.subType}</span>
                      )}
                      <span className="text-gray-400 text-xs truncate ml-2">
                        {incident.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={severityVariants[incident.severity]} className="text-xs">
                        {incident.severity}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </div>
          )}

          {/* Resolved incidents */}
          {includeHistorical && groupedIncidents.resolved.length > 0 && (
            <div className="mb-1">
              <div className="px-2 py-1.5 text-xs font-medium text-gray-600">
                Resolved Incidents ({groupedIncidents.resolved.length})
              </div>
              {groupedIncidents.resolved.map((incident) => (
                <SelectItem key={incident.id} value={incident.id} className="pl-6">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{incident.type}</span>
                      {incident.subType && (
                        <span className="text-gray-500 text-xs">- {incident.subType}</span>
                      )}
                      <span className="text-gray-400 text-xs truncate ml-2">
                        {incident.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        RESOLVED
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </div>
          )}

          {/* No incidents found */}
          {incidents.length === 0 && !isLoading && (
            <div className="px-2 py-4 text-center text-sm text-gray-500">
              No incidents found
            </div>
          )}

          {/* Clear selection option */}
          {selectedIncidentId && (
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

      {/* Selected incident details */}
      {selectedIncident && (
        <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs text-gray-600">
          <div className="line-clamp-2">{selectedIncident.description}</div>
          <div className="mt-1 text-gray-400">
            Location: {selectedIncident.location}
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentSelector;