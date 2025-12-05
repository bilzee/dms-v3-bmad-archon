'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, RotateCcw, Users, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { apiGet, apiPut } from '@/lib/api'

interface GapField {
  id: string
  fieldName: string
  assessmentType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  displayName: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByUser?: {
    id: string
    name: string
    email: string
  }
  updatedByUser?: {
    id: string
    name: string
    email: string
  }
}

interface GapFieldTableProps {
  assessmentType: string
}

const severityColors = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200'
}

const severityOptions = [
  { value: 'LOW', label: 'Low Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'HIGH', label: 'High Priority' }, 
  { value: 'CRITICAL', label: 'Critical Priority' }
]

export function GapFieldTable({ assessmentType }: GapFieldTableProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [bulkSeverity, setBulkSeverity] = useState<string>('')
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  
  const queryClient = useQueryClient()

  // Fetch gap fields for this assessment type
  const { data: gapFields, isLoading, error } = useQuery({
    queryKey: ['gapFields', assessmentType],
    queryFn: async () => {
      const response = await apiGet(`/api/v1/gap-field-severities?assessmentType=${assessmentType}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch gap fields')
      }
      return response.data as GapField[]
    },
    staleTime: 30 * 1000, // 30 seconds
  })

  // Update gap field severity mutation
  const updateSeverityMutation = useMutation({
    mutationFn: async ({ id, severity }: { id: string, severity: string }) => {
      const response = await apiPut(`/api/v1/gap-field-severities/${id}`, {
        severity
      })
      if (!response.success) {
        throw new Error(response.error || 'Failed to update severity')
      }
      return response.data
    },
    onSuccess: (data, variables) => {
      // Update the query cache immediately
      queryClient.setQueryData(['gapFields', assessmentType], (oldData: GapField[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map(field => 
          field.id === variables.id 
            ? { ...field, severity: variables.severity as any, updatedAt: new Date().toISOString() }
            : field
        )
      })
      
      // Remove from pending changes
      setPendingChanges(prev => {
        const newChanges = { ...prev }
        delete newChanges[variables.id]
        return newChanges
      })
      
      toast({
        title: "Severity Updated",
        description: `Field severity changed to ${variables.severity}`,
        duration: 3000,
      })
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      })
    }
  })

  // Handle severity change
  const handleSeverityChange = useCallback((fieldId: string, newSeverity: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [fieldId]: newSeverity
    }))
  }, [])

  // Save individual change
  const saveChange = useCallback((fieldId: string) => {
    const newSeverity = pendingChanges[fieldId]
    if (newSeverity) {
      updateSeverityMutation.mutate({ id: fieldId, severity: newSeverity })
    }
  }, [pendingChanges, updateSeverityMutation])

  // Save all pending changes
  const saveAllChanges = useCallback(() => {
    Object.entries(pendingChanges).forEach(([fieldId, severity]) => {
      updateSeverityMutation.mutate({ id: fieldId, severity })
    })
  }, [pendingChanges, updateSeverityMutation])

  // Cancel all pending changes
  const cancelAllChanges = useCallback(() => {
    setPendingChanges({})
  }, [])

  // Handle bulk selection
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && gapFields) {
      setSelectedFields(gapFields.map(field => field.id))
    } else {
      setSelectedFields([])
    }
  }, [gapFields])

  const handleSelectField = useCallback((fieldId: string, checked: boolean) => {
    setSelectedFields(prev => 
      checked 
        ? [...prev, fieldId]
        : prev.filter(id => id !== fieldId)
    )
  }, [])

  // Apply bulk severity change
  const applyBulkChange = useCallback(() => {
    if (selectedFields.length === 0 || !bulkSeverity) {
      toast({
        title: "Selection Required",
        description: "Please select fields and choose a severity level",
        variant: "destructive"
      })
      return
    }

    const newChanges = { ...pendingChanges }
    selectedFields.forEach(fieldId => {
      newChanges[fieldId] = bulkSeverity
    })
    setPendingChanges(newChanges)
    
    toast({
      title: "Bulk Changes Applied",
      description: `${selectedFields.length} fields updated. Click Save to confirm.`,
    })
  }, [selectedFields, bulkSeverity, pendingChanges])

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading gap fields...
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center py-12">
          <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
          <span className="text-red-800">Failed to load gap fields: {error.message}</span>
        </CardContent>
      </Card>
    )
  }

  const hasChanges = Object.keys(pendingChanges).length > 0
  const allSelected = gapFields?.length > 0 && selectedFields.length === gapFields.length
  const someSelected = selectedFields.length > 0 && selectedFields.length < (gapFields?.length || 0)

  return (
    <div className="space-y-4">
      {/* Bulk Operations Panel */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bulk Operations</CardTitle>
          <CardDescription className="text-sm">
            Select multiple fields to change their severity levels together
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                ref={(element) => {
                  if (element) element.indeterminate = someSelected
                }}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All ({selectedFields.length} of {gapFields?.length || 0})
              </label>
            </div>
            
            <Select value={bulkSeverity} onValueChange={setBulkSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity level" />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={applyBulkChange}
              disabled={selectedFields.length === 0 || !bulkSeverity}
              size="sm"
            >
              Apply to {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Changes Panel */}
      {hasChanges && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelAllChanges}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveAllChanges}
                  disabled={updateSeverityMutation.isPending}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gap Fields Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">
                    <Checkbox
                      checked={allSelected}
                      ref={(element) => {
                        if (element) element.indeterminate = someSelected
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Field Name</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Current Severity</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">New Severity</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Description</th>
                  <th className="text-left p-4 font-medium text-sm text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gapFields?.map((field, index) => {
                  const isSelected = selectedFields.includes(field.id)
                  const hasPendingChange = pendingChanges[field.id]
                  const currentSeverity = hasPendingChange || field.severity

                  return (
                    <tr 
                      key={field.id} 
                      className={`border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectField(field.id, !!checked)}
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {field.displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {field.fieldName}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={severityColors[field.severity]}>
                          {field.severity}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Select 
                          value={currentSeverity} 
                          onValueChange={(value) => handleSeverityChange(field.id, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {severityOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <Badge className={severityColors[option.value as keyof typeof severityColors]}>
                                  {option.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-sm text-gray-600 truncate" title={field.description}>
                          {field.description || 'No description available'}
                        </div>
                      </td>
                      <td className="p-4">
                        {hasPendingChange && (
                          <Button
                            size="sm"
                            onClick={() => saveChange(field.id)}
                            disabled={updateSeverityMutation.isPending}
                          >
                            {updateSeverityMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {!gapFields?.length && (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No gap fields found for {assessmentType} assessment type</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}