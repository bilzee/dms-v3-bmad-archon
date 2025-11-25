'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface GapIndicatorProps {
  hasGap: boolean;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  field?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Severity configuration
const severityConfig = {
  CRITICAL: {
    color: 'bg-red-600 border-2 border-red-300',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    label: 'Critical Gap',
    description: 'Immediate attention required'
  },
  HIGH: {
    color: 'bg-orange-600 border-2 border-orange-300',
    textColor: 'text-orange-800',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    label: 'High Priority Gap',
    description: 'Urgent attention needed'
  },
  MEDIUM: {
    color: 'bg-yellow-600 border-2 border-yellow-300',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    label: 'Medium Gap',
    description: 'Attention needed'
  },
  LOW: {
    color: 'bg-blue-600 border-2 border-blue-300',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    label: 'Low Gap',
    description: 'Monitor and address'
  }
} as const;

// Size configuration
const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    badge: 'text-xs px-1.5 py-0.5',
    text: 'text-xs'
  },
  md: {
    dot: 'w-3 h-3',
    badge: 'text-sm px-2 py-1',
    text: 'text-sm'
  },
  lg: {
    dot: 'w-4 h-4',
    badge: 'text-base px-3 py-1.5',
    text: 'text-base'
  }
} as const;

/**
 * GapIndicator Component
 * 
 * Visual indicator for assessment gaps with color-coded severity levels
 * - Red for critical gaps
 * - Orange for high priority gaps  
 * - Yellow for medium gaps
 * - Green for no gaps
 * - Blue for low priority gaps
 */
export function GapIndicator({
  hasGap,
  severity = 'LOW',
  field,
  size = 'md',
  showLabel = false,
  className
}: GapIndicatorProps) {
  const sizeClasses = sizeConfig[size];
  
  if (!hasGap) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-full bg-green-600 border-2 border-green-300",
          sizeClasses.dot
        )} />
        {showLabel && (
          <span className={cn("text-green-800 font-bold", sizeClasses.text)}>
            No Gap
          </span>
        )}
      </div>
    );
  }

  const config = severityConfig[severity];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "rounded-full",
        config.color,
        sizeClasses.dot
      )} />
      
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("font-medium", config.textColor, sizeClasses.text)}>
            {config.label}
          </span>
          {field && (
            <span className={cn("text-xs text-gray-500")}>
              {field}
            </span>
          )}
        </div>
      )}
      
      {!showLabel && severity !== 'LOW' && (
        <Badge 
          variant="outline" 
          className={cn(
            sizeClasses.badge,
            config.textColor,
            config.borderColor,
            config.bgColor
          )}
        >
          {severity}
        </Badge>
      )}
    </div>
  );
}

export default GapIndicator;