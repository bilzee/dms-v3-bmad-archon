'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Shield, AlertTriangle, Heart, Users } from 'lucide-react'

// Form validation schema
const securityAssessmentSchema = z.object({
  // Base assessment fields
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
  onSubmit: (data: SecurityAssessmentFormData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<SecurityAssessmentFormData>
  isLoading?: boolean
  entities?: Array<{ id: string; name: string; type: string }>
}

export function SecurityAssessmentForm({ 
  onSubmit, 
  onCancel, 
  initialData,
  isLoading = false,
  entities = []
}: SecurityAssessmentFormProps) {
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || [])

  const form = useForm<SecurityAssessmentFormData>({
    resolver: zodResolver(securityAssessmentSchema),
    defaultValues: {
      rapidAssessmentDate: initialData?.rapidAssessmentDate || new Date(),
      affectedEntityId: initialData?.affectedEntityId || '',
      assessorName: initialData?.assessorName || '',
      gpsCoordinates: initialData?.gpsCoordinates,
      gbvCasesReported: initialData?.gbvCasesReported || false,
      hasProtectionReportingMechanism: initialData?.hasProtectionReportingMechanism || false,
      vulnerableGroupsHaveAccess: initialData?.vulnerableGroupsHaveAccess || false,
      additionalSecurityDetails: initialData?.additionalSecurityDetails || ''
    }
  })

  const handleLocationCapture = (lat: number, lng: number) => {
    form.setValue('gpsCoordinates', {
      latitude: lat,
      longitude: lng,
      timestamp: new Date(),
      captureMethod: 'GPS'
    })
  }

  const handleFormSubmit = async (data: SecurityAssessmentFormData) => {
    try {
      await onSubmit({
        ...data,
        photos
      })
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Calculate protection status
  const getProtectionStatus = () => {
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
  }

  // Get gap status for key security indicators
  const getGapStatus = (field: keyof SecurityAssessmentFormData) => {
    const value = form.watch(field)
    
    switch (field) {
      case 'gbvCasesReported':
        return value ? 'danger' : 'success'
      case 'hasProtectionReportingMechanism':
        return value ? 'success' : 'danger'
      case 'vulnerableGroupsHaveAccess':
        return value ? 'success' : 'warning'
      default:
        return 'neutral'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default'
      case 'warning': return 'secondary'
      case 'danger': return 'destructive'
      default: return 'outline'
    }
  }

  const protectionStatus = getProtectionStatus()

  // Calculate risk level
  const getRiskLevel = () => {
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
  }

  const riskLevel = getRiskLevel()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Assessment
          </CardTitle>
          <CardDescription>
            Assess protection, safety, and security conditions in the affected area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              
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

              <FormField
                control={form.control}
                name="affectedEntityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected Entity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select affected entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name} ({entity.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <FormLabel>Photos</FormLabel>
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
                    <Badge variant={protectionStatus.color as any}>
                      {protectionStatus.text}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{protectionStatus.description}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Risk Level</h4>
                    <Badge variant={riskLevel.color as any}>
                      {riskLevel.text}
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
                            <Badge variant={getStatusVariant(getGapStatus('gbvCasesReported'))}>
                              {getGapStatus('gbvCasesReported') === 'success' ? 'No Cases Reported' : 'Cases Reported'}
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
                            <Badge variant={getStatusVariant(getGapStatus('hasProtectionReportingMechanism'))}>
                              {getGapStatus('hasProtectionReportingMechanism') === 'success' ? 'Mechanism Available' : 'No Mechanism'}
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
                          <Badge variant={getStatusVariant(getGapStatus('vulnerableGroupsHaveAccess'))}>
                            {getGapStatus('vulnerableGroupsHaveAccess') === 'success' ? 'Access Available' : 'Access Barriers'}
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

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Assessment'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}