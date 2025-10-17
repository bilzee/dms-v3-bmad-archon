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
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { EntitySelector } from '@/components/shared/EntitySelector'
import { FoodAssessmentFormProps, FoodAssessmentInput } from '@/types/rapid-assessment'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { cn } from '@/lib/utils'
import { Utensils, AlertTriangle, Package, Clock } from 'lucide-react'

const FoodAssessmentSchema = z.object({
  isFoodSufficient: z.boolean(),
  hasRegularMealAccess: z.boolean(),
  hasInfantNutrition: z.boolean(),
  foodSource: z.array(z.string()).default([]),
  availableFoodDurationDays: z.number().int().min(0),
  additionalFoodRequiredPersons: z.number().int().min(0),
  additionalFoodRequiredHouseholds: z.number().int().min(0),
  additionalFoodDetails: z.string().optional()
})

type FormData = z.infer<typeof FoodAssessmentSchema>

interface FoodSourceOption {
  id: string
  label: string
  description: string
}

const foodSourceOptions: FoodSourceOption[] = [
  {
    id: 'Government kitchen',
    label: 'Government Kitchen',
    description: 'Government-supported food distribution'
  },
  {
    id: 'Humanitarian Partners',
    label: 'Humanitarian Partners',
    description: 'NGO and international aid organizations'
  },
  {
    id: 'Community',
    label: 'Community Support',
    description: 'Community-based food sharing initiatives'
  },
  {
    id: 'Individuals',
    label: 'Individual Resources',
    description: 'Personal food stocks and resources'
  },
  {
    id: 'Other',
    label: 'Other Sources',
    description: 'Other food sources not listed above'
  }
]

