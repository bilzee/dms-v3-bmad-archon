'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Icons
import { Plus, Trash2, Package, AlertTriangle, Save, X, Wifi, WifiOff, Cloud, CloudOff, FileText, Download } from 'lucide-react'

// Shared components
import { EntitySelector } from '@/components/shared/EntitySelector'
import { AssessmentSelector } from '@/components/response/AssessmentSelector'
import { CollaborationStatus } from '@/components/response/CollaborationStatus'
import { DonorCommitmentImportForm } from './DonorCommitmentImportForm'

// Hooks
import { useCollaboration } from '@/hooks/useCollaboration'
import { useOffline } from '@/hooks/useOffline'
import { useSync } from '@/hooks/useSync'

// Services and types
import { responseOfflineService } from '@/lib/services/response-offline.service'
import { ResponseService } from '@/lib/services/response.service'
import { CreatePlannedResponseInput, CreateDeliveredResponseInput, ResponseItem } from '@/lib/validation/response'
import { useAuthStore } from '@/stores/auth.store'

const ResponseItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().optional()
})

const ResponsePlanningFormSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  entityId: z.string().min(1, 'Entity ID is required'),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  description: z.string().optional(),
  items: z.array(ResponseItemSchema).min(1, 'At least one item is required'),
  timeline: z.record(z.any()).optional()
})

type FormData = z.infer<typeof ResponsePlanningFormSchema>

interface ResponsePlanningFormProps {
  initialData?: FormData & { id?: string, assessment?: any }
  mode?: 'create' | 'edit'
  onSuccess?: (response: any) => void
  onCancel?: () => void
  entityId?: string
  assessmentId?: string
}

