'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  Timer
} from 'lucide-react';

// Types for incident summary
interface IncidentSummaryProps {
  incident: {
    id: string;
    type: string;
    subType: string;
    status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
    updatedAt: string;
    location: string;
    description?: string;
  };
  realTime?: boolean;
  className?: string;
}

interface DurationInfo {
  totalDuration: string;
  inCurrentStatus: string;
  totalDays: number;
  totalHours: number;
  inStatusHours: number;
}

// Status configuration
const statusConfig = {
  ACTIVE: {
    label: 'Active',
    variant: 'destructive' as const,
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-50 border-red-200'
  },
  CONTAINED: {
    label: 'Contained', 
    variant: 'secondary' as const,
    icon: PauseCircle,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  },
  RESOLVED: {
    label: 'Resolved',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50 border-green-200'
  }
};

// Severity configuration
const severityConfig = {
  CRITICAL: { label: 'Critical', color: 'text-red-700 bg-red-100' },
  HIGH: { label: 'High', color: 'text-orange-700 bg-orange-100' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-700 bg-yellow-100' },
  LOW: { label: 'Low', color: 'text-blue-700 bg-blue-100' }
};

/**
 * Format duration into human-readable string
 */
const formatDuration = (hours: number): string => {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
  }
  return `${hours}h`;
};

/**
 * Calculate duration information
 */
const calculateDurationInfo = (createdAt: string, updatedAt: string): DurationInfo => {
  const now = new Date();
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  
  const totalHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  const inStatusHours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));
  const totalDays = Math.floor(totalHours / 24);
  
  return {
    totalDuration: formatDuration(totalHours),
    inCurrentStatus: formatDuration(inStatusHours),
    totalDays,
    totalHours,
    inStatusHours: inStatusHours
  };
};

/**
 * IncidentSummary Component
 * 
 * Displays comprehensive incident summary information including:
 * - Declaration date and time
 * - Current status with visual indicators  
 * - Duration calculations (total and in current status)
 * - Real-time duration updates
 * - Severity indicators
 */
export function IncidentSummary({ 
  incident, 
  realTime = false, 
  className 
}: IncidentSummaryProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [durationInfo, setDurationInfo] = useState<DurationInfo>(
    calculateDurationInfo(incident.createdAt, incident.updatedAt)
  );

  // Update duration in real-time
  useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setDurationInfo(calculateDurationInfo(incident.createdAt, incident.updatedAt));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [realTime, incident.createdAt, incident.updatedAt]);

  const statusInfo = statusConfig[incident.status];
  const severityInfo = severityConfig[incident.severity];
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Incident Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Incident Type and Severity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-lg">{incident.type}</span>
            {incident.subType && (
              <span className="text-gray-500 text-sm">- {incident.subType}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={statusInfo.variant}
              className={cn("gap-1", statusInfo.color)}
            >
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
            
            <Badge 
              variant="outline"
              className={cn("gap-1", severityInfo.color)}
            >
              {severityInfo.label}
            </Badge>
          </div>
        </div>

        {/* Declaration Date */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Declared:</span>
          </div>
          <div className="ml-6">
            <div className="font-medium">
              {new Date(incident.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(incident.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>

        {/* Duration Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Duration:</span>
            {realTime && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Timer className="h-3 w-3" />
                <span>Live</span>
              </div>
            )}
          </div>
          
          <div className="ml-6 space-y-2">
            {/* Total Duration */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="font-medium text-sm">
                {durationInfo.totalDuration}
              </span>
            </div>
            
            {/* Time in Current Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                As {statusInfo.label}:
              </span>
              <span className="font-medium text-sm">
                {durationInfo.inCurrentStatus}
              </span>
            </div>
            
            {/* Progress indicator for duration */}
            {durationInfo.totalDays > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">Duration Progress</span>
                  <span className="text-xs text-gray-400">({durationInfo.totalDays} days)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      incident.status === 'ACTIVE' ? 'bg-red-500' :
                      incident.status === 'CONTAINED' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ 
                      width: `${Math.min(100, (durationInfo.totalDays / 30) * 100)}%` 
                    }}
                  />
                </div>
                {durationInfo.totalDays > 30 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Long-term incident ({Math.floor(durationInfo.totalDays / 7)} weeks)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1">
          <div className="text-sm text-gray-600">Location:</div>
          <div className="ml-6 text-sm font-medium">
            {incident.location}
          </div>
        </div>

        {/* Description (if available) */}
        {incident.description && (
          <div className="space-y-1">
            <div className="text-sm text-gray-600">Description:</div>
            <div className="ml-6 text-sm text-gray-700 line-clamp-3">
              {incident.description}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Last updated:</span>
            <span>{new Date(incident.updatedAt).toLocaleString()}</span>
          </div>
          {realTime && (
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>Current time:</span>
              <span>{currentTime.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default IncidentSummary;