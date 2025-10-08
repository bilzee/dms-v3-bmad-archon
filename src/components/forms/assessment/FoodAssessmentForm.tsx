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
import { FOOD_SOURCE_OPTIONS } from '@/types/rapid-assessment'
import { Utensils, AlertTriangle, TrendingUp } from 'lucide-react'

// Form validation schema
const foodAssessmentSchema = z.object({
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
  
  // Food assessment specific fields
  foodSource: z.array(z.enum(FOOD_SOURCE_OPTIONS)).min(1, 'At least one food source is required'),
  availableFoodDurationDays: z.number().int().min(0),
  additionalFoodRequiredPersons: z.number().int().min(0),
  additionalFoodRequiredHouseholds: z.number().int().min(0),
  additionalFoodDetails: z.string().optional()
})

type FoodAssessmentFormData = z.infer<typeof foodAssessmentSchema>

interface FoodAssessmentFormProps {
  onSubmit: (data: FoodAssessmentFormData) => Promise<void>
  onCancel: () => void
  initialData?: Partial<FoodAssessmentFormData>
  isLoading?: boolean
  entities?: Array<{ id: string; name: string; type: string }>
}

export function FoodAssessmentForm({ 
  onSubmit, 
  onCancel, 
  initialData,
  isLoading = false,
  entities = []
}: FoodAssessmentFormProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>(
    initialData?.foodSource || []
  )
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || [])

  const form = useForm<FoodAssessmentFormData>({
    resolver: zodResolver(foodAssessmentSchema),
    defaultValues: {
      rapidAssessmentDate: initialData?.rapidAssessmentDate || new Date(),
      affectedEntityId: initialData?.affectedEntityId || '',
      assessorName: initialData?.assessorName || '',
      gpsCoordinates: initialData?.gpsCoordinates,
      foodSource: initialData?.foodSource || [],
      availableFoodDurationDays: initialData?.availableFoodDurationDays || 0,
      additionalFoodRequiredPersons: initialData?.additionalFoodRequiredPersons || 0,
      additionalFoodRequiredHouseholds: initialData?.additionalFoodRequiredHouseholds || 0,
      additionalFoodDetails: initialData?.additionalFoodDetails || ''
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
    form.setValue('foodSource', updatedSources as any)
  }

  const handleFormSubmit = async (data: FoodAssessmentFormData) => {
    try {
      await onSubmit({
        ...data,
        photos
      })
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Calculate food security status
  const getFoodSecurityStatus = () => {
    const days = form.getValues('availableFoodDurationDays')
    
    if (days === 0) {
      return { 
        status: 'critical', 
        color: 'destructive', 
        text: 'Critical - No Food Available',
        description: 'Immediate food assistance required'
      }
    } else if (days < 1) {
      return { 
        status: 'critical', 
        color: 'destructive', 
        text: 'Critical - Less than 1 day',
        description: 'Emergency food assistance needed'
      }
    } else if (days < 3) {
      return { 
        status: 'high', 
        color: 'destructive', 
        text: 'High Risk - Less than 3 days',
        description: 'Urgent food assistance needed'
      }
    } else if (days < 7) {
      return { 
        status: 'medium', 
        color: 'default', 
        text: 'Medium Risk - Less than 1 week',
        description: 'Food assistance recommended'
      }
    } else {
      return { 
        status: 'stable', 
        color: 'default', 
        text: 'Stable - More than 1 week',
        description: 'Food situation relatively stable'
      }
    }
  }

  const foodSecurity = getFoodSecurityStatus()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Food Security Assessment
          </CardTitle>
          <CardDescription>
            Assess food availability, access, and needs in the affected area
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

              {/* Food Availability Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Food Availability Assessment</h3>
                
                {/* Food Security Status */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Food Security Status</h4>
                    <Badge variant={foodSecurity.color as any}>
                      {foodSecurity.text}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{foodSecurity.description}</p>
                  
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
                            className={foodSecurity.status === 'critical' ? 'border-red-300' : ''}
                          />
                        </FormControl>
                        <FormDescription>
                          How many days will current food supplies last?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Food Sources */}
                <div className="space-y-2">
                  <FormLabel>Current Food Sources</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FOOD_SOURCE_OPTIONS.map((source) => (
                      <FormField
                        key={source}
                        control={form.control}
                        name="foodSource"
                        render={() => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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

              {/* Food Needs Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Food Needs Assessment
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          Number of additional people needing food assistance
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
                          Number of additional households needing food assistance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Critical Food Needs Alert */}
                {(form.getValues('additionalFoodRequiredPersons') > 0 || 
                  form.getValues('availableFoodDurationDays') < 3) && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Food Assistance Required:</strong> 
                      {form.getValues('availableFoodDurationDays') < 3 && (
                        <> Current food supplies will last less than 3 days. </>
                      )}
                      {form.getValues('additionalFoodRequiredPersons') > 0 && (
                        <> {form.getValues('additionalFoodRequiredPersons')} persons require additional food assistance. </>
                      )}
                      Immediate coordination with food distribution partners is recommended.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

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
                      or specific dietary requirements
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