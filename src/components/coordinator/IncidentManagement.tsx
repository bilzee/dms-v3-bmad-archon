'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table'
import { IncidentCreationForm } from '@/components/forms/incident/IncidentCreationForm'
import { 
  AlertTriangle, 
  MapPin, 
  Users, 
  Home, 
  Activity,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  FileText,
  ChevronDown,
  ChevronRight,
  Link
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Incident, PopulationImpact } from '@/types/incident'

interface IncidentManagementProps {
  className?: string
  initialFilters?: IncidentFilters
  showCreateButton?: boolean
  enableRealTimeUpdates?: boolean
  selectedIncidentId?: string
  onIncidentSelect?: (incident: any) => void
  onIncidentUpdate?: (incident: any) => void
}

interface IncidentFilters {
  status?: string[]
  severity?: string[]
  type?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  location?: string
  hasAssessments?: boolean
}

interface IncidentManagementState {
  incidents: any[]
  loading: boolean
  error: string | null
  filters: IncidentFilters
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  selectedIncident: any | null
  showCreateModal: boolean
  showEditModal: boolean
  isUpdating: boolean
  expandedRows: Set<string>
}

const severityColors = {
  'LOW': 'bg-green-100 text-green-800',
  'MEDIUM': 'bg-yellow-100 text-yellow-800',
  'HIGH': 'bg-orange-100 text-orange-800',
  'CRITICAL': 'bg-red-100 text-red-800'
}

const statusColors = {
  'ACTIVE': 'bg-red-100 text-red-800',
  'CONTAINED': 'bg-yellow-100 text-yellow-800',
  'RESOLVED': 'bg-green-100 text-green-800'
}

