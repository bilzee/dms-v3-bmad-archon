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
import { ShelterAssessmentFormProps, ShelterAssessmentInput } from '@/types/rapid-assessment'
import { cn } from '@/lib/utils'
import { getCurrentUserName, getAssessmentLocationData } from '@/utils/assessment-utils'
import { Home, AlertTriangle, Cloud, Users } from 'lucide-react'

const ShelterAssessmentSchema = z.object({
  areSheltersSufficient: z.boolean(),
  hasSafeStructures: z.boolean(),
  shelterTypes: z.array(z.string()).default([]),
  requiredShelterType: z.array(z.string()).default([]),
  numberSheltersRequired: z.number().int().min(0),
  areOvercrowded: z.boolean(),
  provideWeatherProtection: z.boolean(),
  additionalShelterDetails: z.string().optional()
})

type FormData = z.infer<typeof ShelterAssessmentSchema>

interface ShelterTypeOption {
  id: string
  label: string
  description: string
}

const shelterTypeOptions: ShelterTypeOption[] = [
  {
    id: 'Trampoline',
    label: 'Trampoline/Tent',
    description: 'Emergency tents or temporary structures'
  },
  {
    id: 'Open space',
    label: 'Open Space',
    description: 'Designated open areas for temporary shelter'
  },
  {
    id: 'Local materials',
    label: 'Local Materials',
    description: 'Shelters built with locally available materials'
  },
  {
    id: 'Communal structure',
    label: 'Communal Structures',
    description: 'Public buildings used as shelters'
  },
  {
    id: 'Other',
    label: 'Other',
    description: 'Other types of shelter arrangements'
  }
]

