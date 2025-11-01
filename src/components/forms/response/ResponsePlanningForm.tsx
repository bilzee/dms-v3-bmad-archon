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

// Icons
import { Plus, Trash2, Package, AlertTriangle, Save, X, Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react'

// Shared components
import { EntitySelector } from '@/components/shared/EntitySelector'
import { AssessmentSelector } from '@/components/response/AssessmentSelector'
import { CollaborationStatus } from '@/components/response/CollaborationStatus'

// Hooks
import { useCollaboration } from '@/hooks/useCollaboration'
import { useOffline } from '@/hooks/useOffline'
import { useSync } from '@/hooks/useSync'

// Services and types
import { responseOfflineService } from '@/lib/services/response-offline.service'
import { CreatePlannedResponseInput, ResponseItem } from '@/lib/validation/response'
import { useAuthStore } from '@/stores/auth.store'

const ResponseItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().positive('Quantity must be positive'),
  category: z.string().optional(),
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
  initialData?: FormData
  mode?: 'create' | 'edit'
  onSuccess?: (response: any) => void
  onCancel?: () => void
}

export function ResponsePlanningForm({ 
  initialData, 
  mode = 'create',
  onSuccess,
  onCancel 
}: ResponsePlanningFormProps) {
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDirty, setIsDirty] = useState(false)
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)

  // Collaboration hook
  const collaboration = useCollaboration(editingResponseId)

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
      assessmentId: '',
      entityId: ''
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  // Get assigned entities for the current user
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: ['entities', 'assigned', user?.id],
    queryFn: async () => {
      if (!user || !token) throw new Error('User not authenticated')
      
      const response = await fetch(`/api/v1/entities/assigned?userId=${user.id}`, {
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
    enabled: !!user && !!token && mode === 'create'
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

  // Create planned response mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePlannedResponseInput) => {
      if (!user) throw new Error('User not authenticated')
      
      // Add user ID to data
      const dataWithUser = { ...data, responderId: user.id }
      
      return await responseOfflineService.createPlannedResponse(dataWithUser)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['responses', 'planned', user?.id] })
      setIsDirty(false)
      form.reset()
      
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
    }
  })

  // Update planned response mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<CreatePlannedResponseInput> }) => {
      if (!user) throw new Error('User not authenticated')
      
      return await responseOfflineService.updatePlannedResponse(id, data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['responses', 'planned', user?.id] })
      setIsDirty(false)
      // Stop editing after successful update
      if (collaboration.isCurrentUserCollaborating) {
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
    }
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      // Check if someone else is editing (for edit mode)
      if (mode === 'edit' && collaboration.isActive && !collaboration.canEdit) {
        throw new Error('Another responder is currently editing this response. Please wait for them to finish.')
      }

      // Start editing if collaborating
      if (mode === 'create' && collaboration.isCurrentUserCollaborating) {
        collaboration.actions.startEditing()
      }
      
      if (mode === 'edit' && collaboration.isCurrentUserCollaborating) {
        collaboration.actions.startEditing()
      }
      
      if (mode === 'create') {
        createMutation.mutate(data)
      } else if (mode === 'edit') {
        if (!editingResponseId) {
          throw new Error('Response ID is required for editing')
        }
        updateMutation.mutate({ id: editingResponseId, data })
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  })

  const handleCancel = () => {
    if (isDirty && window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      form.reset()
      setIsDirty(false)
      onCancel?.()
    } else if (!isDirty) {
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
    setIsDirty(form.formState.isDirty)
  }, [form.formState.isDirty])

  // Cleanup collaboration on unmount
  useEffect(() => {
    return () => {
      if (collaboration.isCurrentUserCollaborating) {
        collaboration.actions.leaveCollaboration()
      }
    }
  }, [collaboration.isCurrentUserCollaborating, collaboration.actions])

  const isLoading = createMutation.isPending || updateMutation.isPending || entitiesLoading || assessmentsLoading

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
            ? 'Plan response resources for a verified assessment. Once created, the response will be in PLANNED status and can be edited.'
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
        {/* Collaboration Status - Show for edit mode or when collaborating */}
        {(mode === 'edit' || collaboration.isActive) && (
          <div className="mb-6">
            <CollaborationStatus
              collaboration={collaboration}
              currentUserId={user?.id}
              onJoin={collaboration.actions.joinCollaboration}
              onLeave={collaboration.actions.leaveCollaboration}
              onStartEditing={collaboration.actions.startEditing}
              onStopEditing={collaboration.actions.stopEditing}
            />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Entity Selection - Only in create mode */}
            {mode === 'create' && (
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
                        disabled={mode === 'edit'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assessment Selection */}
            <AssessmentSelector
              entityId={form.watch('entityId')}
              value={form.watch('assessmentId')}
              onValueChange={(assessmentId, assessment) => {
                form.setValue('assessmentId', assessmentId)
                // Auto-match response type to assessment type
                if (assessment && assessment.rapidAssessmentType) {
                  form.setValue('type', assessment.rapidAssessmentType)
                }
                // Note: Don't override entityId as it's already selected by the user
                // The assessment should be for the same entity that was selected
              }}
              disabled={mode === 'edit'}
              showConflictWarning={true}
              selectedAssessment={assessments.find(a => a.id === form.watch('assessmentId'))}
            />

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
                      placeholder="Provide additional details about the response plan..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Response Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-medium">Response Items *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Item {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Clean Water Kits"
                                {...field}
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
                            <FormLabel>Unit *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., kits, boxes, liters"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Medical, Shelter, Food"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    <FormField
                      control={form.control}
                      name={`items.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes about this item..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      />
                  </div>
                </Card>
              ))}
            </div>

            {/* Form Actions */}
            <Separator />

            {(createMutation.error || updateMutation.error) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {(createMutation.error || updateMutation.error)?.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Sync Progress Indicator */}
            {isSyncing && (
              <Alert className="bg-blue-50 border-blue-200">
                <Cloud className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="flex items-center justify-between">
                    <span>Syncing your response plan...</span>
                    <span className="text-sm">{Math.round(syncProgress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isLoading || !form.formState.isValid}
                className="min-w-[120px]"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : (
                  !isOnline ? (
                    <>Save Locally</>
                  ) : (
                    mode === 'create' ? 'Create Plan' : 'Update Plan'
                  )
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}