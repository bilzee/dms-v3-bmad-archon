'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// External libraries
import { Utensils, AlertTriangle, FileText, Save, CheckCircle, Loader2 } from 'lucide-react'

// UI components
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Internal components
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'

// Stores and hooks
import { useFoodAssessments, useCreateRapidAssessment } from '@/hooks/useRapidAssessments'
import { useFilteredEntities, type Entity } from '@/hooks/useEntities'
import { useFoodAssessment } from '@/hooks/useFoodAssessment'

// Utilities and types
import { FOOD_SOURCE_OPTIONS, CreateFoodAssessmentRequest } from '@/types/rapid-assessment'
import { getCurrentUser } from '@/lib/auth/get-current-user'

// Form validation schema
const foodAssessmentSchema = z.object({
  affectedEntityId: z.string().min(1, 'Entity is required'),
  
  // Food assessment specific fields
  foodSource: z.array(z.enum(FOOD_SOURCE_OPTIONS)).min(1, 'At least one food source is required'),
  availableFoodDurationDays: z.number().int().min(0),
  additionalFoodRequiredPersons: z.number().int().min(0),
  additionalFoodRequiredHouseholds: z.number().int().min(0),
  additionalFoodDetails: z.string().optional()
})

type FoodAssessmentFormData = z.infer<typeof foodAssessmentSchema>

interface FoodAssessmentFormProps {
  initialData?: Partial<FoodAssessmentFormData>
  selectedDraftId?: string
  onCancel?: () => void
}