export function FoodAssessmentForm({ 
  entityId, 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false 
}: FoodAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>(initialData?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(FoodAssessmentSchema),
    defaultValues: {
      isFoodSufficient: initialData?.isFoodSufficient || false,
      hasRegularMealAccess: initialData?.hasRegularMealAccess || false,
      hasInfantNutrition: initialData?.hasInfantNutrition || false,
      foodSource: initialData?.foodSource || [],
      availableFoodDurationDays: initialData?.availableFoodDurationDays || 0,
      additionalFoodRequiredPersons: initialData?.additionalFoodRequiredPersons || 0,
      additionalFoodRequiredHouseholds: initialData?.additionalFoodRequiredHouseholds || 0,
      additionalFoodDetails: initialData?.additionalFoodDetails || ''
    }
  })

  const watchedValues = form.watch()

  // Calculate food security status
  const gapFields = [
    { key: 'isFoodSufficient', label: 'Food Sufficiency' },
    { key: 'hasRegularMealAccess', label: 'Regular Meal Access' },
    { key: 'hasInfantNutrition', label: 'Infant Nutrition' }
  ]

  const gaps = gapFields.filter(field => !watchedValues[field.key as keyof FormData])
  const gapCount = gaps.length

  const hasFoodGaps = gapCount > 0
  const foodDaysRemaining = watchedValues.availableFoodDurationDays
  const urgentNeed = foodDaysRemaining < 7 || watchedValues.additionalFoodRequiredPersons > 0

  const handleSubmit = async (data: FormData) => {
    if (!selectedEntity) {
      return
    }

    // Get current user name from auth context
    const currentUserName = getCurrentUserName()
    
    // Get location data from entity or GPS
    const locationData = getAssessmentLocationData(
      selectedEntityData,
      gpsCoordinates ? {
        latitude: gpsCoordinates.lat,
        longitude: gpsCoordinates.lng
      } : undefined
    )

    const assessmentData = {
      type: 'FOOD' as const,
      rapidAssessmentDate: new Date(),
      assessorName: currentUserName,
      entityId: selectedEntity,
      ...locationData,
      mediaAttachments: mediaFiles,
      foodData: data
    }

    await onSubmit(assessmentData)
  }

  const handleFoodSourceChange = (sourceId: string, checked: boolean) => {
    const currentSources = form.getValues('foodSource')
    if (checked) {
      form.setValue('foodSource', [...currentSources, sourceId])
    } else {
      form.setValue('foodSource', currentSources.filter(id => id !== sourceId))
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Food Security Assessment
            {gapCount > 0 && (
              <Badge variant="destructive">
                {gapCount} Gap{gapCount > 1 ? 's' : ''}
              </Badge>
            )}
            {urgentNeed && (
              <Badge variant="destructive">
                Urgent Need
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assess food availability, access, and nutrition security in the affected area
          </CardDescription>
        </CardHeader>
        {gapCount > 0 && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Gaps Identified:</strong> {gaps.map(g => g.label).join(', ')}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Entity Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Location</CardTitle>
            </CardHeader>
            <CardContent>
              <EntitySelector
                value={selectedEntity}
                onValueChange={(entityId) => {
                  setSelectedEntity(entityId)
                  // Reset entity data when selection changes
                  setSelectedEntityData(null)
                }}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          {/* Food Availability Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Food Availability & Access</CardTitle>
              <CardDescription>
                Evaluate food availability and access patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="isFoodSufficient"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Food Sufficient
                          {!field.value && <Badge variant="destructive">Gap</Badge>}
                          {field.value && <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">No Gap</Badge>}
                        </FormLabel>
                        <FormDescription>
                          Food supplies are sufficient to meet the population's needs
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasRegularMealAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Regular Meal Access
                          {!field.value && <Badge variant="destructive">Gap</Badge>}
                          {field.value && <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">No Gap</Badge>}
                        </FormLabel>
                        <FormDescription>
                          Population has regular access to meals (at least 2 per day)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasInfantNutrition"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          Infant Nutrition Available
                          {!field.value && <Badge variant="destructive">Gap</Badge>}
                          {field.value && <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">No Gap</Badge>}
                        </FormLabel>
                        <FormDescription>
                          Adequate nutrition available for infants and young children
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Food Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Current Food Sources</CardTitle>
              <CardDescription>
                Identify the main food sources for the affected population
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {foodSourceOptions.map((source) => (
                  <FormField
                    key={source.id}
                    control={form.control}
                    name="foodSource"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(source.id)}
                            onCheckedChange={(checked) => handleFoodSourceChange(source.id, checked as boolean)}
                            disabled={disabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none flex-1">
                          <FormLabel>{source.label}</FormLabel>
                          <FormDescription className="text-xs">
                            {source.description}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
              <CardDescription>
                Food security risks and supply duration assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="availableFoodDurationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Days of Food Available
                        {field.value > 0 && field.value < 7 && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                        {field.value >= 7 && field.value < 30 && (
                          <Badge variant="secondary">Limited</Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                          className={cn(
                            field.value > 0 && field.value < 7 && "border-red-200 focus:border-red-400",
                            field.value >= 7 && field.value < 30 && "border-orange-200 focus:border-orange-400"
                          )}
                        />
                      </FormControl>
                      <FormDescription>
                        How many days will current food supplies last
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalFoodRequiredPersons"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Persons Needing Food
                        {field.value > 0 && (
                          <Badge variant="destructive">{field.value} persons</Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of additional people requiring food assistance
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
                      <FormLabel>Households Needing Food</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of households requiring food assistance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Food Security Alert */}
              {foodDaysRemaining > 0 && foodDaysRemaining < 7 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Food Shortage:</strong> Only {foodDaysRemaining} days of food available. 
                    Immediate food assistance required.
                  </AlertDescription>
                </Alert>
              )}

              {foodDaysRemaining >= 7 && foodDaysRemaining < 30 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Limited Food Supply:</strong> {foodDaysRemaining} days of food available. 
                    Food assistance planning recommended.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* GPS Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
            </CardHeader>
            <CardContent>
              <GPSCapture
                onLocationCapture={(lat, lng) => setGpsCoordinates({ lat, lng })}
                disabled={disabled}
                required={false}
              />
            </CardContent>
          </Card>

          {/* Media Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Documentation</CardTitle>
              <CardDescription>
                Add photos of food distribution points, storage facilities, and affected populations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaField
                onPhotosChange={setMediaFiles}
                initialPhotos={mediaFiles}
                maxPhotos={5}
                maxFileSize={10}
              />
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>
                Any additional food security information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalFoodDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional food assessment details..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || disabled || !selectedEntity}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Food Assessment'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}