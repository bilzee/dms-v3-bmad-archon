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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { GPSCapture } from '@/components/shared/GPSCapture'
import { MediaField } from '@/components/shared/MediaField'
import { EntitySelector } from '@/components/shared/EntitySelector'
import { PopulationAssessmentFormProps, PopulationAssessmentInput } from '@/types/rapid-assessment'
import { cn } from '@/lib/utils'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { Users, Baby, User, UserPlus, AlertTriangle, Heart } from 'lucide-react'

const PopulationAssessmentSchema = z.object({
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
})

type FormData = z.infer<typeof PopulationAssessmentSchema>

export function PopulationAssessmentForm({ 
  entityId, 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false 
}: PopulationAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>(initialData?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(PopulationAssessmentSchema),
    defaultValues: {
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

  const watchedValues = form.watch()

  // Calculate population statistics
  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return Math.round((value / total) * 100)
  }

  const malePercentage = calculatePercentage(watchedValues.populationMale, watchedValues.totalPopulation)
  const femalePercentage = calculatePercentage(watchedValues.populationFemale, watchedValues.totalPopulation)
  const under5Percentage = calculatePercentage(watchedValues.populationUnder5, watchedValues.totalPopulation)
  const vulnerablePercentage = calculatePercentage(
    watchedValues.pregnantWomen + 
    watchedValues.lactatingMothers + 
    watchedValues.personWithDisability + 
    watchedValues.elderlyPersons + 
    watchedValues.separatedChildren,
    watchedValues.totalPopulation
  )

  const handleSubmit = async (data: FormData) => {
    if (!selectedEntity) {
      return
    }

    const assessmentData = {
      type: 'POPULATION' as const,
      rapidAssessmentDate: new Date(),
      assessorName: getCurrentUserName(),
      entityId: selectedEntity,
      ...getAssessmentLocationData(selectedEntityData, gpsCoordinates ? { latitude: gpsCoordinates.lat, longitude: gpsCoordinates.lng } : undefined),
      mediaAttachments: mediaFiles,
      populationData: data
    }

    await onSubmit(assessmentData)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Population Assessment
          </CardTitle>
          <CardDescription>
            Document demographic information and vulnerable populations in the affected area
          </CardDescription>
        </CardHeader>
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
                onValueChange={(value) => {
                  setSelectedEntity(value)
                  setSelectedEntityData(null)
                }}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          {/* Basic Population Data */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Population Data</CardTitle>
              <CardDescription>
                Total population and households
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of households in the affected area
                      </FormDescription>
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
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        Total number of people affected
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Population by Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="populationMale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Male Population
                        <Badge variant="outline">{malePercentage}%</Badge>
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
                        Number of males in the affected population
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="populationFemale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Female Population
                        <Badge variant="outline">{femalePercentage}%</Badge>
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
                        Number of females in the affected population
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vulnerable Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Vulnerable Groups
                <Badge variant="secondary">
                  {vulnerablePercentage}% of population
                </Badge>
              </CardTitle>
              <CardDescription>
                Identify and count vulnerable population groups requiring special attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="populationUnder5"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Baby className="h-4 w-4" />
                        Children Under 5
                        <Badge variant="outline">{calculatePercentage(field.value, watchedValues.totalPopulation)}%</Badge>
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
                        Children under 5 years old
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pregnantWomen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Pregnant Women
                        <Badge variant="outline">{calculatePercentage(field.value, watchedValues.totalPopulation)}%</Badge>
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
                        Pregnant women requiring care
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lactatingMothers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Baby className="h-4 w-4" />
                        Lactating Mothers
                        <Badge variant="outline">{calculatePercentage(field.value, watchedValues.totalPopulation)}%</Badge>
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
                        Lactating mothers with infants
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personWithDisability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Persons with Disabilities
                        <Badge variant="outline">{calculatePercentage(field.value, watchedValues.totalPopulation)}%</Badge>
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
                        People with disabilities
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="elderlyPersons"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Elderly Persons (60+)
                        <Badge variant="outline">{calculatePercentage(field.value, watchedValues.totalPopulation)}%</Badge>
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
                        Elderly persons over 60 years
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="separatedChildren"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Separated Children
                        <Badge variant="outline">{calculatePercentage(field.value, watchedValues.totalPopulation)}%</Badge>
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
                        Unaccompanied or separated children
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Casualties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Casualties and Injuries
              </CardTitle>
              <CardDescription>
                Document the human impact of the disaster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numberLivesLost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-red-600">
                        Lives Lost
                        {field.value > 0 && <Badge variant="destructive">{field.value}</Badge>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                          className="border-red-200 focus:border-red-400"
                        />
                      </FormControl>
                      <FormDescription>
                        Number of confirmed deaths
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberInjured"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-orange-600">
                        Injured Persons
                        {field.value > 0 && <Badge variant="secondary">{field.value}</Badge>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={disabled}
                          className="border-orange-200 focus:border-orange-400"
                        />
                      </FormControl>
                      <FormDescription>
                        Number of injured persons requiring medical attention
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(watchedValues.numberLivesLost > 0 || watchedValues.numberInjured > 0) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Impact:</strong> {watchedValues.numberLivesLost} lives lost and {watchedValues.numberInjured} persons injured. 
                    Immediate emergency response required.
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
                Add photos showing population conditions and affected areas
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
                Any additional population-related information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalPopulationDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional population assessment details..."
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
              {isSubmitting ? 'Submitting...' : 'Submit Population Assessment'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}