export function FoodAssessmentForm({ 
  initialData,
  selectedDraftId,
  onCancel
}: FoodAssessmentFormProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>(
    initialData?.foodSource || []
  )
  const [photos, setPhotos] = useState<string[]>([])
  const [submitMessage, setSubmitMessage] = useState<string>('')
  const [submitMessageType, setSubmitMessageType] = useState<'success' | 'error'>('success')
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [entitySearchTerm, setEntitySearchTerm] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [gpsLocation, setGpsLocation] = useState<any>(null)

  // TanStack Query hooks for server state
  const { data: recentAssessments, isLoading: assessmentsLoading, refetch: refetchAssessments } = useFoodAssessments()
  const { data: filteredEntities, isLoading: entitiesLoading } = useFilteredEntities(entitySearchTerm)
  const createAssessment = useCreateRapidAssessment()
  
  // Local hooks for drafts
  const { drafts, loadDrafts, saveDraft, deleteDraft } = useFoodAssessment()

  const form = useForm<FoodAssessmentFormData>({
    resolver: zodResolver(foodAssessmentSchema),
    defaultValues: {
      affectedEntityId: initialData?.affectedEntityId || '',
      foodSource: initialData?.foodSource || [],
      availableFoodDurationDays: initialData?.availableFoodDurationDays || 0,
      additionalFoodRequiredPersons: initialData?.additionalFoodRequiredPersons || 0,
      additionalFoodRequiredHouseholds: initialData?.additionalFoodRequiredHouseholds || 0,
      additionalFoodDetails: initialData?.additionalFoodDetails || ''
    }
  })

  // Initialize data and side effects
  useEffect(() => {
    const initializeData = async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
        await loadDrafts()
      } catch (error) {
        console.error('Error initializing form:', error)
      }
    }
    initializeData()
  }, [loadDrafts])

  // Auto-capture GPS location
  useEffect(() => {
    const captureGPS = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGpsLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date(),
              captureMethod: 'GPS'
            })
          },
          (error) => {
            console.error('GPS capture failed:', error)
            // Set a default location or handle gracefully
            setGpsLocation({
              latitude: 9.0820, // Default Nigeria coordinates
              longitude: 8.6753,
              accuracy: 1000,
              timestamp: new Date(),
              captureMethod: 'MANUAL'
            })
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // 1 minute
          }
        )
      }
    }
    captureGPS()
  }, [])

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(async () => {
      // Don't auto-save during final submission or if success message is showing
      if (isFinalSubmitting || submitMessageType === 'success') return
      
      const formData = form.getValues()
      if (formData.affectedEntityId && (formData.foodSource.length > 0 || formData.additionalFoodDetails)) {
        await handleAutoSave(formData)
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(interval)
  }, [form, isFinalSubmitting, submitMessageType])

  const handleAutoSave = async (formData: FoodAssessmentFormData) => {
    try {
      // Only save as draft if not already submitted
      if (submitMessageType !== 'success') {
        await saveDraft(formData)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  const handleSourceToggle = (source: string, checked: boolean) => {
    const newSources = checked 
      ? [...selectedSources, source]
      : selectedSources.filter(s => s !== source)
    
    setSelectedSources(newSources)
    form.setValue('foodSource', newSources as any) // Sync with form field
  }

  const handleLocationCapture = (location: any) => {
    setGpsLocation(location)
  }

  const handleSaveDraft = async () => {
    setIsDraftSaving(true)
    try {
      const formData = form.getValues()
      await saveDraft(formData)
      setSubmitMessage('Draft saved successfully!')
      setSubmitMessageType('success')
    } catch (error) {
      setSubmitMessage('Failed to save draft')
      setSubmitMessageType('error')
    } finally {
      setIsDraftSaving(false)
    }
  }

  const handleFinalSubmit = async () => {
    if (!currentUser || !gpsLocation) {
      setSubmitMessage('User authentication or GPS location not available')
      setSubmitMessageType('error')
      return
    }

    // Validate form first
    const isValid = await form.trigger()
    if (!isValid) {
      setSubmitMessage('Please fill in all required fields before submitting.')
      setSubmitMessageType('error')
      return
    }

    setIsFinalSubmitting(true)
    setSubmitMessage('')

    try {
      const formData = form.getValues()
      const assessmentData: CreateFoodAssessmentRequest = {
        rapidAssessmentType: 'FOOD' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation || {
          latitude: 9.0820,
          longitude: 8.6753,
          accuracy: 1000,
          timestamp: new Date(),
          captureMethod: 'MANUAL'
        },
        photos: photos || [],
        foodAssessment: {
          foodSource: Array.isArray(formData.foodSource) ? formData.foodSource : [],
          availableFoodDurationDays: formData.availableFoodDurationDays || 0,
          additionalFoodRequiredPersons: formData.additionalFoodRequiredPersons || 0,
          additionalFoodRequiredHouseholds: formData.additionalFoodRequiredHouseholds || 0,
          additionalFoodDetails: formData.additionalFoodDetails ? { notes: formData.additionalFoodDetails } : undefined
        }
      }

      await createAssessment.mutateAsync(assessmentData)
      
      // Delete the draft if this was submitted from a draft
      if (selectedDraftId) {
        await deleteDraft(selectedDraftId)
      }
      
      // Refetch assessments to update the count immediately
      refetchAssessments()
      
      setSubmitMessage('Food assessment submitted successfully!')
      setSubmitMessageType('success')
      
      // Wait a bit before resetting to ensure success message is seen
      setTimeout(() => {
        form.reset()
        setPhotos([])
        setSelectedSources([])
        setIsFinalSubmitting(false)
        
        // Redirect to assessments list after success message has been visible
        setTimeout(() => {
          window.location.href = '/assessor/rapid-assessments'
        }, 1500)
      }, 500)
    } catch (error) {
      console.error('Form submission error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      setSubmitMessage(errorMessage)
      setSubmitMessageType('error')
    } finally {
      setIsFinalSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      // Navigate back to assessment type selection
      window.location.href = '/assessor/rapid-assessments/new'
    }
  }

  // Gap analysis visualization
  const availableFoodDurationDays = form.watch('availableFoodDurationDays')
  
  const gapStatuses = {
    foodSupply: availableFoodDurationDays >= 7 ? 'no_gap' : 'gap_identified'
  }

  const getGapText = (status: string) => {
    switch (status) {
      case 'no_gap':
        return 'No Gap'
      case 'gap_identified':
        return 'Gap Identified'
      default:
        return ''
    }
  }

  const getGapColor = (status: string) => {
    switch (status) {
      case 'no_gap':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'gap_identified':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const hasCriticalGaps = () => {
    return availableFoodDurationDays < 3
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Recent Assessments</p>
                <p className="text-2xl font-bold text-blue-900">{recentAssessments?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Drafts</p>
                <p className="text-2xl font-bold text-orange-900">{drafts.length}</p>
              </div>
              <Save className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Critical Gaps</p>
                <p className="text-2xl font-bold text-green-900">
                  {hasCriticalGaps() ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-5 w-5" />
                      Active
                    </span>
                  ) : (
                    'None'
                  )}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Food Security Assessment
          </CardTitle>
          <CardDescription>
            Assess food availability, access, and distribution in the affected area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              
              {/* Affected Entity Selection */}
              <FormField
                control={form.control}
                name="affectedEntityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected Entity *</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Input
                          placeholder="Search entities..."
                          value={entitySearchTerm}
                          onChange={(e) => setEntitySearchTerm(e.target.value)}
                        />
                      </FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select affected entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entitiesLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading entities...
                            </SelectItem>
                          ) : filteredEntities?.length === 0 ? (
                            <SelectItem value="no-entities" disabled>
                              No entities found
                            </SelectItem>
                          ) : (
                            filteredEntities.map((entity) => (
                              <SelectItem key={entity.id} value={entity.id}>
                                {entity.name} ({entity.type}) {entity.location && `- ${entity.location}`}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Start typing to filter entities by name, type, or location
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Food Availability Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Food Availability Assessment</h3>
                
                <FormField
                  control={form.control}
                  name="availableFoodDurationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Food Duration (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        How many days of food supplies are currently available?
                      </FormDescription>
                      <div className="mt-2">
                        <Badge className={getGapColor(gapStatuses.foodSupply)}>
                          {getGapText(gapStatuses.foodSupply)}
                        </Badge>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalFoodRequiredPersons"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Food Required (Persons)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of additional persons requiring food assistance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalFoodRequiredHouseholds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Food Required (Households)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of households requiring food assistance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Food Sources */}
              <div className="space-y-2">
                <FormLabel>Food Sources</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {FOOD_SOURCE_OPTIONS.map((source) => (
                    <FormField
                      key={source}
                      control={form.control}
                      name="foodSource"
                      render={() => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox
                              checked={selectedSources.includes(source)}
                              onCheckedChange={(checked) => 
                                handleSourceToggle(source, checked as boolean)
                              }
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {source}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </div>

              {/* Food Security Status */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Food Security Status</h4>
                  <Badge variant={
                    availableFoodDurationDays >= 7 ? 'default' :
                    availableFoodDurationDays >= 3 ? 'secondary' : 'destructive'
                  }>
                    {availableFoodDurationDays >= 7 ? 'Stable' :
                     availableFoodDurationDays >= 3 ? 'At Risk' : 'Critical'}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      availableFoodDurationDays >= 7 ? 'bg-green-500' :
                      availableFoodDurationDays >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((availableFoodDurationDays / 7) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {availableFoodDurationDays >= 7 && 'Food supplies are stable for the immediate future'}
                  {availableFoodDurationDays >= 3 && availableFoodDurationDays < 7 && 'Food supplies are limited, monitoring required'}
                  {availableFoodDurationDays < 3 && 'Critical food shortage, immediate intervention required'}
                </p>
              </div>

              {/* Critical Food Security Alert */}
              {hasCriticalGaps() && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Food Security Issue Identified:</strong>
                    <ul className="list-disc list-inside mt-1">
                      <li>Food supplies will last less than 3 days</li>
                      <li>Immediate food assistance required</li>
                    </ul>
                    Emergency food distribution is urgently needed to prevent hunger.
                  </AlertDescription>
                </Alert>
              )}

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="additionalFoodDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Food Security Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional food-related information..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include information about market availability, food prices, distribution challenges, 
                      or specific food security concerns
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photos Section */}
              <div className="space-y-2">
                <FormLabel>Photos</FormLabel>
                <MediaField
                  onPhotosChange={setPhotos}
                  initialPhotos={photos}
                  maxPhotos={5}
                />
              </div>

              {/* Auto-captured Information */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-sm">Automatically Captured Information</CardTitle>
                  <CardDescription className="text-xs">
                    This information is captured automatically and cannot be edited
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Assessment Date</label>
                      <p className="text-sm text-gray-600">
                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assessor Name</label>
                      <p className="text-sm text-gray-600">
                        {currentUser?.name || 'Loading user information...'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">GPS Location</label>
                    <p className="text-sm text-gray-600">
                      {gpsLocation ? 
                        `${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)}${gpsLocation.accuracy ? ` (±${gpsLocation.accuracy.toFixed(0)}m)` : ''}` 
                        : 'Capturing location...'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Success/Error Message */}
              {submitMessage && (
                <Alert className={submitMessageType === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={submitMessageType === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {submitMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Form Actions */}
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isDraftSaving || isFinalSubmitting}
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isDraftSaving || isFinalSubmitting}
                  >
                    {isDraftSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Draft...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Draft
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isDraftSaving || isFinalSubmitting}
                  >
                    {isFinalSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Submit Assessment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}