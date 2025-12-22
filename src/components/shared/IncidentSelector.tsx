'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Activity } from 'lucide-react'
import { useActiveIncidents } from '@/hooks/useIncidents'
import { cn } from '@/lib/utils'

interface IncidentSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  label?: string
  description?: string
  placeholder?: string
  className?: string
}

const severityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800', 
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800'
}

const incidentTypeIcons = {
  FLOOD: '🌊',
  DROUGHT: '🌵',
  EARTHQUAKE: '🌍',
  FIRE: '🔥',
  CONFLICT: '⚔️',
  DISEASE_OUTBREAK: '🦠',
  OTHER: '⚠️'
}

export function IncidentSelector({
  value,
  onValueChange,
  disabled = false,
  required = true,
  label = 'Incident',
  description = 'Select the incident this assessment is related to',
  placeholder = 'Select an active incident',
  className
}: IncidentSelectorProps) {
  const { data: incidents, isLoading, error } = useActiveIncidents()

  if (error) {
    return (
      <FormItem className={className}>
        <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4" />
          Failed to load incidents. Please try again.
        </div>
        <FormMessage />
      </FormItem>
    )
  }

  return (
    <FormItem className={className}>
      <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <FormControl>
          <SelectTrigger className={cn(
            "w-full",
            !value && "text-muted-foreground"
          )}>
            <SelectValue placeholder={isLoading ? "Loading incidents..." : placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {incidents?.map((incident) => (
            <SelectItem key={incident.id} value={incident.id}>
              <div className="flex items-center gap-3 py-1">
                <span className="text-lg">
                  {incidentTypeIcons[incident.type as keyof typeof incidentTypeIcons] || incidentTypeIcons.OTHER}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{incident.type}</span>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", severityColors[incident.severity])}
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {incident.location}
                  </div>
                  {incident.description && (
                    <div className="text-xs text-muted-foreground max-w-md truncate">
                      {incident.description}
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
          {incidents?.length === 0 && (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              No active incidents found
            </div>
          )}
        </SelectContent>
      </Select>
      {description && (
        <FormDescription>
          {description}
        </FormDescription>
      )}
      <FormMessage />
    </FormItem>
  )
}