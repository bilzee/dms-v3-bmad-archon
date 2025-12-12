'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Entity types from the database schema
const entityTypes = [
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'WARD', label: 'Ward' },
  { value: 'LGA', label: 'Local Government Area' },
  { value: 'STATE', label: 'State' },
  { value: 'FACILITY', label: 'Facility' },
  { value: 'CAMP', label: 'Camp' }
] as const;

// Validation schema
const entitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP']),
  location: z.string().optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }).optional(),
  autoApproveEnabled: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});

type EntityFormData = z.infer<typeof entitySchema>;

interface EntityFormProps {
  onSubmit: (data: EntityFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<EntityFormData>;
  isEditing?: boolean;
}

export function EntityForm({ onSubmit, onCancel, initialData, isEditing = false }: EntityFormProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'COMMUNITY',
      location: initialData?.location || '',
      coordinates: initialData?.coordinates || { latitude: undefined, longitude: undefined },
      autoApproveEnabled: initialData?.autoApproveEnabled || false,
      metadata: initialData?.metadata || {}
    }
  });

  const watchedType = watch('type');
  const watchedCoordinates = watch('coordinates');

  const handleFormSubmit = async (data: EntityFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      // Clean up coordinates if they're empty
      if (data.coordinates && (!data.coordinates.latitude || !data.coordinates.longitude)) {
        data.coordinates = undefined;
      }

      await onSubmit(data);
      
      setSubmitStatus({ 
        type: 'success', 
        message: `Entity ${isEditing ? 'updated' : 'created'} successfully!` 
      });
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'An error occurred while saving the entity' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {isEditing ? 'Edit Entity' : 'Create New Entity'}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the entity information below'
            : 'Fill in the details to create a new entity in the system'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Entity Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter entity name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Type Field */}
          <div className="space-y-2">
            <Label htmlFor="type">Entity Type *</Label>
            <Select 
              value={watchedType} 
              onValueChange={(value) => setValue('type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                {entityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          {/* Location Field */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="Enter location description"
            />
            <p className="text-xs text-gray-500">
              Optional descriptive location (e.g., "Northern District", "Downtown Area")
            </p>
          </div>

          {/* Coordinates */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Geographical Coordinates (Optional)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 9.0765"
                  value={watchedCoordinates?.latitude || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                    setValue('coordinates.latitude', value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 7.3986"
                  value={watchedCoordinates?.longitude || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                    setValue('coordinates.longitude', value);
                  }}
                />
              </div>
            </div>
            {(errors.coordinates?.latitude || errors.coordinates?.longitude) && (
              <p className="text-sm text-red-600">
                Please enter valid coordinates (Latitude: -90 to 90, Longitude: -180 to 180)
              </p>
            )}
          </div>

          {/* Auto-approval setting */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoApproveEnabled"
              checked={watch('autoApproveEnabled')}
              onCheckedChange={(checked) => setValue('autoApproveEnabled', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="autoApproveEnabled" className="text-sm font-medium">
                Enable Auto-Approval
              </Label>
              <p className="text-xs text-gray-500">
                Automatically approve certain actions for this entity based on configured rules
              </p>
            </div>
          </div>

          {/* Submit Status */}
          {submitStatus && (
            <Alert variant={submitStatus.type === 'error' ? 'destructive' : 'default'}>
              {submitStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{submitStatus.message}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  {isEditing ? 'Update Entity' : 'Create Entity'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}