export function ResponsePlanningForm({ 
  initialData, 
  mode = 'create',
  onSuccess,
  onCancel,
  entityId: preselectedEntityId,
  assessmentId: preselectedAssessmentId
}: ResponsePlanningFormProps) {
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDirty, setIsDirty] = useState(false)
  const [editingResponseId, setEditingResponseId] = useState<string | null>(
    mode === 'edit' && initialData?.id ? initialData.id : null
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'manual' | 'commitment'>('manual')
  const [commitmentImportData, setCommitmentImportData] = useState<any>(null)

  // Collaboration hook - Only for create mode
  const collaboration = useCollaboration(mode === 'create' ? editingResponseId : null)

  // Offline hook
  const {
    isOnline,
    isSyncing,
    syncProgress,
    isWorkingOffline,
    queueOperation,
    getOfflineResponse
  } = useOffline()

  // Sync hook
  const { triggerSync, isSyncing: syncInProgress } = useSync({
    autoInitialize: true,
    enableAutoSync: true,
    syncInterval: 1, // 1 minute for more responsive sync
    enableNotifications: true
  })

  const form = useForm<FormData>({
    resolver: zodResolver(ResponsePlanningFormSchema),
    defaultValues: initialData || {
      type: 'HEALTH' as const,
      priority: 'MEDIUM' as const,
      items: [{ name: '', unit: '', quantity: 1 }],
      assessmentId: preselectedAssessmentId || '',
      entityId: preselectedEntityId || ''
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  // Get assigned entities for the current user
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: ['entities', 'assigned', (user as any)?.id],
    queryFn: async () => {
      if (!user || !token) throw new Error('User not authenticated')
      
      const response = await fetch(`/api/v1/entities/assigned?userId=${(user as any).id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch assigned entities')
      }
      
      const result = await response.json()
      return result.data || []
    },
    enabled: !!user && !!token
  })

  // Get available assessments for selected entity
  const selectedEntityId = form.watch('entityId')
  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ['assessments', 'verified', selectedEntityId],
    queryFn: async () => {
      if (!selectedEntityId || !token) return []
      
      const response = await fetch(`/api/v1/assessments/verified?entityId=${selectedEntityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch verified assessments')
      }
      
      const result = await response.json()
      return result.data || []
    },
    enabled: !!selectedEntityId && !!token
  })

  // Use assessment data from initialData for edit mode
  const editAssessment = mode === 'edit' ? initialData?.assessment : null

  // Handle commitment import success
  const handleCommitmentImportSuccess = (response: any) => {
    // Populate form with commitment data
    if (response && response.items) {
      form.setValue('items', response.items.map((item: any) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        notes: `Imported from ${response.donor?.name || 'donor'} commitment`
      })))
      
      // Set type to LOGISTICS for commitment-based responses
      form.setValue('type', 'LOGISTICS')
      
      // Set priority based on selected assessment first, then fall back to incident severity
      const selectedAssessmentId = form.getValues('assessmentId')
      const selectedAssessment = assessments.find((a: any) => a.id === selectedAssessmentId)
      
      if (selectedAssessment && selectedAssessment.priority) {
        // Priority from selected assessment takes precedence
        form.setValue('priority', selectedAssessment.priority)
      } else if (response.commitment?.incident?.severity) {
        // Fall back to incident severity if no assessment selected
        form.setValue('priority', response.commitment.incident.severity)
      }
      
      // Add description about the commitment import
      form.setValue('description', `Imported from commitment by ${response.donor?.name || 'donor'}`)
      
      // Switch back to manual mode to show the populated form
      setInputMode('manual')
      setCommitmentImportData(response)
      
      // Mark form as dirty to show that changes have been made
      setIsDirty(true)
    }
    
    onSuccess?.(response)
  }

  // Create planned response mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePlannedResponseInput) => {
      if (!user) throw new Error('User not authenticated')
      
      // Add user ID to data
      const dataWithUser = { ...data, responderId: (user as any).id }
      
      // Add commitment data if available
      if (commitmentImportData) {
        dataWithUser.commitmentId = commitmentImportData.commitmentId
        dataWithUser.donorId = commitmentImportData.donorId
      }
      
      return await responseOfflineService.createPlannedResponse(dataWithUser)
    },
    onSuccess: (response) => {
      setSubmitError(null) // Clear any previous errors
      queryClient.invalidateQueries({ queryKey: ['responses', 'planned', (user as any)?.id] })
      setIsDirty(false)
      form.reset()
      setCommitmentImportData(null)
      
      // Show different success message based on sync status
      if (response.syncStatus === 'pending') {
        console.log('✅ Response plan saved locally. Will sync when you reconnect.')
        
        // If online, trigger immediate sync to submit pending responses
        if (isOnline && !syncInProgress) {
          triggerSync().catch(error => {
            console.error('Failed to trigger immediate sync:', error)
          })
        }
      } else if (response.meta?.fromCache) {
        console.log('✅ Response plan loaded from offline cache.')
      } else {
        console.log('✅ Response plan saved successfully.')
      }
      
      onSuccess?.(response)
    },
    onError: (error: Error) => {
      console.error('Create planned response error:', error)
      
      // Set user-friendly error message
      if (error.message.includes('already exists for this assessment')) {
        setSubmitError('A response plan already exists for this assessment. You can edit the existing plan instead.')
      } else if (error.message.includes('not assigned')) {
        setSubmitError('You are not assigned to this entity. Please contact your coordinator.')
      } else if (error.message.includes('not found')) {
        setSubmitError('The selected assessment or entity was not found. Please refresh and try again.')
      } else if (error.message.includes('not authenticated')) {
        setSubmitError('Your session has expired. Please log in again.')
      } else {
        setSubmitError('Failed to create response plan. Please try again or contact support if the problem persists.')
      }
    }
  })

  // Create delivered response mutation
  const createDeliveredMutation = useMutation({
    mutationFn: async (data: CreateDeliveredResponseInput) => {
      if (!user) throw new Error('User not authenticated')
      
      // Add user ID to data
      const dataWithUser = { ...data, responderId: (user as any).id }
      
      // Add commitment data if available
      if (commitmentImportData) {
        dataWithUser.commitmentId = commitmentImportData.commitmentId
        dataWithUser.donorId = commitmentImportData.donorId
      }
      
      return await ResponseService.createDeliveredResponse(dataWithUser, (user as any).id)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['responses'] })
      queryClient.invalidateQueries({ queryKey: ['responses', 'delivered', (user as any)?.id] })
      setSubmitError(null)
      setIsDirty(false)
      
      // Stop collaboration on successful creation
      if (collaboration.isCurrentUserCollaborating) {
        collaboration.stopCollaboration()
      }
      
      onSuccess?.(response)
    },
    onError: (error: any) => {
      console.error('Error creating delivered response:', error)
      setSubmitError('Failed to create delivered response. Please try again or contact support if the problem persists.')
    }
  })

  // Update planned response mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<CreatePlannedResponseInput> }) => {
      if (!user) throw new Error('User not authenticated')
      
      return await responseOfflineService.updatePlannedResponse(id, data)
    },
    onSuccess: (response) => {
      setSubmitError(null) // Clear any previous errors
      queryClient.invalidateQueries({ queryKey: ['responses', 'planned', (user as any)?.id] })
      setIsDirty(false)
      // Stop editing after successful update (only in create mode)
      if (mode === 'create' && collaboration.isCurrentUserCollaborating) {
        collaboration.actions.stopEditing()
      }
      
      // Show different success message based on sync status
      if (response.syncStatus === 'pending') {
        console.log('✅ Response plan updated locally. Will sync when you reconnect.')
        
        // If online, trigger immediate sync to submit pending responses
        if (isOnline && !syncInProgress) {
          triggerSync().catch(error => {
            console.error('Failed to trigger immediate sync:', error)
          })
        }
      } else if (response.meta?.fromCache) {
        console.log('✅ Response plan loaded from offline cache.')
      } else {
        console.log('✅ Response plan updated successfully.')
      }
      
      onSuccess?.(response)
    },
    onError: (error: Error) => {
      console.error('Update planned response error:', error)
      
      // Set user-friendly error message
      if (error.message.includes('not found')) {
        setSubmitError('The response plan was not found. It may have been deleted.')
      } else if (error.message.includes('not assigned')) {
        setSubmitError('You are not assigned to this entity. Please contact your coordinator.')
      } else if (error.message.includes('not authenticated')) {
        setSubmitError('Your session has expired. Please log in again.')
      } else {
        setSubmitError('Failed to update response plan. Please try again or contact support if the problem persists.')
      }
    }
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      // Collaboration checks only apply to create mode
      if (mode === 'create' && collaboration.isActive && !collaboration.canEdit) {
        throw new Error('Another responder is currently editing this response. Please wait for them to finish.')
      }

      // Start editing if collaborating (only in create mode)
      if (mode === 'create' && collaboration.isCurrentUserCollaborating) {
        collaboration.actions.startEditing()
      }
      
      // Auto-assign category based on response type
      const dataWithCategory = {
        ...data,
        items: data.items.map(item => ({
          ...item,
          category: data.type // Auto-assign category from response type
        }))
      }

      if (mode === 'create') {
        createMutation.mutate(dataWithCategory)
      } else if (mode === 'edit') {
        if (!editingResponseId) {
          throw new Error('Response ID is required for editing')
        }
        updateMutation.mutate({ id: editingResponseId, data: dataWithCategory })
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  })

  // Handle creating delivered response directly
  const handleCreateDelivery = form.handleSubmit(async (data) => {
    try {
      // Collaboration checks only apply to create mode
      if (mode === 'create' && collaboration.isActive && !collaboration.canEdit) {
        throw new Error('Another responder is currently editing this response. Please wait for them to finish.')
      }

      // Start editing if collaborating (only in create mode)
      if (mode === 'create' && collaboration.isCurrentUserCollaborating) {
        collaboration.actions.startEditing()
      }
      
      // Auto-assign category based on response type
      const dataWithCategory = {
        ...data,
        items: data.items.map(item => ({
          ...item,
          category: data.type // Auto-assign category from response type
        }))
      }

      // Create delivered response directly
      createDeliveredMutation.mutate(dataWithCategory)
    } catch (error) {
      console.error('Delivery creation error:', error)
    }
  })

  const handleCancel = () => {
    if (isDirty && window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      form.reset()
      setIsDirty(false)
      setCommitmentImportData(null)
      setInputMode('manual')
      onCancel?.()
    } else if (!isDirty) {
      form.reset()
      setCommitmentImportData(null)
      setInputMode('manual')
      onCancel?.()
    }
  }

  const addItem = () => {
    append({ name: '', unit: '', quantity: 1 })
  }

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  // Watch form dirty state
  useEffect(() => {
    setIsDirty(form.formState.isDirty || !!commitmentImportData)
  }, [form.formState.isDirty, commitmentImportData])

  // Cleanup collaboration on unmount (only in create mode)
  useEffect(() => {
    return () => {
      if (mode === 'create' && collaboration.isCurrentUserCollaborating) {
        collaboration.actions.leaveCollaboration()
      }
    }
  }, [mode, collaboration.isCurrentUserCollaborating, collaboration.actions])

  const isLoading = createMutation.isPending || createDeliveredMutation.isPending || updateMutation.isPending || entitiesLoading || assessmentsLoading

  if (mode === 'create' && entitiesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Assigned Entities...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {mode === 'create' ? 'Create Response Plan' : 'Edit Response Plan'}
            <Badge variant="outline">
              {mode === 'create' ? 'PLANNING' : 'EDITING'}
            </Badge>
            {commitmentImportData && (
              <Badge variant="secondary" className="text-blue-700 border-blue-300">
                <Download className="h-3 w-3 mr-1" />
                From Commitment
              </Badge>
            )}
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="outline" className="text-green-700 border-green-300">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-700 border-orange-300">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            
            {isWorkingOffline() && (
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                <CloudOff className="h-3 w-3 mr-1" />
                Will Sync Later
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? 'Plan response resources for a verified assessment. Choose between manual planning or importing from donor commitments.'
            : 'Edit the planned response. Only responses in PLANNED status can be modified.'
          }
          {!isOnline && (
            <div className="mt-2 text-orange-600 text-sm">
              You are currently offline. Your response plan will be saved locally and synced when you reconnect.
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Collaboration Status - Only show for create mode or when actively collaborating */}
        {mode === 'create' && collaboration.isActive && (
          <div className="mb-6">
            <CollaborationStatus
              collaboration={collaboration}
              currentUserId={(user as any)?.id}
              onJoin={collaboration.actions.joinCollaboration}
              onLeave={collaboration.actions.leaveCollaboration}
              onStartEditing={collaboration.actions.startEditing}
              onStopEditing={collaboration.actions.stopEditing}
            />
          </div>
        )}

        {/* Commitment Import Data Display */}
        {commitmentImportData && (
          <Alert className="mb-6">
            <Download className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <strong>Imported from Commitment:</strong>
                <div className="text-sm">
                  <div>Donor: {commitmentImportData.donor?.name}</div>
                  <div>Entity: {commitmentImportData.entity?.name}</div>
                  <div>Items: {commitmentImportData.items?.length} items imported</div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Mode Selection for Create Mode */}
        {mode === 'create' && (
          <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as 'manual' | 'commitment')} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Planning</TabsTrigger>
              <TabsTrigger value="commitment">Import from Commitment</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-6">
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Entity Selection - Only in create mode */}
                  <FormField
                    control={form.control}
                    name="entityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity *</FormLabel>
                        <FormControl>
                          <EntitySelector
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value)
                              form.setValue('assessmentId', '')
                            }}
                            disabled={mode !== 'create'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

  
                  {/* Assessment Selection */}
                  {mode === 'create' ? (
                    <AssessmentSelector
                      entityId={form.watch('entityId')}
                      value={form.watch('assessmentId')}
                      onValueChange={(assessmentId, assessment) => {
                        form.setValue('assessmentId', assessmentId)
                        // Auto-match response type to assessment type
                        if (assessment && assessment.rapidAssessmentType) {
                          form.setValue('type', assessment.rapidAssessmentType)
                        }
                        // Set response plan priority to match assessment priority
                        if (assessment && assessment.priority) {
                          form.setValue('priority', assessment.priority)
                        }
                        // Note: Don't override entityId as it's already selected by the user
                        // The assessment should be for the same entity that was selected
                      }}
                      disabled={mode !== 'create'}
                      showConflictWarning={true}
                      selectedAssessment={assessments.find((a: any) => a.id === form.watch('assessmentId'))}
                    />
                  ) : null}

                  {/* Response Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => {
                        const currentType = form.watch('type')
                        return (
                          <FormItem>
                            <FormLabel>Response Type *</FormLabel>
                            <FormControl>
                              <Select value={currentType || field.value} onValueChange={field.onChange} disabled={true}>
                                <SelectTrigger className="bg-gray-50">
                                  <SelectValue placeholder="Auto-populated from assessment..." />
                                </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HEALTH">Health</SelectItem>
                                <SelectItem value="WASH">WASH</SelectItem>
                                <SelectItem value="SHELTER">Shelter</SelectItem>
                                <SelectItem value="FOOD">Food</SelectItem>
                                <SelectItem value="SECURITY">Security</SelectItem>
                                <SelectItem value="POPULATION">Population</SelectItem>
                                <SelectItem value="LOGISTICS">Logistics</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Auto-populated from selected assessment type
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => {
                        const currentPriority = form.watch('priority')
                        return (
                          <FormItem>
                            <FormLabel>Priority *</FormLabel>
                            <FormControl>
                              <Select value={currentPriority || field.value} onValueChange={field.onChange} disabled={true}>
                                <SelectTrigger className="bg-gray-50">
                                  <SelectValue placeholder="Auto-populated from assessment..." />
                                </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CRITICAL">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    Critical
                                  </span>
                                </SelectItem>
                                <SelectItem value="HIGH">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    High
                                  </span>
                                </SelectItem>
                                <SelectItem value="MEDIUM">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    Medium
                                  </span>
                                </SelectItem>
                                <SelectItem value="LOW">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    Low
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Auto-populated from selected assessment priority
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                        )
                      }}
                    />
                  </div>

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional details about this response plan..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Items Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <FormLabel className="text-base font-medium">Resources *</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-3 p-4 border rounded-lg">
                          <div className="flex-1 space-y-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Item Name *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Clean water bottles" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Quantity *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="0" 
                                        min="1"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`items.${index}.unit`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Unit *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., units, liters" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name={`items.${index}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Notes (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Additional details..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={fields.length <= 1}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    {mode === 'create' ? (
                      <>
                        <Button
                          type="submit"
                          disabled={isLoading || !form.formState.isValid}
                          className="flex-1"
                        >
                          {isLoading ? 'Saving...' : 'Create Plan'}
                        </Button>
                        
                        <Button
                          type="button"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isLoading || !form.formState.isValid}
                          onClick={handleCreateDelivery}
                        >
                          {createDeliveredMutation.isPending ? 'Creating...' : 'Create Delivery Directly'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isLoading || !form.formState.isValid}
                        className="flex-1"
                      >
                        {isLoading ? 'Saving...' : 'Update Plan'}
                      </Button>
                    )}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>

                  {submitError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="commitment" className="space-y-6">
              <DonorCommitmentImportForm
                onSuccess={handleCommitmentImportSuccess}
                onCancel={handleCancel}
                entityId={form.watch('entityId')}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Edit Mode - Show the existing form */}
        {mode === 'edit' && (
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Entity Display - Read-only in edit mode */}
              {initialData?.entityId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entity</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-md">
                    <span className="text-sm">
                      {entities.find((e: any) => e.id === initialData.entityId)?.name || 'Loading...'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entities.find((e: any) => e.id === initialData.entityId)?.type || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Assessment Display - Read-only in edit mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Assessment</label>
                <div className="p-3 bg-gray-50 border rounded-md">
                  {editAssessment ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{editAssessment.rapidAssessmentType}</span>
                        <Badge variant="outline" className="text-xs">
                          {editAssessment.verificationStatus}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Date: {new Date(editAssessment.rapidAssessmentDate).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Loading assessment details...</span>
                  )}
                </div>
              </div>

              {/* Response Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Type *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} disabled={true}>
                          <SelectTrigger className="bg-gray-50">
                            <SelectValue placeholder="Auto-populated from assessment..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HEALTH">Health</SelectItem>
                            <SelectItem value="WASH">WASH</SelectItem>
                            <SelectItem value="SHELTER">Shelter</SelectItem>
                            <SelectItem value="FOOD">Food</SelectItem>
                            <SelectItem value="SECURITY">Security</SelectItem>
                            <SelectItem value="POPULATION">Population</SelectItem>
                            <SelectItem value="LOGISTICS">Logistics</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        Auto-populated from selected assessment type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRITICAL">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                Critical
                              </span>
                            </SelectItem>
                            <SelectItem value="HIGH">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                High
                              </span>
                            </SelectItem>
                            <SelectItem value="MEDIUM">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                Medium
                              </span>
                            </SelectItem>
                            <SelectItem value="LOW">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                Low
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional details about this response plan..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel className="text-base font-medium">Resources *</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-3 p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Item Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Clean water bottles" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Quantity *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0" 
                                    min="1"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.unit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Unit *</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., units, liters" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`items.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Notes (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Additional details..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={fields.length <= 1}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isValid}
                  className="flex-1"
                >
                  {isLoading ? 'Saving...' : 'Update Plan'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}