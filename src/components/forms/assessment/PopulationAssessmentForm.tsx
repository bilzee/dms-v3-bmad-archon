'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// External libraries
import { 
  Users, AlertTriangle, Heart, Baby, Activity, Clock, MapPin, 
  FileText, Save, CheckCircle, Loader2, Camera, TrendingUp 
} from 'lucide-react'

// UI components
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Internal components
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'

// Stores and hooks
import { useAuth } from '@/hooks/useAuth'
import { usePopulationAssessments, useCreateRapidAssessment } from '@/hooks/useRapidAssessments'
import { useFilteredEntities, type Entity } from '@/hooks/useEntities'
import { usePopulationAssessment } from '@/hooks/usePopulationAssessment'

// Utilities and types
import { getCurrentUser } from '@/lib/auth/get-current-user'

// Form validation schema
const populationAssessmentSchema = z.object({
  rapidAssessmentDate: z.date(),
  affectedEntityId: z.string().min(1, 'Entity is required'),
  assessorName: z.string().min(1, 'Assessor name is required'),
  
  // GPS coordinates
  gpsCoordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
    timestamp: z.date(),
    captureMethod: z.enum(['GPS', 'MANUAL'])
  }).optional(),
  
  // Population assessment specific fields
  totalHouseholds: z.number().int().min(0),
  totalPopulation: z.number().int().min(0),
  populationMale: z.number().int().min(0),
  populationFemale: z.number().int().min(0),
  populationUnder5: z.number().int().min(0),
  pregnantWomen: z.number().int().min(0),
  lactatingMothers: z.number().int().min(0),
  personWithDisability: z.number().int().min(0),
  elderlyPersons: z.number().int().min(0),
  separatedChildren: z.number().int().min(0),
  numberLivesLost: z.number().int().min(0),
  numberInjured: z.number().int().min(0),
  additionalPopulationDetails: z.string().optional()
}).refine((data) => data.totalPopulation === data.populationMale + data.populationFemale, {
  message: "Total population must equal the sum of male and female population",
  path: ["totalPopulation"]
})

type PopulationAssessmentFormData = z.infer<typeof populationAssessmentSchema>

interface PopulationAssessmentFormProps {
  onCancel?: () => void
  initialData?: Partial<PopulationAssessmentFormData>
  isLoading?: boolean
}

