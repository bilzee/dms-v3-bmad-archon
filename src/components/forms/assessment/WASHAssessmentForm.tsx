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
import { WATER_SOURCE_OPTIONS } from '@/types/rapid-assessment'
import { Droplets, AlertTriangle, Users } from 'lucide-react'

// Form validation schema
const washAssessmentSchema = z.object({
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
  
  // WASH assessment specific fields
  waterSource: z.array(z.enum(WATER_SOURCE_OPTIONS)).min(1, 'At least one water source is required'),
  isWaterSufficient: z.boolean(),
  functionalLatrinesAvailable: z.number().int().min(0),
  areLatrinesSufficient: z.boolean(),
  hasOpenDefecationConcerns: z.boolean(),
  additionalWashDetails: z.string().optional()
})

type WASHAssessmentFormData = z.infer<typeof washAssessmentSchema>

interface WASHAssessmentFormProps {
  onSubmit: (data: WASHAssessmentFormData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<WASHAssessmentFormData>
  isLoading?: boolean
  entities?: Array<{ id: string; name: string; type: string }>
}

export function WASHAssessmentForm({ 
  onSubmit, 
  onCancel, 
  initialData,
  isLoading = false,
  entities = []
}: WASHAssessmentFormProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>(
    initialData?.waterSource || []
  )
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || [])

  const form = useForm<WASHAssessmentFormData>({
    resolver: zodResolver(washAssessmentSchema),
    defaultValues: {
      rapidAssessmentDate: initialData?.rapidAssessmentDate || new Date(),
      affectedEntityId: initialData?.affectedEntityId || '',
      assessorName: initialData?.assessorName || '',
      gpsCoordinates: initialData?.gpsCoordinates,
      waterSource: initialData?.waterSource || [],
      isWaterSufficient: initialData?.isWaterSufficient || false,
      functionalLatrinesAvailable: initialData?.functionalLatrinesAvailable || 0,
      areLatrinesSufficient: initialData?.areLatrinesSufficient || false,
      hasOpenDefecationConcerns: initialData?.hasOpenDefecationConcerns || false,
      additionalWashDetails: initialData?.additionalWashDetails || ''
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

  const handleSourceToggle = (source: string, checked: boolean) => {
    const updatedSources = checked
      ? [...selectedSources, source]
      : selectedSources.filter(s => s !== source)
    
    setSelectedSources(updatedSources)
    form.setValue('waterSource', updatedSources as any)
  }

  const handleFormSubmit = async (data: WASHAssessmentFormData) => {
    try {
      await onSubmit({
        ...data,
        photos
      })
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Calculate latrine coverage
  const calculateLatrineCoverage = () => {
    const latrines = form.getValues('functionalLatrinesAvailable')
    const population = 1000 // This would ideally come from population data
    
    if (latrines === 0) return { coverage: 0, status: 'critical', text: 'No Latrines' }
    
    const coverage = Math.round((latrines * 50 / population) * 100) // Assuming 50 people per latrine
    
    if (coverage < 20) {
      return { coverage, status: 'critical', text: 'Critical Coverage' }
    } else if (coverage < 50) {
      return { coverage, status: 'inadequate', text: 'Inadequate Coverage' }
    } else if (coverage < 75) {
      return { coverage, status: 'acceptable', text: 'Acceptable Coverage' }
    } else {
      return { coverage, status: 'good', text: 'Good Coverage' }
    }
  }

  const latrineCoverage = calculateLatrineCoverage()

  // Get gap status for key WASH indicators
  const getWASHStatus = (field: keyof WASHAssessmentFormData) => {
    const value = form.watch(field)
    
    switch (field) {
      case 'isWaterSufficient':
        return value ? 'success' : 'danger'
      case 'areLatrinesSufficient':
        return value ? 'success' : 'danger'
      case 'hasOpenDefecationConcerns':
        return value ? 'danger' : 'success'
      default:
        return 'neutral'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default'
      case 'danger': return 'destructive'
      case 'warning': return 'secondary'
      default: return 'outline'
    }
  }

  const hasCriticalGaps = () => {
    return !form.getValues('isWaterSufficient') || 
           !form.getValues('areLatrinesSufficient') || 
           form.getValues('hasOpenDefecationConcerns')
  }

  return (
    <div className="space-y-6">
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
                            <Badge variant={getStatusVariant(getWASHStatus('isWaterSufficient'))}>
                              {getWASHStatus('isWaterSufficient') === 'success' ? 'No Gap' : 'Critical Gap'}
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
                            <Badge variant={getStatusVariant(getWASHStatus('hasOpenDefecationConcerns'))}>
                              {getWASHStatus('hasOpenDefecationConcerns') === 'success' ? 'No Concerns' : 'Health Risk'}
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
                            <Badge variant={getStatusVariant(getWASHStatus('areLatrinesSufficient'))}>
                              {getWASHStatus('areLatrinesSufficient') === 'success' ? 'Adequate' : 'Insufficient'}
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