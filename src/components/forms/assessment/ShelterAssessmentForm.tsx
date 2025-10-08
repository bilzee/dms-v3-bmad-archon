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
import { SHELTER_TYPE_OPTIONS } from '@/types/rapid-assessment'
import { Home, AlertTriangle, Cloud, Users } from 'lucide-react'

// Form validation schema
const shelterAssessmentSchema = z.object({
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
  
  // Shelter assessment specific fields
  areSheltersSufficient: z.boolean(),
  shelterTypes: z.array(z.enum(SHELTER_TYPE_OPTIONS)),
  requiredShelterType: z.array(z.enum(SHELTER_TYPE_OPTIONS)),
  numberSheltersRequired: z.number().int().min(0),
  areOvercrowded: z.boolean(),
  provideWeatherProtection: z.boolean(),
  additionalShelterDetails: z.string().optional()
})

type ShelterAssessmentFormData = z.infer<typeof shelterAssessmentSchema>

interface ShelterAssessmentFormProps {
  onSubmit: (data: ShelterAssessmentFormData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<ShelterAssessmentFormData>
  isLoading?: boolean
  entities?: Array<{ id: string; name: string; type: string }>
}

export function ShelterAssessmentForm({ 
  onSubmit, 
  onCancel, 
  initialData,
  isLoading = false,
  entities = []
}: ShelterAssessmentFormProps) {
  const [currentShelterTypes, setCurrentShelterTypes] = useState<string[]>(
    initialData?.shelterTypes || []
  )
  const [requiredShelterTypes, setRequiredShelterTypes] = useState<string[]>(
    initialData?.requiredShelterType || []
  )
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || [])

