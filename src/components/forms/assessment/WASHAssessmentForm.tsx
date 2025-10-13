'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// External libraries
import { Droplets, AlertTriangle, Users, FileText, Save, CheckCircle, Loader2 } from 'lucide-react'

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
import { useWASHAssessments, useCreateRapidAssessment } from '@/hooks/useRapidAssessments'
import { useFilteredEntities, type Entity } from '@/hooks/useEntities'
import { useWASHAssessment } from '@/hooks/useWASHAssessment'

// Utilities and types
import { WATER_SOURCE_OPTIONS, CreateWASHAssessmentRequest } from '@/types/rapid-assessment'
import { getCurrentUser } from '@/lib/auth/get-current-user'

// Form validation schema
const washAssessmentSchema = z.object({
  // Base assessment fields
  affectedEntityId: z.string().min(1, 'Entity is required'),
  
  // WASH assessment specific fields
  waterSource: z.array(z.enum(WATER_SOURCE_OPTIONS)).min(1, 'At least one water source is required'),
  isWaterSufficient: z.boolean(),
  functionalLatrinesAvailable: z.number().int().min(0),
  areLatrinesSufficient: z.boolean(),
  hasOpenDefecationConcerns: z.boolean(),
  additionalWashDetails: z.string().optional(),
  
  // Media (optional)
  photos: z.array(z.string()).optional()
})

type WASHAssessmentFormData = z.infer<typeof washAssessmentSchema>

interface WASHAssessmentFormProps {
  onDataChange?: (data: WASHAssessmentFormData) => void
  initialData?: Partial<WASHAssessmentFormData>
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

export function WASHAssessmentForm({ 
  onDataChange, 
  initialData,
  isLoading = false,
  selectedDraftId,
  onCancel
}: WASHAssessmentFormProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>(
    initialData?.waterSource || []
  )
  const [photos, setPhotos] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([])
  const [entitySearchTerm, setEntitySearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitMessageType, setSubmitMessageType] = useState<'success' | 'error'>('success')
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  const { recentAssessments, saveDraft, deleteDraft, drafts } = useWASHAssessment()
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL';
  } | null>(null)

  // TanStack Query hooks for server state
  const { data: recentAssessments, isLoading: assessmentsLoading } = useWASHAssessments()
  const { data: filteredEntities, isLoading: entitiesLoading } = useFilteredEntities('')
  const createAssessment = useCreateRapidAssessment()
  
  // Local hooks for drafts
  const { drafts, loadAssessments, loadDrafts, saveDraft, deleteDraft } = useWASHAssessment()

  const form = useForm<WASHAssessmentFormData>({
    resolver: zodResolver(washAssessmentSchema),
    defaultValues: {
      affectedEntityId: initialData?.affectedEntityId || '',
      waterSource: initialData?.waterSource || [],
      isWaterSufficient: initialData?.isWaterSufficient || false,
      functionalLatrinesAvailable: initialData?.functionalLatrinesAvailable || 0,
      areLatrinesSufficient: initialData?.areLatrinesSufficient || false,
      hasOpenDefecationConcerns: initialData?.hasOpenDefecationConcerns || false,
      additionalWashDetails: initialData?.additionalWashDetails || '',
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
          
          // Ensure form is properly initialized before resetting
          setTimeout(() => {
            // Update form with draft data
            form.reset({
              affectedEntityId: draftData.affectedEntityId || '',
              waterSource: draftData.washAssessment?.waterSource || [],
              isWaterSufficient: draftData.washAssessment?.isWaterSufficient || false,
              functionalLatrinesAvailable: draftData.washAssessment?.functionalLatrinesAvailable || 0,
              areLatrinesSufficient: draftData.washAssessment?.areLatrinesSufficient || false,
              hasOpenDefecationConcerns: draftData.washAssessment?.hasOpenDefecationConcerns || false,
              additionalWashDetails: draftData.washAssessment?.additionalWashDetails?.notes || '',
              photos: draftData.photos || []
            })
            
            setSelectedSources(draftData.washAssessment?.waterSource || [])
            setPhotos(draftData.photos || [])
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

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
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
          setEntities(fetchedEntities)
          setFilteredEntities(fetchedEntities)
        } else {
          console.error('Failed to load entities:', response.error)
          // Set empty arrays if API fails - no mock fallback to avoid ID mismatches
          setEntities([])
          setFilteredEntities([])
        }
      } catch (error) {
        console.error('Error loading entities:', error)
        // Set empty arrays if fetch fails - no mock fallback to avoid ID mismatches
        setEntities([])
        setFilteredEntities([])
      }
    }
    loadEntities()
  }, [])

