'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { useSecurityAssessment } from '@/hooks/useSecurityAssessment'
import { useEntityStore, Entity } from '@/stores/entity.store'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { 
  Shield, AlertTriangle, Heart, Users, Activity, Clock, MapPin, 
  FileText, Save, CheckCircle, Loader2, Camera 
} from 'lucide-react'

// Form validation schema
const securityAssessmentSchema = z.object({
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
  
  // Security assessment specific fields
  gbvCasesReported: z.boolean(),
  hasProtectionReportingMechanism: z.boolean(),
  vulnerableGroupsHaveAccess: z.boolean(),
  additionalSecurityDetails: z.string().optional()
})

type SecurityAssessmentFormData = z.infer<typeof securityAssessmentSchema>

interface SecurityAssessmentFormProps {
  onCancel?: () => void
  initialData?: Partial<SecurityAssessmentFormData>
  isLoading?: boolean
}

export function SecurityAssessmentForm({ 
  onCancel, 
  initialData,
  isLoading = false
}: SecurityAssessmentFormProps) {
  const { user } = useAuth()
  const { 
    recentAssessments, 
    drafts, 
    loadAssessments, 
    loadDrafts, 
    saveDraft, 
    deleteDraft 
  } = useSecurityAssessment()
  
  const { entities, searchEntities, fetchEntities } = useEntityStore()
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || [])
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredEntities, setFilteredEntities] = useState(entities)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [gpsLocation, setGpsLocation] = useState<any>(null)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitMessageType, setSubmitMessageType] = useState<'success' | 'error'>('success')

  const form = useForm<SecurityAssessmentFormData>({
    resolver: zodResolver(securityAssessmentSchema),
    defaultValues: {
      rapidAssessmentDate: initialData?.rapidAssessmentDate || new Date(),
      affectedEntityId: initialData?.affectedEntityId || '',
      assessorName: initialData?.assessorName || user?.name || '',
      gpsCoordinates: initialData?.gpsCoordinates,
      gbvCasesReported: initialData?.gbvCasesReported || false,
      hasProtectionReportingMechanism: initialData?.hasProtectionReportingMechanism || false,
      vulnerableGroupsHaveAccess: initialData?.vulnerableGroupsHaveAccess || false,
      additionalSecurityDetails: initialData?.additionalSecurityDetails || ''
    }
  })

  // Define loadEntities function following knowledge base best practices
  const loadEntities = useCallback(async () => {
    try {
      await fetchEntities()
    } catch (error) {
      console.error('Error loading entities:', error)
    }
  }, [fetchEntities])

  // Load data on mount following knowledge base Option 3 pattern
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadAssessments(),
        loadDrafts(), 
        loadEntities()
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
                // Fallback to manual location or set null
                setGpsLocation(null)
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
  }, [loadAssessments, loadDrafts, loadEntities])

  // Update filtered entities based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = entities.filter(entity => 
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEntities(filtered)
    } else {
      setFilteredEntities(entities)
    }
  }, [searchTerm, entities])

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
  const recentAssessmentsCount = recentAssessments.length
  const draftsCount = drafts.length
  const criticalGapsCount = useMemo(() => {
    let count = 0
    const values = form.getValues()
    if (values.gbvCasesReported) count++
    if (!values.hasProtectionReportingMechanism) count++
    if (!values.vulnerableGroupsHaveAccess) count++
    return count
  }, [form.watch()])

  // Calculate protection status
  const getProtectionStatus = useMemo(() => {
    const gbvReported = form.getValues('gbvCasesReported')
    const hasReporting = form.getValues('hasProtectionReportingMechanism')
    const vulnerableAccess = form.getValues('vulnerableGroupsHaveAccess')
    
    if (gbvReported && !hasReporting) {
      return { 
        status: 'critical', 
        color: 'destructive', 
        text: 'Critical Protection Gap',
        description: 'GBV cases reported but no reporting mechanism'
      }
    } else if (gbvReported) {
      return { 
        status: 'high', 
        color: 'destructive', 
        text: 'High Protection Risk',
        description: 'GBV cases reported - urgent response needed'
      }
    } else if (!hasReporting) {
      return { 
        status: 'medium', 
        color: 'default', 
        text: 'Protection Mechanism Missing',
        description: 'No GBV reporting mechanism available'
      }
    } else if (!vulnerableAccess) {
      return { 
        status: 'concerning', 
        color: 'default', 
        text: 'Access Concerns',
        description: 'Vulnerable groups lack access to services'
      }
    } else {
      return { 
        status: 'adequate', 
        color: 'default', 
        text: 'Protection Status Adequate',
        description: 'Protection mechanisms in place and accessible'
      }
    }
  }, [form.watch()])

  // Get gap status for key security indicators
  const getGapStatus = useCallback((field: keyof SecurityAssessmentFormData) => {
    const value = form.watch(field)
    
    switch (field) {
      case 'gbvCasesReported':
        return value ? 'gap_identified' : 'no_gap'
      case 'hasProtectionReportingMechanism':
        return value ? 'no_gap' : 'gap_identified'
      case 'vulnerableGroupsHaveAccess':
        return value ? 'no_gap' : 'gap_identified'
      default:
        return 'neutral'
    }
  }, [form.watch])

  const gapStatuses = useMemo(() => ({
    gbvCasesReported: getGapStatus('gbvCasesReported'),
    hasProtectionReportingMechanism: getGapStatus('hasProtectionReportingMechanism'),
    vulnerableGroupsHaveAccess: getGapStatus('vulnerableGroupsHaveAccess')
  }), [form.watch(), getGapStatus])

  // Calculate risk level
  const getRiskLevel = useMemo(() => {
    const gbvReported = form.getValues('gbvCasesReported')
    const hasReporting = form.getValues('hasProtectionReportingMechanism')
    const vulnerableAccess = form.getValues('vulnerableGroupsHaveAccess')
    
    let riskScore = 0
    
    if (gbvReported) riskScore += 3
    if (!hasReporting) riskScore += 2
    if (!vulnerableAccess) riskScore += 1
    
    if (riskScore >= 4) return { level: 'high', color: 'destructive', text: 'High Risk' }
    if (riskScore >= 2) return { level: 'medium', color: 'default', text: 'Medium Risk' }
    return { level: 'low', color: 'default', text: 'Low Risk' }
  }, [form.watch()])

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
        rapidAssessmentType: 'SECURITY' as any,
        rapidAssessmentDate: new Date(),
        affectedEntityId: formData.affectedEntityId,
        assessorName: currentUser.name,
        gpsCoordinates: gpsLocation,
        photos: photos,
        securityAssessment: {
          gbvCasesReported: formData.gbvCasesReported,
          hasProtectionReportingMechanism: formData.hasProtectionReportingMechanism,
          vulnerableGroupsHaveAccess: formData.vulnerableGroupsHaveAccess,
          additionalSecurityDetails: formData.additionalSecurityDetails ? { notes: formData.additionalSecurityDetails } : undefined
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
        setSubmitMessage('Security assessment submitted successfully!')
        setSubmitMessageType('success')
        form.reset()
        setPhotos([])
        
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
      setSubmitMessage('Failed to submit assessment. Please try again.')
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

  const getStatusText = (status: string, field: string) => {
    switch (field) {
      case 'gbvCasesReported':
        return status === 'no_gap' ? 'No Cases Reported' : 'Cases Reported'
      case 'hasProtectionReportingMechanism':
        return status === 'no_gap' ? 'Mechanism Available' : 'No Mechanism'
      case 'vulnerableGroupsHaveAccess':
        return status === 'no_gap' ? 'Access Available' : 'Access Barriers'
      default:
        return status
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
            <p className="text-xs text-muted-foreground">Security assessments in last 30 days</p>
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
            <Shield className="h-5 w-5" />
            Security Assessment
          </CardTitle>
          <CardDescription>
            Assess protection, safety, and security conditions in the affected area
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
                          {filteredEntities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name} ({entity.type})
                            </SelectItem>
                          ))}
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

              {/* Protection Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Protection Status</h4>
                    <Badge variant={getProtectionStatus.color as any}>
                      {getProtectionStatus.text}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{getProtectionStatus.description}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Risk Level</h4>
                    <Badge variant={getRiskLevel.color as any}>
                      {getRiskLevel.text}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Overall security and protection risk assessment
                  </p>
                </div>
              </div>

              {/* GBV and Protection Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Gender-Based Violence (GBV) Assessment</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="gbvCasesReported"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            GBV Cases Reported
                          </FormLabel>
                          <FormDescription>
                            Have there been reports of gender-based violence?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge variant={getStatusVariant(gapStatuses.gbvCasesReported)}>
                              {getStatusText(gapStatuses.gbvCasesReported, 'gbvCasesReported')}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasProtectionReportingMechanism"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Protection Reporting Mechanism</FormLabel>
                          <FormDescription>
                            Is there a functioning mechanism for reporting protection concerns?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge variant={getStatusVariant(gapStatuses.hasProtectionReportingMechanism)}>
                              {getStatusText(gapStatuses.hasProtectionReportingMechanism, 'hasProtectionReportingMechanism')}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Vulnerable Groups Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Vulnerable Groups Assessment
                </h3>
                
                <FormField
                  control={form.control}
                  name="vulnerableGroupsHaveAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Vulnerable Groups Access
                        </FormLabel>
                        <FormDescription>
                          Do vulnerable groups have access to protection and assistance services?
                        </FormDescription>
                        <div className="mt-2">
                          <Badge variant={getStatusVariant(gapStatuses.vulnerableGroupsHaveAccess)}>
                            {getStatusText(gapStatuses.vulnerableGroupsHaveAccess, 'vulnerableGroupsHaveAccess')}
                          </Badge>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Critical Security Issues Alert */}
              {(form.getValues('gbvCasesReported') || 
                !form.getValues('hasProtectionReportingMechanism') || 
                !form.getValues('vulnerableGroupsHaveAccess')) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Protection Issues Identified:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {form.getValues('gbvCasesReported') && (
                        <li>GBV cases reported - immediate protection response required</li>
                      )}
                      {!form.getValues('hasProtectionReportingMechanism') && (
                        <li>No protection reporting mechanism available</li>
                      )}
                      {!form.getValues('vulnerableGroupsHaveAccess') && (
                        <li>Vulnerable groups face access barriers to services</li>
                      )}
                    </ul>
                    Immediate coordination with protection actors and GBV specialists is essential.
                  </AlertDescription>
                </Alert>
              )}

              {/* Additional Details */}
              <FormField
                control={form.control}
                name="additionalSecurityDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Security Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional security-related information..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include information about general security situation, presence of security forces, 
                      safety concerns, or specific protection needs
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