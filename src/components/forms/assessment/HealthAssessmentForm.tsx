'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// External libraries - None needed for this component

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
import { useHealthAssessments, useCreateRapidAssessment } from '@/hooks/useRapidAssessments'
import { useFilteredEntities, type Entity } from '@/hooks/useEntities'
import { useHealthAssessment } from '@/hooks/useHealthAssessment'

// Utilities and types
import { HEALTH_ISSUES_OPTIONS, CreateHealthAssessmentRequest } from '@/types/rapid-assessment'
import { getCurrentUser } from '@/lib/auth/get-current-user'

// Form validation schema
const healthAssessmentSchema = z.object({
  // Base assessment fields
  affectedEntityId: z.string().min(1, 'Entity is required'),
  
  // Health assessment specific fields
  hasFunctionalClinic: z.boolean(),
  numberHealthFacilities: z.number().int().min(0),
  healthFacilityType: z.string().min(1, 'Health facility type is required'),
  qualifiedHealthWorkers: z.number().int().min(0),
  hasMedicineSupply: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasMaternalChildServices: z.boolean(),
  commonHealthIssues: z.array(z.enum(HEALTH_ISSUES_OPTIONS)),
  additionalHealthDetails: z.string().optional(),
  
  // Media (optional)
  photos: z.array(z.string()).optional()
})

type HealthAssessmentFormData = z.infer<typeof healthAssessmentSchema>

interface HealthAssessmentFormProps {
  onDataChange?: (data: HealthAssessmentFormData) => void
  initialData?: Partial<HealthAssessmentFormData>
  isLoading?: boolean
  selectedDraftId?: string | null
  onCancel?: () => void
}

interface Entity {
  id: string;
  name: string;
  type: string;
  location: string | null;
}