export function ShelterAssessmentForm({ 
  entityId, 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  disabled = false 
}: ShelterAssessmentFormProps) {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>(initialData?.mediaAttachments || [])
  const [selectedEntity, setSelectedEntity] = useState<string>(entityId)
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(ShelterAssessmentSchema),
    defaultValues: {
      areSheltersSufficient: initialData?.areSheltersSufficient || false,
      hasSafeStructures: initialData?.hasSafeStructures || false,
      shelterTypes: initialData?.shelterTypes || [],
      requiredShelterType: initialData?.requiredShelterType || [],
      numberSheltersRequired: initialData?.numberSheltersRequired || 0,
      areOvercrowded: initialData?.areOvercrowded || false,
      provideWeatherProtection: initialData?.provideWeatherProtection || false,
      additionalShelterDetails: initialData?.additionalShelterDetails || ''
    }
  })

  const watchedValues = form.watch()

  // Calculate shelter gaps and risks
  const gapFields = [
    { key: 'areSheltersSufficient', label: 'Shelter Sufficiency' },
    { key: 'hasSafeStructures', label: 'Safe Structures' },
    { key: 'provideWeatherProtection', label: 'Weather Protection' }
  ]

  const gaps = gapFields.filter(field => !watchedValues[field.key as keyof FormData])
  const gapCount = gaps.length

  const shelterGaps = gapCount > 0
  const overcrowdingRisk = watchedValues.areOvercrowded
  const urgentShelterNeed = watchedValues.numberSheltersRequired > 0
  const hasShelterRisks = shelterGaps || overcrowdingRisk

  const handleSubmit = async (data: FormData) => {
    if (!selectedEntity) {
      return
    }

    const assessmentData = {
      type: 'SHELTER' as const,
      rapidAssessmentDate: new Date(),
      assessorName: getCurrentUserName(),
      entityId: selectedEntity,
      ...getAssessmentLocationData(selectedEntityData, gpsCoordinates ? { latitude: gpsCoordinates.lat, longitude: gpsCoordinates.lng } : undefined),
      mediaAttachments: mediaFiles,
      shelterData: data
    }

    await onSubmit(assessmentData)
  }

  const handleShelterTypeChange = (typeId: string, isCurrent: boolean) => {
    const currentTypes = form.getValues(isCurrent ? 'shelterTypes' : 'requiredShelterType')
    if (isCurrent) {
      form.setValue('shelterTypes', currentTypes.includes(typeId) 
        ? currentTypes.filter(id => id !== typeId)
        : [...currentTypes, typeId]
      )
    } else {
      form.setValue('requiredShelterType', currentTypes.includes(typeId)
        ? currentTypes.filter(id => id !== typeId)
        : [...currentTypes, typeId]
      )
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Shelter Assessment
            {gapCount > 0 && (
              <Badge variant="destructive">
                {gapCount} Gap{gapCount > 1 ? 's' : ''}
              </Badge>
            )}
            {urgentShelterNeed && (
              <Badge variant="destructive">
                Urgent Need ({watchedValues.numberSheltersRequired})
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assess shelter conditions, capacity, and protection from elements
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
                onValueChange={(value) => {
                  setSelectedEntity(value)
                  setSelectedEntityData(null)
                }}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          {/* Shelter Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Shelter Availability & Safety</CardTitle>
              <CardDescription>
                Evaluate current shelter conditions and safety
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="areSheltersSufficient"
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
                          Shelters Sufficient
                          {!field.value && <Badge variant="destructive">Gap</Badge>}
                          {field.value && <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">No Gap</Badge>}
                        </FormLabel>
                        <FormDescription>
                          Available shelters are sufficient for the affected population
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSafeStructures"
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
                          Safe Structures
                          {!field.value && <Badge variant="destructive">Gap</Badge>}
                          {field.value && <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">No Gap</Badge>}
                        </FormLabel>
                        <FormDescription>
                          Existing shelters are structurally safe and secure
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provideWeatherProtection"
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
                          <Cloud className="h-4 w-4" />
                          Weather Protection
                          {!field.value && <Badge variant="destructive">Gap</Badge>}
                          {field.value && <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">No Gap</Badge>}
                        </FormLabel>
                        <FormDescription>
                          Shelters provide adequate protection from weather elements
                        </FormDescription>
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
                          disabled={disabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Overcrowding Issues
                          {field.value && <Badge variant="destructive">Health Risk</Badge>}
                        </FormLabel>
                        <FormDescription>
                          Shelters are overcrowded beyond safe capacity
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Shelter Types */}
          <Card>
            <CardHeader>
              <CardTitle>Current Shelter Types</CardTitle>
              <CardDescription>
                Select the types of shelters currently available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shelterTypeOptions.map((type) => (
                  <FormField
                    key={type.id}
                    control={form.control}
                    name="shelterTypes"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(type.id)}
                            onCheckedChange={() => handleShelterTypeChange(type.id, true)}
                            disabled={disabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none flex-1">
                          <FormLabel>Currently Available</FormLabel>
                          <div className="font-medium">{type.label}</div>
                          <FormDescription className="text-xs">
                            {type.description}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Required Shelter Types */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Shelter Requirements</CardTitle>
              <CardDescription>
                Select the types of shelters urgently needed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shelterTypeOptions.map((type) => (
                  <FormField
                    key={type.id}
                    control={form.control}
                    name="requiredShelterType"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(type.id)}
                            onCheckedChange={() => handleShelterTypeChange(type.id, false)}
                            disabled={disabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none flex-1">
                          <FormLabel>Urgently Needed</FormLabel>
                          <div className="font-medium">{type.label}</div>
                          <FormDescription className="text-xs">
                            {type.description}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <FormField
                control={form.control}
                name="numberSheltersRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Number of Shelters Required
                      {field.value > 0 && (
                        <Badge variant="destructive">{field.value} needed</Badge>
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
                          field.value > 0 && "border-red-200 focus:border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated number of additional shelters needed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          {hasShelterRisks && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shelterGaps && (
                    <Alert variant="destructive">
                      <Home className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Inadequate Shelter:</strong> Insufficient, unsafe, or exposed shelters increase health and safety risks
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {overcrowdingRisk && (
                    <Alert variant="destructive">
                      <Users className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Overcrowding Risk:</strong> Overcrowded conditions increase disease transmission and safety risks
                      </AlertDescription>
                    </Alert>
                  )}

                  {urgentShelterNeed && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Urgent Shelter Need:</strong> {watchedValues.numberSheltersRequired} additional shelters required. Immediate intervention needed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                Add photos of shelter conditions, facilities, and affected areas
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
                Any additional shelter-related information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalShelterDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Provide any additional shelter assessment details..."
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
              {isSubmitting ? 'Submitting...' : 'Submit Shelter Assessment'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}