export function PopulationAssessmentForm({ 
  onCancel, 
  initialData,
  isLoading = false
}: PopulationAssessmentFormProps) {
  const { user } = useAuth()
  const { 
    recentAssessments, 
    drafts, 
    loadAssessments, 
    loadDrafts, 
    saveDraft, 
    deleteDraft 
  } = usePopulationAssessment()
  
  // TanStack Query hooks for server state
  const { data: recentAssessments, isLoading: assessmentsLoading } = usePopulationAssessments()
  const { data: filteredEntities, isLoading: entitiesLoading } = useFilteredEntities(searchTerm)
  const createAssessment = useCreateRapidAssessment()
  
  // Local state
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || [])
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [gpsLocation, setGpsLocation] = useState<any>(null)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitMessageType, setSubmitMessageType] = useState<'success' | 'error'>('success')

  const form = useForm<PopulationAssessmentFormData>({
    resolver: zodResolver(populationAssessmentSchema),
    defaultValues: {
      rapidAssessmentDate: initialData?.rapidAssessmentDate || new Date(),
      affectedEntityId: initialData?.affectedEntityId || '',
      assessorName: initialData?.assessorName || user?.name || '',
      gpsCoordinates: initialData?.gpsCoordinates,
      totalHouseholds: initialData?.totalHouseholds || 0,
      totalPopulation: initialData?.totalPopulation || 0,
      populationMale: initialData?.populationMale || 0,
      populationFemale: initialData?.populationFemale || 0,
      populationUnder5: initialData?.populationUnder5 || 0,
      pregnantWomen: initialData?.pregnantWomen || 0,
      lactatingMothers: initialData?.lactatingMothers || 0,
      personWithDisability: initialData?.personWithDisability || 0,
      elderlyPersons: initialData?.elderlyPersons || 0,
      separatedChildren: initialData?.separatedChildren || 0,
      numberLivesLost: initialData?.numberLivesLost || 0,
      numberInjured: initialData?.numberInjured || 0,
      additionalPopulationDetails: initialData?.additionalPopulationDetails || ''
    }
  })

  
  // Load data on mount following knowledge base Option 3 pattern
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadAssessments(),
        loadDrafts()
      ]);
      
      // Initialize current user and GPS
      const initializeUserAndGPS = async () => {
        try {
          const user = await getCurrentUser()
          setCurrentUser(user)
          
          // Try to get GPS location
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
              () => {
                // Set default location
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
                maximumAge: 60000
              }
            )
          }
        } catch (error) {
          console.error('Error initializing user:', error)
        }
      }
      
      initializeUserAndGPS()
    };
    
    initialize();
  }, [loadAssessments, loadDrafts])

  
  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!form.formState.isDirty) return
    
    try {
      setIsAutoSaving(true)
      const currentValues = form.getValues()
      await saveDraft(currentValues)
      setLastSaved(new Date())
      form.reset(form.getValues()) // Mark as clean
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsAutoSaving(false)
    }
  }, [form, saveDraft])

  // Set up auto-save interval
  useEffect(() => {
    const interval = setInterval(autoSave, 30000) // Auto-save every 30 seconds
    return () => clearInterval(interval)
  }, [autoSave])

  // Calculate statistics
  const recentAssessmentsCount = recentAssessments?.length || 0
  const draftsCount = drafts.length

  // Calculate vulnerable groups percentage
  const calculateVulnerablePercentage = useMemo(() => {
    const totalPop = form.getValues('totalPopulation')
    if (totalPop === 0) return 0
    
    const vulnerable = 
      form.getValues('populationUnder5') +
      form.getValues('pregnantWomen') +
      form.getValues('lactatingMothers') +
      form.getValues('personWithDisability') +
      form.getValues('elderlyPersons')
    
    return Math.round((vulnerable / totalPop) * 100)
  }, [form.watch()])

  const criticalGapsCount = useMemo(() => {
    let count = 0
    const values = form.getValues()
    if (values.numberLivesLost > 0) count++
    if (values.numberInjured > 20) count++ // High injury threshold
    if (values.separatedChildren > 0) count++
    if (calculateVulnerablePercentage > 40) count++ // High vulnerable percentage
    return count
  }, [form.watch(), calculateVulnerablePercentage])

  // Calculate population density
  const populationDensity = useMemo(() => {
    const households = form.getValues('totalHouseholds')
    const population = form.getValues('totalPopulation')
    if (households === 0) return 0
    return Math.round(population / households)
  }, [form.watch()])

  // Get severity level for casualties
  const getSeverityLevel = useCallback((field: 'numberLivesLost' | 'numberInjured') => {
    const value = form.watch(field)
    
    if (field === 'numberLivesLost') {
      if (value === 0) return { level: 'none', color: 'default', text: 'No Lives Lost' }
      if (value <= 5) return { level: 'low', color: 'secondary', text: 'Low Casualties' }
      if (value <= 20) return { level: 'medium', color: 'default', text: 'Medium Casualties' }
      return { level: 'high', color: 'destructive', text: 'High Casualties' }
    } else {
      if (value === 0) return { level: 'none', color: 'default', text: 'No Injuries' }
      if (value <= 10) return { level: 'low', color: 'secondary', text: 'Low Injuries' }
      if (value <= 50) return { level: 'medium', color: 'default', text: 'Medium Injuries' }
      return { level: 'high', color: 'destructive', text: 'High Injuries' }
    }
  }, [form.watch])

  // Get population status
  const getPopulationStatus = useMemo(() => {
    const totalPop = form.getValues('totalPopulation')
    const vulnerablePercentage = calculateVulnerablePercentage
    const casualties = form.getValues('numberLivesLost')
    const injured = form.getValues('numberInjured')
    
    if (casualties > 20 || injured > 100) {
      return { 
        status: 'critical', 
        color: 'destructive', 
        text: 'Critical Emergency',
        description: 'High casualty count requiring immediate response'
      }
    } else if (casualties > 0 || vulnerablePercentage > 50) {
      return { 
        status: 'high', 
        color: 'destructive', 
        text: 'High Risk Population',
        description: 'Significant vulnerable population or casualties present'
      }
    } else if (vulnerablePercentage > 30) {
      return { 
        status: 'medium', 
        color: 'default', 
        text: 'Moderate Vulnerability',
        description: 'Moderate percentage of vulnerable groups'
      }
    } else if (totalPop > 0) {
      return { 
        status: 'stable', 
        color: 'default', 
        text: 'Stable Population',
        description: 'Population baseline established'
      }
    } else {
      return { 
        status: 'unknown', 
        color: 'secondary', 
        text: 'Population Unknown',
        description: 'Population data needed'
      }
    }
  }, [form.watch(), calculateVulnerablePercentage])

  // Gap analysis
  const getGapStatus = useCallback((field: keyof PopulationAssessmentFormData) => {
    const value = form.watch(field)
    const totalPop = form.getValues('totalPopulation')
    
    switch (field) {
      case 'numberLivesLost':
        return value > 0 ? 'gap_identified' : 'no_gap'
      case 'numberInjured':
        return value > 10 ? 'gap_identified' : 'no_gap'
      case 'separatedChildren':
        return value > 0 ? 'gap_identified' : 'no_gap'
      case 'populationUnder5':
        return totalPop > 0 && (value / totalPop) > 0.15 ? 'gap_identified' : 'no_gap'
      default:
        return 'neutral'
    }
  }, [form.watch])

  const gapStatuses = useMemo(() => ({
    numberLivesLost: getGapStatus('numberLivesLost'),
    numberInjured: getGapStatus('numberInjured'),
    separatedChildren: getGapStatus('separatedChildren'),
    populationUnder5: getGapStatus('populationUnder5')
  }), [form.watch(), getGapStatus])

  const handleLocationCapture = useCallback((lat: number, lng: number) => {
    form.setValue('gpsCoordinates', {
      latitude: lat,
      longitude: lng,
      timestamp: new Date(),
      captureMethod: 'GPS'
    })
  }, [form])

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
      const assessmentData = {
        rapidAssessmentType: 'POPULATION' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation,
        photos: photos,
        populationAssessment: {
          totalHouseholds: formData.totalHouseholds,
          totalPopulation: formData.totalPopulation,
          populationMale: formData.populationMale,
          populationFemale: formData.populationFemale,
          populationUnder5: formData.populationUnder5,
          pregnantWomen: formData.pregnantWomen,
          lactatingMothers: formData.lactatingMothers,
          personWithDisability: formData.personWithDisability,
          elderlyPersons: formData.elderlyPersons,
          separatedChildren: formData.separatedChildren,
          numberLivesLost: formData.numberLivesLost,
          numberInjured: formData.numberInjured,
          additionalPopulationDetails: formData.additionalPopulationDetails ? { notes: formData.additionalPopulationDetails } : undefined
        }
      }

      await createAssessment.mutateAsync(assessmentData)
      
      setSubmitMessage('Population assessment submitted successfully!')
      setSubmitMessageType('success')
      form.reset()
      setPhotos([])
      
      // Redirect to assessments list after 2 seconds
      setTimeout(() => {
        window.location.href = '/assessor/rapid-assessments'
      }, 2000)
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitMessage(error instanceof Error ? error.message : 'Failed to submit assessment. Please try again.')
      setSubmitMessageType('error')
    } finally {
      setIsFinalSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    await autoSave()
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'no_gap': return 'default'
      case 'gap_identified': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAssessmentsCount}</div>
            <p className="text-xs text-muted-foreground">Population assessments in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Save className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftsCount}</div>
            <p className="text-xs text-muted-foreground">Saved drafts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalGapsCount}</div>
            <p className="text-xs text-muted-foreground">Issues identified</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Population Assessment
          </CardTitle>
          <CardDescription>
            Document demographic information and population impact in the affected area
          </CardDescription>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {lastSaved && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {isAutoSaving && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Auto-saving...
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rapidAssessmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.value && field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Entity Search */}
              <FormField
                control={form.control}
                name="affectedEntityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected Entity</FormLabel>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search entities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                {entity.name} ({entity.type})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* GPS Location */}
              <div className="space-y-2">
                <FormLabel>GPS Location</FormLabel>
                <GPSCapture
                  onLocationCapture={handleLocationCapture}
                  initialLocation={form.getValues('gpsCoordinates') ? {
                    lat: form.getValues('gpsCoordinates')!.latitude,
                    lng: form.getValues('gpsCoordinates')!.longitude
                  } : undefined}
                />
              </div>

              {/* Media Attachments */}
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photos
                </FormLabel>
                <MediaField
                  onPhotosChange={setPhotos}
                  initialPhotos={photos}
                  maxPhotos={5}
                />
              </div>

              {/* Population Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Population Status</h4>
                    <Badge variant={getPopulationStatus.color as any}>
                      {getPopulationStatus.text}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{getPopulationStatus.description}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Vulnerable Groups</h4>
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{calculateVulnerablePercentage}%</div>
                  <p className="text-sm text-gray-600">of total population</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Population Density</h4>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{populationDensity}</div>
                  <p className="text-sm text-gray-600">persons per household</p>
                </div>
              </div>

              {/* Population Overview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Population Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="totalHouseholds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Households</FormLabel>
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
                    name="totalPopulation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Population</FormLabel>
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

                  <FormItem>
                    <FormLabel>Vulnerable Groups %</FormLabel>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-amber-500 rounded-full transition-all"
                          style={{ width: `${calculateVulnerablePercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{calculateVulnerablePercentage}%</span>
                    </div>
                    <FormDescription>
                      Percentage of vulnerable population (under 5, pregnant, elderly, disabled)
                    </FormDescription>
                  </FormItem>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="populationMale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Male Population</FormLabel>
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
                    name="populationFemale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Female Population</FormLabel>
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
              </div>

              {/* Vulnerable Groups */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Vulnerable Groups
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="populationUnder5"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Baby className="h-4 w-4" />
                          Children Under 5
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <div className="mt-2">
                          <Badge variant={getStatusVariant(gapStatuses.populationUnder5)}>
                            {gapStatuses.populationUnder5 === 'gap_identified' ? 'High Percentage' : 'Normal'}
                          </Badge>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pregnantWomen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pregnant Women</FormLabel>
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
                    name="lactatingMothers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lactating Mothers</FormLabel>
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
                    name="personWithDisability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persons with Disabilities</FormLabel>
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
                    name="elderlyPersons"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Elderly Persons (60+)</FormLabel>
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
                    name="separatedChildren"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Separated/Unaccompanied Children</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <div className="mt-2">
                          <Badge variant={getStatusVariant(gapStatuses.separatedChildren)}>
                            {gapStatuses.separatedChildren === 'gap_identified' ? 'Protection Issue' : 'None Identified'}
                          </Badge>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Casualties and Injuries */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Casualties and Injuries
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numberLivesLost"
                    render={({ field }) => {
                      const severity = getSeverityLevel('numberLivesLost')
                      return (
                        <FormItem>
                          <FormLabel className="flex items-center justify-between">
                            <span>Number of Lives Lost</span>
                            <Badge variant={severity.color as any}>
                              {severity.text}
                            </Badge>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className={severity.level === 'high' ? 'border-red-300' : ''}
                            />
                          </FormControl>
                          <div className="mt-2">
                            <Badge variant={getStatusVariant(gapStatuses.numberLivesLost)}>
                              {gapStatuses.numberLivesLost === 'gap_identified' ? 'Critical Response Needed' : 'No Lives Lost'}
                            </Badge>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="numberInjured"
                    render={({ field }) => {
                      const severity = getSeverityLevel('numberInjured')
                      return (
                        <FormItem>
                          <FormLabel className="flex items-center justify-between">
                            <span>Number of Injured</span>
                            <Badge variant={severity.color as any}>
                              {severity.text}
                            </Badge>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className={severity.level === 'high' ? 'border-red-300' : ''}
                            />
                          </FormControl>
                          <div className="mt-2">
                            <Badge variant={getStatusVariant(gapStatuses.numberInjured)}>
                              {gapStatuses.numberInjured === 'gap_identified' ? 'Medical Response Required' : 'Low Injuries'}
                            </Badge>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                </div>

                {(form.getValues('numberLivesLost') > 0 || form.getValues('numberInjured') > 0) && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Critical Situation:</strong> The reported casualties and injuries require immediate 
                      medical attention and humanitarian response. Please ensure this information is communicated 
                      to emergency response teams.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="additionalPopulationDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Population Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional population-related information..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include migration patterns, displacement details, or other relevant demographic information
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Auto-captured Information */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Auto-captured Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">User:</span> {user?.name || 'Unknown'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Date:</span> {new Date().toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">GPS:</span> 
                    {form.getValues('gpsCoordinates') 
                      ? `${form.getValues('gpsCoordinates').latitude.toFixed(6)}, ${form.getValues('gpsCoordinates').longitude.toFixed(6)}`
                      : 'Not captured'
                    }
                  </div>
                </div>
              </div>

              {/* Submit Message */}
              {submitMessage && (
                <Alert className={submitMessageType === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                  <AlertDescription className={submitMessageType === 'error' ? 'text-red-800' : 'text-green-800'}>
                    {submitMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Form Actions */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isAutoSaving}
                >
                  {isAutoSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </Button>
                
                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isLoading || isFinalSubmitting}
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