export function HealthAssessmentForm({ 
  onDataChange, 
  initialData,
  isLoading = false,
  selectedDraftId,
  onCancel
}: HealthAssessmentFormProps) {
  const [selectedIssues, setSelectedIssues] = useState<string[]>(
    initialData?.commonHealthIssues || []
  )
  const [photos, setPhotos] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [entitySearchTerm, setEntitySearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitMessageType, setSubmitMessageType] = useState<'success' | 'error'>('success')
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  
  // TanStack Query hooks for server state
  const { data: recentAssessments, isLoading: assessmentsLoading } = useHealthAssessments()
  const { data: filteredEntities, isLoading: entitiesLoading } = useFilteredEntities(entitySearchTerm)
  const createAssessment = useCreateRapidAssessment()
  
  // Local hooks for drafts
  const { saveDraft, deleteDraft, drafts } = useHealthAssessment()
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL';
  } | null>(null)
  const [isMounted, setIsMounted] = useState(false)


  const form = useForm<HealthAssessmentFormData>({
    resolver: zodResolver(healthAssessmentSchema),
    defaultValues: {
      affectedEntityId: initialData?.affectedEntityId || '',
      hasFunctionalClinic: initialData?.hasFunctionalClinic || false,
      numberHealthFacilities: initialData?.numberHealthFacilities || 0,
      healthFacilityType: initialData?.healthFacilityType || 'primary_health_center',
      qualifiedHealthWorkers: initialData?.qualifiedHealthWorkers || 0,
      hasMedicineSupply: initialData?.hasMedicineSupply || false,
      hasMedicalSupplies: initialData?.hasMedicalSupplies || false,
      hasMaternalChildServices: initialData?.hasMaternalChildServices || false,
      commonHealthIssues: initialData?.commonHealthIssues || [],
      additionalHealthDetails: initialData?.additionalHealthDetails || '',
      photos: initialData?.photos || []
    }
  })

  // Load draft data when selectedDraftId changes
  useEffect(() => {
    if (selectedDraftId) {
      try {
        const draft = drafts.find((d: any) => d.id === selectedDraftId)
        
        if (draft && draft.data) {
          const draftData = draft.data
          
          console.log('Loading draft data:', draftData) // Debug log
          console.log('Checkbox values from draft:', {
            hasFunctionalClinic: draftData.healthAssessment?.hasFunctionalClinic,
            hasMedicineSupply: draftData.healthAssessment?.hasMedicineSupply,
            hasMedicalSupplies: draftData.healthAssessment?.hasMedicalSupplies,
            hasMaternalChildServices: draftData.healthAssessment?.hasMaternalChildServices
          })
          
          // Ensure form is properly initialized before resetting
          setTimeout(() => {
            // Update form with draft data
            form.reset({
              affectedEntityId: draftData.affectedEntityId || '',
              hasFunctionalClinic: draftData.healthAssessment?.hasFunctionalClinic || false,
              numberHealthFacilities: draftData.healthAssessment?.numberHealthFacilities || 0,
              healthFacilityType: draftData.healthAssessment?.healthFacilityType || 'primary_health_center',
              qualifiedHealthWorkers: draftData.healthAssessment?.qualifiedHealthWorkers || 0,
              hasMedicineSupply: draftData.healthAssessment?.hasMedicineSupply || false,
              hasMedicalSupplies: draftData.healthAssessment?.hasMedicalSupplies || false,
              hasMaternalChildServices: draftData.healthAssessment?.hasMaternalChildServices || false,
              commonHealthIssues: draftData.healthAssessment?.commonHealthIssues || [],
              additionalHealthDetails: draftData.healthAssessment?.additionalHealthDetails?.notes || '',
              photos: draftData.photos || []
            })
            
            setSelectedIssues(draftData.healthAssessment?.commonHealthIssues || [])
            setPhotos(draftData.photos || [])
            setFormInitialized(true)
            
            console.log('Form reset completed with draft data')
          }, 100) // Small delay to ensure form is properly initialized
        }
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [selectedDraftId, form, drafts])

  // Load current user and auto-populate assessor name
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser()
        if (user && user.roles.includes('ASSESSOR')) {
          setCurrentUser(user)
          console.log('User loaded successfully:', user.name)
        } else {
          console.error('User does not have ASSESSOR role')
          setSubmitMessage('You must have ASSESSOR role to access this form')
          setSubmitMessageType('error')
        }
      } catch (error) {
        console.error('Error loading current user:', error)
        setSubmitMessage('Failed to load user information')
        setSubmitMessageType('error')
      }
    }
    loadUser()
  }, [])

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
            console.error('Error getting GPS location:', error)
            // Fall back to manual location or use entity location
            setGpsLocation({
              latitude: 0,
              longitude: 0,
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

  
  // Watch form changes and notify parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (onDataChange) {
        onDataChange(value as HealthAssessmentFormData)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, onDataChange])

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-save draft every 30 seconds or when form data changes
  useEffect(() => {
    if (!currentUser) return

    const saveDraftToLocalStorage = async () => {
      try {
        const formData = form.getValues()
        const draftData: Partial<CreateHealthAssessmentRequest> = {
          rapidAssessmentType: 'HEALTH' as any,
          rapidAssessmentDate: new Date(),
          affectedEntityId: formData.affectedEntityId,
          assessorName: currentUser.name,
          gpsCoordinates: gpsLocation,
          photos: photos,
          healthAssessment: {
            hasFunctionalClinic: formData.hasFunctionalClinic,
            numberHealthFacilities: formData.numberHealthFacilities,
            healthFacilityType: formData.healthFacilityType,
            qualifiedHealthWorkers: formData.qualifiedHealthWorkers,
            hasMedicineSupply: formData.hasMedicineSupply,
            hasMedicalSupplies: formData.hasMedicalSupplies,
            hasMaternalChildServices: formData.hasMaternalChildServices,
            commonHealthIssues: formData.commonHealthIssues,
            additionalHealthDetails: formData.additionalHealthDetails ? { notes: formData.additionalHealthDetails } : undefined
          }
        }

        const newDraft = {
          id: selectedDraftId || `draft-${Date.now()}`,
          data: draftData,
          timestamp: Date.now(),
          autoSaved: true
        }

        let existingDrafts = JSON.parse(localStorage.getItem('health-assessment-drafts') || '[]')
        
        if (selectedDraftId) {
          // Update existing draft
          existingDrafts = existingDrafts.map((draft: any) => 
            draft.id === selectedDraftId ? newDraft : draft
          )
        } else {
          // Add new draft only if form has some data
          const hasData = formData.affectedEntityId || 
            formData.hasFunctionalClinic || 
            formData.numberHealthFacilities > 0 ||
            formData.qualifiedHealthWorkers > 0

          if (hasData) {
            existingDrafts.push(newDraft)
          }
        }
        
        localStorage.setItem('health-assessment-drafts', JSON.stringify(existingDrafts))
      } catch (error) {
        console.error('Error auto-saving draft:', error)
      }
    }

    // Set up auto-save interval
    const interval = setInterval(saveDraftToLocalStorage, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [form, currentUser, gpsLocation, photos, selectedDraftId])

  
  const handleIssueToggle = (issue: string, checked: boolean) => {
    const updatedIssues = checked
      ? [...selectedIssues, issue]
      : selectedIssues.filter(i => i !== issue)
    
    setSelectedIssues(updatedIssues)
    form.setValue('commonHealthIssues', updatedIssues as any)
  }

  const handleSaveDraft = async () => {
    if (!currentUser || !gpsLocation) {
      setSubmitMessage('User authentication or GPS location not available')
      setSubmitMessageType('error')
      return
    }

    setIsDraftSaving(true)
    setSubmitMessage('')

    try {
      const formData = form.getValues()
      const assessmentData: CreateHealthAssessmentRequest = {
        rapidAssessmentType: 'HEALTH' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation,
        photos: photos,
        healthAssessment: {
          hasFunctionalClinic: formData.hasFunctionalClinic,
          numberHealthFacilities: formData.numberHealthFacilities,
          healthFacilityType: formData.healthFacilityType,
          qualifiedHealthWorkers: formData.qualifiedHealthWorkers,
          hasMedicineSupply: formData.hasMedicineSupply,
          hasMedicalSupplies: formData.hasMedicalSupplies,
          hasMaternalChildServices: formData.hasMaternalChildServices,
          commonHealthIssues: formData.commonHealthIssues,
          additionalHealthDetails: formData.additionalHealthDetails ? { notes: formData.additionalHealthDetails } : undefined
        }
      }

      // Delete the existing draft if we're editing one
      if (selectedDraftId) {
        await deleteDraft(selectedDraftId)
      }

      // Save to localStorage using the hook
      await saveDraft(assessmentData)
      
      setSubmitMessage('Draft saved successfully!')
      setSubmitMessageType('success')
    } catch (error) {
      console.error('Draft save error:', error)
      setSubmitMessage('Failed to save draft. Please try again.')
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
      const assessmentData: CreateHealthAssessmentRequest = {
        rapidAssessmentType: 'HEALTH' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation,
        photos: photos,
        healthAssessment: {
          hasFunctionalClinic: formData.hasFunctionalClinic,
          numberHealthFacilities: formData.numberHealthFacilities,
          healthFacilityType: formData.healthFacilityType,
          qualifiedHealthWorkers: formData.qualifiedHealthWorkers,
          hasMedicineSupply: formData.hasMedicineSupply,
          hasMedicalSupplies: formData.hasMedicalSupplies,
          hasMaternalChildServices: formData.hasMaternalChildServices,
          commonHealthIssues: formData.commonHealthIssues,
          additionalHealthDetails: formData.additionalHealthDetails ? { notes: formData.additionalHealthDetails } : undefined
        }
      }

      await createAssessment.mutateAsync(assessmentData)
      
      // Delete the draft if this was submitted from a draft
      if (selectedDraftId) {
        await deleteDraft(selectedDraftId)
      }
      
      setSubmitMessage('Health assessment submitted successfully!')
      setSubmitMessageType('success')
      form.reset()
      setPhotos([])
      setSelectedIssues([])
      
      // Redirect to assessments list after 2 seconds
      setTimeout(() => {
        window.location.href = '/assessor/rapid-assessments'
      }, 2000)
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitMessage(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
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

  // Gap analysis visualization - watch specific fields to avoid infinite loops
  const hasFunctionalClinic = form.watch('hasFunctionalClinic')
  const hasMedicineSupply = form.watch('hasMedicineSupply')
  const hasMedicalSupplies = form.watch('hasMedicalSupplies')
  const hasMaternalChildServices = form.watch('hasMaternalChildServices')
  
  const gapStatuses = {
    hasFunctionalClinic: hasFunctionalClinic ? 'no_gap' : 'gap_identified',
    hasMedicineSupply: hasMedicineSupply ? 'no_gap' : 'gap_identified',
    hasMedicalSupplies: hasMedicalSupplies ? 'no_gap' : 'gap_identified',
    hasMaternalChildServices: hasMaternalChildServices ? 'no_gap' : 'gap_identified'
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Health Assessment</CardTitle>
          <CardDescription>
            Assess healthcare facilities and services available in the affected area
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

              {/* Health Facility Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Health Facility Assessment</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hasFunctionalClinic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Functional Clinic Available</FormLabel>
                          <FormDescription>
                            Is there a functional health clinic in the area?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge className={getGapColor(gapStatuses.hasFunctionalClinic)}>
                              {getGapText(gapStatuses.hasFunctionalClinic)}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasMedicineSupply"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Medicine Supply Available</FormLabel>
                          <FormDescription>
                            Are essential medicines available?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge className={getGapColor(gapStatuses.hasMedicineSupply)}>
                              {getGapText(gapStatuses.hasMedicineSupply)}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numberHealthFacilities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Health Facilities</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="healthFacilityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Health Facility Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select facility type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="primary_health_center">Primary Health Center</SelectItem>
                            <SelectItem value="hospital">Hospital</SelectItem>
                            <SelectItem value="clinic">Clinic</SelectItem>
                            <SelectItem value="dispensary">Dispensary</SelectItem>
                            <SelectItem value="mobile_clinic">Mobile Clinic</SelectItem>
                            <SelectItem value="none">No Facility</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="qualifiedHealthWorkers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qualified Health Workers</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hasMedicalSupplies"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Medical Supplies Available</FormLabel>
                          <FormDescription>
                            Are basic medical supplies available?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge className={getGapColor(gapStatuses.hasMedicalSupplies)}>
                              {getGapText(gapStatuses.hasMedicalSupplies)}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasMaternalChildServices"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Maternal & Child Services</FormLabel>
                          <FormDescription>
                            Are maternal and child health services available?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge className={getGapColor(gapStatuses.hasMaternalChildServices)}>
                              {getGapText(gapStatuses.hasMaternalChildServices)}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Common Health Issues */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Common Health Issues</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {HEALTH_ISSUES_OPTIONS.map((issue) => (
                    <FormField
                      key={issue}
                      control={form.control}
                      name="commonHealthIssues"
                      render={() => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={selectedIssues.includes(issue)}
                              onCheckedChange={(checked) => 
                                handleIssueToggle(issue, checked as boolean)
                              }
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {issue}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </div>

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="additionalHealthDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Health Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional health-related information..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include any other relevant health information not captured above
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
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        Saving Draft...
                      </div>
                    ) : (
                      'Save Draft'
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isDraftSaving || isFinalSubmitting}
                  >
                    {isFinalSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Assessment'
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