  const form = useForm<ShelterAssessmentFormData>({
    resolver: zodResolver(shelterAssessmentSchema),
    defaultValues: {
      rapidAssessmentDate: initialData?.rapidAssessmentDate || new Date(),
      affectedEntityId: initialData?.affectedEntityId || '',
      assessorName: initialData?.assessorName || '',
      gpsCoordinates: initialData?.gpsCoordinates,
      areSheltersSufficient: initialData?.areSheltersSufficient || false,
      shelterTypes: initialData?.shelterTypes || [],
      requiredShelterType: initialData?.requiredShelterType || [],
      numberSheltersRequired: initialData?.numberSheltersRequired || 0,
      areOvercrowded: initialData?.areOvercrowded || false,
      provideWeatherProtection: initialData?.provideWeatherProtection || false,
      additionalShelterDetails: initialData?.additionalShelterDetails || ''
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

  const handleShelterTypeToggle = (shelterType: string, checked: boolean, isRequired: boolean = false) => {
    if (isRequired) {
      const updatedTypes = checked
        ? [...requiredShelterTypes, shelterType]
        : requiredShelterTypes.filter(t => t !== shelterType)
      
      setRequiredShelterTypes(updatedTypes)
      form.setValue('requiredShelterType', updatedTypes as any)
    } else {
      const updatedTypes = checked
        ? [...currentShelterTypes, shelterType]
        : currentShelterTypes.filter(t => t !== shelterType)
      
      setCurrentShelterTypes(updatedTypes)
      form.setValue('shelterTypes', updatedTypes as any)
    }
  }

  const handleFormSubmit = async (data: ShelterAssessmentFormData) => {
    try {
      await onSubmit({
        ...data,
        photos
      })
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Get shelter status
  const getShelterStatus = () => {
    const sufficient = form.getValues('areSheltersSufficient')
    const overcrowded = form.getValues('areOvercrowded')
    const weatherProtection = form.getValues('provideWeatherProtection')
    const numberNeeded = form.getValues('numberSheltersRequired')
    
    if (!sufficient && numberNeeded > 0) {
      return { 
        status: 'critical', 
        color: 'destructive', 
        text: 'Critical Shelter Shortage',
        description: `${numberNeeded} additional shelters needed`
      }
    } else if (!sufficient) {
      return { 
        status: 'inadequate', 
        color: 'secondary', 
        text: 'Inadequate Shelter',
        description: 'Shelter capacity insufficient'
      }
    } else if (overcrowded) {
      return { 
        status: 'concerning', 
        color: 'default', 
        text: 'Overcrowding Concerns',
        description: 'Shelters available but overcrowded'
      }
    } else if (!weatherProtection) {
      return { 
        status: 'improvement', 
        color: 'default', 
        text: 'Weather Protection Needed',
        description: 'Shelters adequate but need weather protection'
      }
    } else {
      return { 
        status: 'adequate', 
        color: 'default', 
        text: 'Adequate Shelter',
        description: 'Shelter needs being met'
      }
    }
  }

  // Get gap status for key shelter indicators
  const getGapStatus = (field: keyof ShelterAssessmentFormData) => {
    const value = form.watch(field)
    
    switch (field) {
      case 'areSheltersSufficient':
        return value ? 'success' : 'danger'
      case 'provideWeatherProtection':
        return value ? 'success' : 'warning'
      case 'areOvercrowded':
        return value ? 'warning' : 'success'
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

  const shelterStatus = getShelterStatus()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Shelter Assessment
          </CardTitle>
          <CardDescription>
            Assess shelter conditions, capacity, and needs in the affected area
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

              {/* Shelter Status Overview */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Overall Shelter Status</h4>
                  <Badge variant={shelterStatus.color as any}>
                    {shelterStatus.text}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{shelterStatus.description}</p>
              </div>

              {/* Shelter Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Shelter Assessment</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="areSheltersSufficient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Shelters Sufficient</FormLabel>
                          <FormDescription>
                            Are current shelters sufficient for the affected population?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge variant={getStatusVariant(getGapStatus('areSheltersSufficient'))}>
                              {getGapStatus('areSheltersSufficient') === 'success' ? 'No Gap' : 'Critical Gap'}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="areOvercrowded"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Overcrowding Issues</FormLabel>
                          <FormDescription>
                            Are existing shelters overcrowded?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge variant={getStatusVariant(getGapStatus('areOvercrowded'))}>
                              {getGapStatus('areOvercrowded') === 'success' ? 'No Overcrowding' : 'Overcrowded'}
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
                    name="provideWeatherProtection"
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
                            <Cloud className="h-4 w-4" />
                            Weather Protection
                          </FormLabel>
                          <FormDescription>
                            Do shelters provide adequate weather protection?
                          </FormDescription>
                          <div className="mt-2">
                            <Badge variant={getStatusVariant(getGapStatus('provideWeatherProtection'))}>
                              {getGapStatus('provideWeatherProtection') === 'success' ? 'Protected' : 'Vulnerable'}
                            </Badge>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numberSheltersRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Shelters Required</FormLabel>
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
                          Number of additional shelters needed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Current Shelter Types */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Shelter Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SHELTER_TYPE_OPTIONS.map((shelterType) => (
                    <FormField
                      key={shelterType}
                      control={form.control}
                      name="shelterTypes"
                      render={() => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox
                              checked={currentShelterTypes.includes(shelterType)}
                              onCheckedChange={(checked) => 
                                handleShelterTypeToggle(shelterType, checked as boolean, false)
                              }
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {shelterType}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </div>

              {/* Required Shelter Types */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Required Shelter Types
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SHELTER_TYPE_OPTIONS.map((shelterType) => (
                    <FormField
                      key={`required-${shelterType}`}
                      control={form.control}
                      name="requiredShelterType"
                      render={() => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox
                              checked={requiredShelterTypes.includes(shelterType)}
                              onCheckedChange={(checked) => 
                                handleShelterTypeToggle(shelterType, checked as boolean, true)
                              }
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {shelterType}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormDescription>
                  Select the types of shelters that are urgently needed
                </FormDescription>
                <FormMessage />
              </div>

              {/* Critical Shelter Needs Alert */}
              {(!form.getValues('areSheltersSufficient') || 
                form.getValues('areOvercrowded') || 
                !form.getValues('provideWeatherProtection')) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Shelter Issues Identified:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {!form.getValues('areSheltersSufficient') && (
                        <li>Insufficient shelter capacity - {form.getValues('numberSheltersRequired')} additional shelters needed</li>
                      )}
                      {form.getValues('areOvercrowded') && <li>Existing shelters are overcrowded</li>}
                      {!form.getValues('provideWeatherProtection') && <li>Shelters don't provide adequate weather protection</li>}
                    </ul>
                    Immediate shelter assistance is required to ensure safety and protection from elements.
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
                      Include information about shelter conditions, materials, accessibility, 
                      or specific shelter challenges
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