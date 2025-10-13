'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// External libraries
import { Home, AlertTriangle, Users, FileText, Save, CheckCircle, Loader2 } from 'lucide-react'

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
import { useShelterAssessments, useCreateRapidAssessment } from '@/hooks/useRapidAssessments'
import { useFilteredEntities, type Entity } from '@/hooks/useEntities'
import { useShelterAssessment } from '@/hooks/useShelterAssessment'

// Utilities and types
import { SHELTER_DAMAGE_OPTIONS, CreateShelterAssessmentRequest } from '@/types/rapid-assessment'
import { getCurrentUser } from '@/lib/auth/get-current-user'

// Form validation schema
const shelterAssessmentSchema = z.object({
  affectedEntityId: z.string().min(1, 'Entity is required'),
  
  // Shelter assessment specific fields
  shelterDamage: z.array(z.enum(SHELTER_DAMAGE_OPTIONS)).min(1, 'At least one shelter damage type is required'),
  functionalSheltersAvailable: z.number().int().min(0),
  additionalSheltersRequiredPersons: z.number().int().min(0),
  additionalSheltersRequiredHouseholds: z.number().int().min(0),
  additionalShelterDetails: z.string().optional()
})

type ShelterAssessmentFormData = z.infer<typeof shelterAssessmentSchema>

interface ShelterAssessmentFormProps {
  initialData?: Partial<ShelterAssessmentFormData>
  selectedDraftId?: string
  onCancel?: () => void
}