  // Filter entities based on search term
  useEffect(() => {
    if (entitySearchTerm.trim() === '') {
      setFilteredEntities(entities)
    } else {
      const filtered = entities.filter(entity => 
        entity.name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
        entity.type.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
        (entity.location && entity.location.toLowerCase().includes(entitySearchTerm.toLowerCase()))
      )
      setFilteredEntities(filtered)
    }
  }, [entitySearchTerm, entities])

  // Watch form changes and notify parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (onDataChange) {
        onDataChange(value as WASHAssessmentFormData)
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
        const draftData: Partial<CreateWASHAssessmentRequest> = {
          rapidAssessmentType: 'WASH' as any,
          rapidAssessmentDate: new Date(),
          affectedEntityId: formData.affectedEntityId,
          assessorName: currentUser.name,
          gpsCoordinates: gpsLocation,
          photos: photos,
          washAssessment: {
            waterSource: formData.waterSource,
            isWaterSufficient: formData.isWaterSufficient,
            functionalLatrinesAvailable: formData.functionalLatrinesAvailable,
            areLatrinesSufficient: formData.areLatrinesSufficient,
            hasOpenDefecationConcerns: formData.hasOpenDefecationConcerns,
            additionalWashDetails: formData.additionalWashDetails ? { notes: formData.additionalWashDetails } : undefined
          }
        }

        const newDraft = {
          id: selectedDraftId || `draft-${Date.now()}`,
          data: draftData,
          timestamp: Date.now(),
          autoSaved: true
        }

        let existingDrafts = JSON.parse(localStorage.getItem('wash-assessment-drafts') || '[]')
        
        if (selectedDraftId) {
          // Update existing draft
          existingDrafts = existingDrafts.map((draft: any) => 
            draft.id === selectedDraftId ? newDraft : draft
          )
        } else {
          // Add new draft only if form has some data
          const hasData = formData.affectedEntityId || 
            formData.isWaterSufficient || 
            formData.functionalLatrinesAvailable > 0

          if (hasData) {
            existingDrafts.push(newDraft)
          }
        }
        
