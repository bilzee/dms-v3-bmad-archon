'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { Users, AlertTriangle, Heart, Baby } from 'lucide-react'

// Form validation schema
const populationAssessmentSchema = z.object({
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
  onSubmit: (data: PopulationAssessmentFormData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<PopulationAssessmentFormData>
  isLoading?: boolean
  entities?: Array<{ id: string; name: string; type: string }>
}

export function PopulationAssessmentForm({ 
  onSubmit, 
  onCancel, 
  initialData,
  isLoading = false,
  entities = []
}: PopulationAssessmentFormProps) {
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || [])

  const form = useForm<PopulationAssessmentFormData>({
    resolver: zodResolver(populationAssessmentSchema),
    defaultValues: {
      rapidAssessmentDate: initialData?.rapidAssessmentDate || new Date(),
      affectedEntityId: initialData?.affectedEntityId || '',
      assessorName: initialData?.assessorName || '',
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

  const handleLocationCapture = (lat: number, lng: number) => {
    form.setValue('gpsCoordinates', {
      latitude: lat,
      longitude: lng,
      timestamp: new Date(),
      captureMethod: 'GPS'
    })
  }

  const handleFormSubmit = async (data: PopulationAssessmentFormData) => {
    try {
      await onSubmit({
        ...data,
        photos
      })
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Calculate vulnerable groups percentage
  const calculateVulnerablePercentage = () => {
    const totalPop = form.getValues('totalPopulation')
    if (totalPop === 0) return 0
    
    const vulnerable = 
      form.getValues('populationUnder5') +
      form.getValues('pregnantWomen') +
      form.getValues('lactatingMothers') +
      form.getValues('personWithDisability') +
      form.getValues('elderlyPersons')
    
    return Math.round((vulnerable / totalPop) * 100)
  }

  // Get severity level for casualties
  const getSeverityLevel = (field: 'numberLivesLost' | 'numberInjured') => {
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
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Population Assessment
          </CardTitle>
          <CardDescription>
            Document demographic information and population impact in the affected area
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
                          style={{ width: `${calculateVulnerablePercentage()}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{calculateVulnerablePercentage()}%</span>
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