export function IncidentManagement({
  className,
  initialFilters = {},
  showCreateButton = true,
  enableRealTimeUpdates = true,
  selectedIncidentId,
  onIncidentSelect,
  onIncidentUpdate
}: IncidentManagementProps) {
  const { user, token } = useAuth()
  const router = useRouter()

  // Use TanStack Query for incidents
  const {
    data: incidentsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['incidents', initialFilters],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (initialFilters.page) params.set('page', initialFilters.page.toString())
      if (initialFilters.limit) params.set('limit', initialFilters.limit.toString())
      if (initialFilters.status?.length) params.set('status', initialFilters.status[0])
      if (initialFilters.severity?.length) params.set('severity', initialFilters.severity[0])
      if (initialFilters.type?.length) params.set('type', initialFilters.type[0])
      if (initialFilters.location) params.set('location', initialFilters.location)
      
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/v1/incidents?${params.toString()}`, {
        headers
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch incidents')
      }
      
      const result = await response.json()
      return {
        incidents: result.data,
        pagination: result.pagination
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: enableRealTimeUpdates ? 30000 : false // 30 second real-time updates
  })

  const incidents = incidentsResponse?.incidents || []
  const pagination = incidentsResponse?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  }

  // Use TanStack Query for incident types
  const { data: incidentTypes = [] } = useQuery({
    queryKey: ['incident-types'],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {}
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
        
        const response = await fetch('/api/v1/incidents/types', {
          headers
        })
        if (!response.ok) {
          throw new Error('Failed to fetch incident types')
        }
        const result = await response.json()
        return result.data
      } catch (error) {
        // Fallback to default types on error
        return [
          'Flood',
          'Fire', 
          'Earthquake',
          'Landslide',
          'Drought',
          'Storm',
          'Epidemic',
          'Conflict',
          'Industrial Accident',
          'Other'
        ]
      }
    },
    staleTime: 60000 // 1 minute
  })

  // Use mutation for status updates
  const statusMutation = useMutation({
    mutationFn: async ({ incidentId, newStatus }: { incidentId: string; newStatus: string }) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/v1/incidents/${incidentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Status update failed:', response.status, errorText)
        throw new Error(`Failed to update incident status: ${response.status}`)
      }
      
      const result = await response.json()
      return result.data
    },
    onSuccess: (updatedIncident) => {
      refetch()
      onIncidentUpdate?.(updatedIncident)
    }
  })

  const [state, setState] = useState<IncidentManagementState>({
    incidents: [],
    loading: false,
    error: null,
    filters: initialFilters,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    },
    selectedIncident: null,
    showCreateModal: false,
    showEditModal: false,
    isUpdating: false,
    expandedRows: new Set<string>()
  })

  // Real-time updates interval is handled by TanStack Query refetchInterval

  // Filter handlers
  const updateFilters = (newFilters: Partial<IncidentFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, page: 1 }
    }))
  }

  const handleIncidentSelect = (incident: any) => {
    setState(prev => ({ ...prev, selectedIncident: incident }))
    onIncidentSelect?.(incident)
    // Navigate to incident detail page where Story 8.2 components are integrated
    router.push(`/coordinator/incidents/${incident.id}`)
  }

  const handleStatusChange = async (incidentId: string, newStatus: string) => {
    statusMutation.mutate({ incidentId, newStatus })
  }

  const toggleRowExpansion = (incidentId: string) => {
    setState(prev => {
      const newExpandedRows = new Set(prev.expandedRows)
      if (newExpandedRows.has(incidentId)) {
        newExpandedRows.delete(incidentId)
      } else {
        newExpandedRows.add(incidentId)
      }
      return { ...prev, expandedRows: newExpandedRows }
    })
  }

  const handleIncidentCreated = async (incidentData?: any) => {
    setState(prev => ({ ...prev, showCreateModal: false }))
    refetch() // Refresh incidents list
  }

  const formatPopulationImpact = (impact: PopulationImpact) => {
    return {
      totalPopulation: impact.totalPopulation || 0,
      livesLost: impact.livesLost || 0,
      injured: impact.injured || 0,
      affectedEntities: impact.affectedEntities || 0
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    if (!state.filters) return true
    
    if (state.filters.status && !state.filters.status.includes(incident.status)) {
      return false
    }
    
    if (state.filters.severity && !state.filters.severity.includes(incident.severity)) {
      return false
    }
    
    if (state.filters.type && !state.filters.type.includes(incident.type)) {
      return false
    }
    
    if (state.filters.location && !incident.location.toLowerCase().includes(state.filters.location.toLowerCase())) {
      return false
    }
    
    return true
  })

  if (state.loading && !state.incidents.length) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading incidents...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Incident Management</h2>
          <p className="text-gray-600">
            Manage and monitor disaster incidents
            {enableRealTimeUpdates && " • Real-time updates enabled"}
          </p>
        </div>
        
        {showCreateButton && (
          <Dialog open={state.showCreateModal} onOpenChange={(open) => 
            setState(prev => ({ ...prev, showCreateModal: open }))
          }>
            <DialogTrigger asChild>
              <Button 
                size="lg"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                <Plus className="h-4 w-4" />
                New Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border border-gray-200 backdrop-blur-sm"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>
                  Create a new incident record for disaster response coordination
                </DialogDescription>
              </DialogHeader>
              <IncidentCreationForm
                onSubmit={handleIncidentCreated}
                onCancel={() => setState(prev => ({ ...prev, showCreateModal: false }))}
                autoSave={true}
                gpsEnabled={true}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : String(error)}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search Location</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by location..."
                  value={state.filters.location || ''}
                  onChange={(e) => updateFilters({ location: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={state.filters.status?.[0] || 'all'} 
                onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="CONTAINED">Contained</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select 
                value={state.filters.severity?.[0] || 'all'} 
                onValueChange={(value) => updateFilters({ severity: value === 'all' ? undefined : [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={state.filters.type?.[0] || 'all'} 
                onValueChange={(value) => updateFilters({ type: value === 'all' ? undefined : [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {incidentTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Incidents ({filteredIncidents.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No incidents found
              </h3>
              <p className="text-gray-500">
                {state.filters.location || state.filters.status || state.filters.severity || state.filters.type
                  ? "Try adjusting your filters or create a new incident."
                  : "Create your first incident to get started."
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Population Impact</TableHead>
                  <TableHead>Linked Assessments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => {
                  const impact = formatPopulationImpact(incident.populationImpact || {})
                  
                  return (
                    <React.Fragment key={incident.id}>
                    <TableRow 
                      className={`hover:bg-gray-50 ${
                        selectedIncidentId === incident.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{incident.type}</div>
                          {incident.subType && (
                            <div className="text-sm text-gray-500">{incident.subType}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {incident.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[incident.severity]}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[incident.status]}>
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span>Population: {impact.totalPopulation}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Lives Lost: {impact.livesLost}</span>
                            <span>Injured: {impact.injured}</span>
                            <span>Entities: {impact.affectedEntities}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {/* Preliminary Assessments */}
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium">
                              Prelim: {incident.preliminaryAssessments?.length || 0}
                            </span>
                            {(incident.preliminaryAssessments?.length || 0) > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Linked
                              </Badge>
                            )}
                          </div>
                          {/* Rapid Assessments */}
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-green-600" />
                            <span className="text-xs">
                              Rapid: {incident.rapidAssessments?.length || 0}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(incident.createdAt).toLocaleDateString()}
                          <div className="text-xs text-gray-500">
                            {new Date(incident.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/coordinator/incidents/${incident.id}`)}
                            className="text-xs"
                          >
                            View Details
                          </Button>
                          {/* Expand/Collapse Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRowExpansion(incident.id)
                            }}
                          >
                            {state.expandedRows.has(incident.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                          
                          {/* Status Change Actions */}
                          <Select
                            value={incident.status}
                            onValueChange={(value) => handleStatusChange(incident.id, value)}
                            disabled={state.isUpdating}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="CONTAINED">Contained</SelectItem>
                              <SelectItem value="RESOLVED">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row Content */}
                    {state.expandedRows.has(incident.id) && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-4 py-3 bg-gray-50 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Preliminary Assessments */}
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  Preliminary Assessments ({incident.preliminaryAssessments?.length || 0})
                                </h4>
                                {(incident.preliminaryAssessments?.length || 0) > 0 ? (
                                  <div className="space-y-1 text-xs">
                                    {incident.preliminaryAssessments?.map((assessment: any, idx: number) => (
                                      <div key={idx} className="flex justify-between p-2 bg-white rounded border">
                                        <span>{assessment.reportingLGA}, {assessment.reportingWard}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {assessment.reportingDate ? new Date(assessment.reportingDate).toLocaleDateString() : 'N/A'}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                                    <span className="text-xs text-gray-500">No preliminary assessments linked</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => {
                                        // TODO: Implement link assessment functionality
                                        console.log('Link assessment for incident:', incident.id)
                                      }}
                                    >
                                      <Link className="h-3 w-3 mr-1" />
                                      Link Assessment
                                    </Button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Additional Details */}
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Additional Details</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span>Description:</span>
                                    <span className="text-right max-w-48 truncate">{incident.description}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Sub Type:</span>
                                    <span>{incident.subType || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Created By:</span>
                                    <span>{incident.createdBy}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Rapid Assessments:</span>
                                    <span>{incident.rapidAssessments?.length || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Commitments:</span>
                                    <span>{incident.commitments?.length || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}