        localStorage.setItem('wash-assessment-drafts', JSON.stringify(existingDrafts))
      } catch (error) {
        console.error('Error auto-saving draft:', error)
      }
    }

    // Set up auto-save interval
    const interval = setInterval(saveDraftToLocalStorage, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [form, currentUser, gpsLocation, photos, selectedDraftId])
  
  const handleSourceToggle = (source: string, checked: boolean) => {
    const updatedSources = checked
      ? [...selectedSources, source]
      : selectedSources.filter(s => s !== source)
    
    setSelectedSources(updatedSources)
    form.setValue('waterSource', updatedSources as any)
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
      const assessmentData: CreateWASHAssessmentRequest = {
        rapidAssessmentType: 'WASH' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation,
        photos: photos,
        washAssessment: {
          waterSource: formData.waterSource,
          isWaterSufficient: formData.isWaterSufficient,
          functionalLatrinesAvailable: formData.functionalLatrinesAvailable,
          areLatrinesSufficient: formData.areLatrinesSufficient,
          hasOpenDefecationConcerns: formData.hasOpenDefecationConcerns,
          additionalWashDetails: formData.additionalWashDetails ? { notes: formData.additionalWashDetails } : undefined
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
      const assessmentData: CreateWASHAssessmentRequest = {
        rapidAssessmentType: 'WASH' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation,
        photos: photos,
        washAssessment: {
          waterSource: formData.waterSource,
          isWaterSufficient: formData.isWaterSufficient,
          functionalLatrinesAvailable: formData.functionalLatrinesAvailable,
          areLatrinesSufficient: formData.areLatrinesSufficient,
          hasOpenDefecationConcerns: formData.hasOpenDefecationConcerns,
          additionalWashDetails: formData.additionalWashDetails ? { notes: formData.additionalWashDetails } : undefined
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
        
        setSubmitMessage('WASH assessment submitted successfully!')
        setSubmitMessageType('success')
        form.reset()
        setPhotos([])
        setSelectedSources([])
        
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

  // Gap analysis visualization - watch specific fields to avoid infinite loops
  const isWaterSufficient = form.watch('isWaterSufficient')
  const areLatrinesSufficient = form.watch('areLatrinesSufficient')
  const hasOpenDefecationConcerns = form.watch('hasOpenDefecationConcerns')
  const functionalLatrinesAvailable = form.watch('functionalLatrinesAvailable')
  
  const gapStatuses = {
    isWaterSufficient: isWaterSufficient ? 'no_gap' : 'gap_identified',
    areLatrinesSufficient: areLatrinesSufficient ? 'no_gap' : 'gap_identified',
    hasOpenDefecationConcerns: hasOpenDefecationConcerns ? 'gap_identified' : 'no_gap'  // Reverse logic for concerns
  }

  const hasCriticalGaps = () => {
    return !isWaterSufficient || !areLatrinesSufficient || hasOpenDefecationConcerns
  }

  // Calculate latrine coverage (WHO standard: 1 latrine per 50 people, minimum 3 per 1000)
  const latrineCoverage = useMemo(() => {
    // For rapid assessment, we'll estimate based on a standard population size of 500
    const estimatedPopulation = 500
    const latrinesRequired = Math.ceil(estimatedPopulation / 50)
    
    if (functionalLatrinesAvailable === 0) {
      return {
        coverage: 0,
        status: 'critical',
        text: 'Critical'
      }
    }
    
    const coveragePercentage = (functionalLatrinesAvailable / latrinesRequired) * 100
    
    let status: string
    let text: string
    
    if (coveragePercentage < 25) {
      status = 'critical'
      text = 'Critical'
    } else if (coveragePercentage < 50) {
      status = 'inadequate' 
      text = 'Inadequate'
    } else if (coveragePercentage < 75) {
      status = 'acceptable'
      text = 'Acceptable'
    } else {
      status = 'good'
      text = 'Good'
    }
    
    return {
      coverage: Math.min(100, Math.round(coveragePercentage)),
      status,
      text
    }
  }, [functionalLatrinesAvailable])

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
            <Droplets className="h-5 w-5" />
            WASH Assessment
          </CardTitle>
          <CardDescription>
            Assess Water, Sanitation, and Hygiene (WASH) facilities and services in the affected area
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

              {/* Water Supply Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Water Supply Assessment</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isWaterSufficient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Water Supply Sufficient</FormLabel>
                          <FormDescription>
                            Is available water sufficient for the population?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge className={getGapColor(gapStatuses.isWaterSufficient)}>
                              {getGapText(gapStatuses.isWaterSufficient)}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasOpenDefecationConcerns"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Open Defecation Concerns</FormLabel>
                          <FormDescription>
                            Are there open defecation concerns?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge className={getGapColor(gapStatuses.hasOpenDefecationConcerns)}>
                              {getGapText(gapStatuses.hasOpenDefecationConcerns)}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Water Sources */}
                <div className="space-y-2">
                  <FormLabel>Water Sources</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {WATER_SOURCE_OPTIONS.map((source) => (
                      <FormField
                        key={source}
                        control={form.control}
                        name="waterSource"
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
              </div>

              {/* Sanitation Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sanitation Assessment
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="functionalLatrinesAvailable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Functional Latrines Available</FormLabel>
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
                          Number of functional latrines available
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="areLatrinesSufficient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Latrines Sufficient</FormLabel>
                          <FormDescription>
                            Are latrine facilities sufficient for the population?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge className={getGapColor(gapStatuses.areLatrinesSufficient)}>
                              {getGapText(gapStatuses.areLatrinesSufficient)}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Latrine Coverage Visualization */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Estimated Latrine Coverage</h4>
                    <Badge variant={
                      latrineCoverage.status === 'critical' ? 'destructive' :
                      latrineCoverage.status === 'inadequate' ? 'secondary' : 'default'
                    }>
                      {latrineCoverage.text} ({latrineCoverage.coverage}%)
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        latrineCoverage.status === 'critical' ? 'bg-red-500' :
                        latrineCoverage.status === 'inadequate' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(latrineCoverage.coverage, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {latrineCoverage.status === 'critical' && 'Critical: Immediate latrine construction needed'}
                    {latrineCoverage.status === 'inadequate' && 'Inadequate: Additional latrines recommended'}
                    {latrineCoverage.status === 'acceptable' && 'Acceptable: Monitoring recommended'}
                    {latrineCoverage.status === 'good' && 'Good: Coverage meets standards'}
                  </p>
                </div>
              </div>

              {/* Critical WASH Issues Alert */}
              {hasCriticalGaps() && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical WASH Issues Identified:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {!form.getValues('isWaterSufficient') && <li>Insufficient water supply</li>}
                      {!form.getValues('areLatrinesSufficient') && <li>Insufficient latrine facilities</li>}
                      {form.getValues('hasOpenDefecationConcerns') && <li>Open defecation concerns</li>}
                    </ul>
                    Immediate WASH intervention is required to prevent disease outbreaks.
                  </AlertDescription>
                </Alert>
              )}

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="additionalWashDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional WASH Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional WASH-related information..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include information about water quality, hygiene practices, drainage, 
                      or specific WASH challenges
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
                  <div suppressHydrationWarning>
                    <label className="text-sm font-medium">GPS Location</label>
                    <p className="text-sm text-gray-600">
                      {isMounted && gpsLocation ? 
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