export function ShelterAssessmentForm({ 
  initialData,
  selectedDraftId,
  onCancel
}: ShelterAssessmentFormProps) {
  const [selectedDamages, setSelectedDamages] = useState<string[]>(
    initialData?.shelterDamage || []
  )
  const [photos, setPhotos] = useState<string[]>([])
  const [submitMessage, setSubmitMessage] = useState<string>('')
  const [submitMessageType, setSubmitMessageType] = useState<'success' | 'error'>('success')
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [entitySearchTerm, setEntitySearchTerm] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [gpsLocation, setGpsLocation] = useState<any>(null)

  // TanStack Query hooks for server state
  const { data: recentAssessments, isLoading: assessmentsLoading } = useShelterAssessments()
  const { data: filteredEntities, isLoading: entitiesLoading } = useFilteredEntities('')
  const createAssessment = useCreateRapidAssessment()
  
  // Local hooks for drafts
  const { drafts, loadAssessments, loadDrafts, saveDraft, deleteDraft } = useShelterAssessment()

  const form = useForm<ShelterAssessmentFormData>({
    resolver: zodResolver(shelterAssessmentSchema),
    defaultValues: {
      affectedEntityId: initialData?.affectedEntityId || '',
      shelterDamage: initialData?.shelterDamage || [],
      functionalSheltersAvailable: initialData?.functionalSheltersAvailable || 0,
      additionalSheltersRequiredPersons: initialData?.additionalSheltersRequiredPersons || 0,
      additionalSheltersRequiredHouseholds: initialData?.additionalSheltersRequiredHouseholds || 0,
      additionalShelterDetails: initialData?.additionalShelterDetails || ''
    }
  })

  // Initialize data and side effects
  useEffect(() => {
    setIsMounted(true)
    const initializeData = async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
        await loadAssessments()
        await loadDrafts()
      } catch (error) {
        console.error('Error initializing form:', error)
      }
    }
    initializeData()
  }, [loadAssessments, loadDrafts])

  // Load entities from API
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const result = await fetch('/api/v1/entities/public')
        const response = await result.json()
        
        if (response.success) {
          const fetchedEntities: Entity[] = response.data.map((entity: any) => ({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            location: entity.location
          }))
          setFilteredEntities(fetchedEntities)
        } else {
          console.error('Failed to load entities:', response.error)
          setFilteredEntities([])
        }
      } catch (error) {
        console.error('Error loading entities:', error)
        setFilteredEntities([])
      }
    }
    loadEntities()
  }, [])

  // Filter entities based on search term
  useEffect(() => {
    if (entitySearchTerm.trim() === '') {
      // If entities were loaded, use them; otherwise keep filteredEntities as is
      if (entities.length > 0) {
        setFilteredEntities(entities)
      }
    } else {
      const sourceList = entities.length > 0 ? entities : filteredEntities
      const filtered = sourceList.filter(entity => 
        entity.name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
        entity.type.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
        (entity.location && entity.location.toLowerCase().includes(entitySearchTerm.toLowerCase()))
      )
      setFilteredEntities(filtered)
    }
  }, [entitySearchTerm, entities])

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
      const formData = form.getValues()
      if (formData.affectedEntityId && (formData.shelterDamage.length > 0 || formData.additionalShelterDetails)) {
        await handleAutoSave(formData)
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(interval)
  }, [form])

  const handleAutoSave = async (formData: ShelterAssessmentFormData) => {
    try {
      await saveDraft(formData)
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  const handleDamageToggle = (damage: string, checked: boolean) => {
    if (checked) {
      setSelectedDamages([...selectedDamages, damage])
    } else {
      setSelectedDamages(selectedDamages.filter(d => d !== damage))
    }
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
      const assessmentData: CreateShelterAssessmentRequest = {
        rapidAssessmentType: 'SHELTER' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation,
        photos: photos,
        shelterAssessment: {
          shelterDamage: formData.shelterDamage,
          functionalSheltersAvailable: formData.functionalSheltersAvailable,
          additionalSheltersRequiredPersons: formData.additionalSheltersRequiredPersons,
          additionalSheltersRequiredHouseholds: formData.additionalSheltersRequiredHouseholds,
          additionalShelterDetails: formData.additionalShelterDetails ? { notes: formData.additionalShelterDetails } : undefined
        }
      }

      const result = await fetch('/api/v1/rapid-assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData)
      })
      
      const response = await result.json()
      
      if (response.success) {
        // Delete the draft if this was submitted from a draft
        if (selectedDraftId) {
          await deleteDraft(selectedDraftId)
        }
        
        setSubmitMessage('Shelter assessment submitted successfully!')
        setSubmitMessageType('success')
        form.reset()
        setPhotos([])
        setSelectedDamages([])
        
        // Redirect to assessments list after 2 seconds
        setTimeout(() => {
          window.location.href = '/assessor/rapid-assessments'
        }, 2000)
      } else {
        setSubmitMessage(response.message || 'Failed to submit assessment')
        setSubmitMessageType('error')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitMessage('An unexpected error occurred. Please try again.')
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
  const functionalSheltersAvailable = form.watch('functionalSheltersAvailable')
  const additionalSheltersRequiredPersons = form.watch('additionalSheltersRequiredPersons')
  
  const gapStatuses = {
    shelterAvailability: functionalSheltersAvailable > 0 && additionalSheltersRequiredPersons === 0 ? 'no_gap' : 'gap_identified'
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
    return functionalSheltersAvailable === 0 || additionalSheltersRequiredPersons > 100
  }

  // Calculate shelter coverage percentage
  const shelterCoverage = useMemo(() => {
    if (additionalSheltersRequiredPersons === 0) {
      return functionalSheltersAvailable > 0 ? 100 : 0
    }
    const totalRequired = functionalSheltersAvailable + additionalSheltersRequiredPersons
    const coveragePercentage = (functionalSheltersAvailable / totalRequired) * 100
    return Math.max(0, Math.min(100, coveragePercentage))
  }, [functionalSheltersAvailable, additionalSheltersRequiredPersons])

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Recent Assessments</p>
                <p className="text-2xl font-bold text-blue-900">{recentAssessments.length}</p>
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
            <Home className="h-5 w-5" />
            Shelter Assessment
          </CardTitle>
          <CardDescription>
            Assess shelter availability, damage, and housing needs in the affected area
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
                          {filteredEntities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name} ({entity.type}) {entity.location && `- ${entity.location}`}
                            </SelectItem>
                          ))}
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

              {/* Shelter Availability Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Shelter Availability Assessment</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="functionalSheltersAvailable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Functional Shelters Available</FormLabel>
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
                          Number of functional shelters/houses available
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalSheltersRequiredPersons"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Shelter Required (Persons)</FormLabel>
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
                          Number of persons requiring shelter assistance
                        </FormDescription>
                        <div className="mt-2">
                          <Badge className={getGapColor(gapStatuses.shelterAvailability)}>
                            {getGapText(gapStatuses.shelterAvailability)}
                          </Badge>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="additionalSheltersRequiredHouseholds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Shelter Required (Households)</FormLabel>
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
                        Number of households requiring shelter assistance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Shelter Damage Types */}
              <div className="space-y-2">
                <FormLabel>Shelter Damage Types</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SHELTER_DAMAGE_OPTIONS.map((damage) => (
                    <FormField
                      key={damage}
                      control={form.control}
                      name="shelterDamage"
                      render={() => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox
                              checked={selectedDamages.includes(damage)}
                              onCheckedChange={(checked) => 
                                handleDamageToggle(damage, checked as boolean)
                              }
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {damage}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </div>

              {/* Shelter Coverage Visualization */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Shelter Coverage</h4>
                  <Badge variant={
                    shelterCoverage >= 80 ? 'default' :
                    shelterCoverage >= 50 ? 'secondary' : 'destructive'
                  }>
                    {shelterCoverage >= 80 ? 'Adequate' :
                     shelterCoverage >= 50 ? 'Limited' : 'Critical'} ({Math.round(shelterCoverage)}%)
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      shelterCoverage >= 80 ? 'bg-green-500' :
                      shelterCoverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${shelterCoverage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {shelterCoverage >= 80 && 'Shelter availability meets current needs'}
                  {shelterCoverage >= 50 && shelterCoverage < 80 && 'Shelter availability is limited, additional support needed'}
                  {shelterCoverage < 50 && 'Critical shelter shortage, immediate intervention required'}
                </p>
              </div>

              {/* Critical Shelter Alert */}
              {hasCriticalGaps() && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Shelter Issue Identified:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {functionalSheltersAvailable === 0 && <li>No functional shelters available</li>}
                      {additionalSheltersRequiredPersons > 100 && <li>Large number of persons requiring shelter assistance</li>}
                    </ul>
                    Emergency shelter provision is urgently needed to protect affected populations.
                  </AlertDescription>
                </Alert>
              )}

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="additionalShelterDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Shelter Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional shelter-related information..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include information about temporary shelters, evacuation centers, 
                      construction materials, or specific shelter concerns
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
                        {isMounted ? `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` : 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assessor Name</label>
                      <p className="text-sm text-gray-600">
                        {isMounted && currentUser ? currentUser.name : 'Loading user information...'}
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