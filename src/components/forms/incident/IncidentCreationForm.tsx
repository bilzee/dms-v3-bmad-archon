'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { useIncident } from '@/hooks/useIncident'
import { IncidentSchema } from '@/lib/validation/incidents'
import { IncidentData } from '@/types/incidents'
import { AlertTriangle, Plus, Zap } from 'lucide-react'
import { z } from 'zod'

type FormData = z.infer<typeof IncidentSchema>

interface IncidentCreationFormProps {
  onSubmit?: (data: IncidentData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<IncidentData>
  disabled?: boolean
  assessmentId?: string
  showAssessmentLink?: boolean
}

const severityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' }
]

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CONTAINED', label: 'Contained' },
  { value: 'RESOLVED', label: 'Resolved' }
]

export function IncidentCreationForm({
  onSubmit,
  onCancel,
  initialData,
  disabled = false,
  assessmentId,
  showAssessmentLink = false
}: IncidentCreationFormProps) {
  const { 
    createIncident, 
    createIncidentFromAssessment,
    incidentTypes, 
    isLoading, 
    error, 
    clearError 
  } = useIncident()

  const [customType, setCustomType] = useState('')
  const [showCustomType, setShowCustomType] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(IncidentSchema),
    defaultValues: {
      type: initialData?.type || '',
      subType: initialData?.subType || '',
      severity: initialData?.severity || 'MEDIUM',
      status: initialData?.status || 'ACTIVE',
      description: initialData?.description || '',
      location: initialData?.location || '',
      coordinates: initialData?.coordinates
    }
  })

  const selectedSeverity = watch('severity')

  const handleFormSubmit = async (data: FormData) => {
    try {
      clearError()
      
      // Use custom type if selected
      const incidentData = {
        ...data,
        type: showCustomType ? customType : data.type
      }

      if (onSubmit) {
        await onSubmit(incidentData)
      } else if (assessmentId) {
        await createIncidentFromAssessment(assessmentId, incidentData)
      } else {
        await createIncident({ data: incidentData })
      }
      
      // Reset form after successful submission
      if (!onSubmit) {
        onCancel?.()
      }
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomType(true)
      setValue('type', '')
    } else {
      setShowCustomType(false)
      setValue('type', value)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Create New Incident
          {showAssessmentLink && assessmentId && (
            <span className="text-sm text-gray-500">(from assessment)</span>
          )}
        </CardTitle>
        <CardDescription>
          Create a new incident record for disaster response coordination
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Incident Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incidentType">
                Incident Type <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={handleTypeChange} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Type...</SelectItem>
                </SelectContent>
              </Select>
              
              {showCustomType && (
                <Input
                  placeholder="Enter custom incident type"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  disabled={disabled}
                />
              )}
              
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subType">Sub-Type</Label>
              <Input
                id="subType"
                {...register('subType')}
                disabled={disabled}
                placeholder="e.g., Flash flood, House fire"
              />
            </div>
          </div>

          {/* Severity and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">
                Severity <span className="text-red-500">*</span>
              </Label>
              <Select 
                onValueChange={(value) => setValue('severity', value as any)} 
                defaultValue="MEDIUM"
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs ${option.color}`}>
                          {option.label}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.severity && (
                <p className="text-sm text-red-600">{errors.severity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                onValueChange={(value) => setValue('status', value as any)} 
                defaultValue="ACTIVE"
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">
              Location <span className="text-red-500">*</span>
            </Label>
            <Input
              id="location"
              {...register('location')}
              disabled={disabled}
              placeholder="e.g., Lagos Island, Lagos State"
            />
            {errors.location && (
              <p className="text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              disabled={disabled}
              placeholder="Detailed description of the incident..."
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Severity Warning */}
          {selectedSeverity === 'CRITICAL' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Critical Incident:</strong> This incident will be flagged for immediate attention 
                and will trigger emergency response protocols.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={disabled || isLoading}
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={disabled || isLoading || (!showCustomType && !watch('type')) || (showCustomType && !customType)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isLoading ? 'Creating...' : 'Create Incident'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}