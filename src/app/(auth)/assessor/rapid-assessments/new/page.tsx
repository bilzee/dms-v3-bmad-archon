'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertTriangle, CheckCircle, Hospital, Users, Utensils, Droplets, Home, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

// Import assessment forms
import { 
  HealthAssessmentForm,
  PopulationAssessmentForm,
  FoodAssessmentForm,
  WASHAssessmentForm,
  ShelterAssessmentForm,
  SecurityAssessmentForm
} from '@/components/forms/assessment'

const assessmentTypes = [
  { 
    value: 'HEALTH', 
    label: 'Health Assessment', 
    color: 'bg-red-100 text-red-800',
    icon: Hospital,
    description: 'Medical facilities, services, and health conditions'
  },
  { 
    value: 'POPULATION', 
    label: 'Population Assessment', 
    color: 'bg-blue-100 text-blue-800',
    icon: Users,
    description: 'Demographics, displacement, and population needs'
  },
  { 
    value: 'FOOD', 
    label: 'Food Security Assessment', 
    color: 'bg-orange-100 text-orange-800',
    icon: Utensils,
    description: 'Food availability, access, and nutrition status'
  },
  { 
    value: 'WASH', 
    label: 'WASH Assessment', 
    color: 'bg-cyan-100 text-cyan-800',
    icon: Droplets,
    description: 'Water, sanitation, and hygiene conditions'
  },
  { 
    value: 'SHELTER', 
    label: 'Shelter Assessment', 
    color: 'bg-purple-100 text-purple-800',
    icon: Home,
    description: 'Housing, shelter conditions, and accommodation needs'
  },
  { 
    value: 'SECURITY', 
    label: 'Security Assessment', 
    color: 'bg-gray-100 text-gray-800',
    icon: Shield,
    description: 'Safety, security situation, and protection needs'
  }
]

export default function NewAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token, user } = useAuthStore()
  const [selectedType, setSelectedType] = useState<string>('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (typeParam && assessmentTypes.find(t => t.value === typeParam)) {
      setSelectedType(typeParam)
      setShowForm(true)
    }
  }, [searchParams])

  const selectedAssessment = assessmentTypes.find(t => t.value === selectedType)

  const handleGoBack = () => {
    if (showForm) {
      setShowForm(false)
      setSelectedType('')
      // Clear the type parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('type')
      window.history.replaceState({}, '', url.toString())
    } else {
      router.push('/assessor/rapid-assessments')
    }
  }

  const handleAssessmentComplete = () => {
    // Trigger a storage event to notify other tabs to refresh their data
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'assessment-created',
      newValue: Date.now().toString()
    }))
    
    router.push('/assessor/rapid-assessments')
  }

  const renderAssessmentForm = () => {
    const handleAssessmentSubmit = async (formData: any) => {
      try {
        console.log('Submitting assessment data:', formData)
        
        // Prepare the assessment data for API submission
        const assessmentData = {
          type: selectedType,
          rapidAssessmentDate: formData.rapidAssessmentDate || new Date(),
          assessorName: formData.assessorName || 'Multi Role Test User',
          location: formData.location || '',
          coordinates: formData.coordinates || undefined,
          mediaAttachments: formData.mediaAttachments || [],
          priority: formData.priority || 'MEDIUM',
          entityId: formData.entityId || 'default-entity', // Use the entity from form
        }
        
        // Add type-specific data
        switch (selectedType) {
          case 'HEALTH':
            assessmentData.healthData = formData.healthData;
            break;
          case 'POPULATION':
            assessmentData.populationData = formData.populationData;
            break;
          case 'FOOD':
            assessmentData.foodData = formData.foodData;
            break;
          case 'WASH':
            assessmentData.washData = formData.washData;
            break;
          case 'SHELTER':
            assessmentData.shelterData = formData.shelterData;
            break;
          case 'SECURITY':
            assessmentData.securityData = formData.securityData;
            break;
        }
        
        // Submit to API
        const response = await fetch('/api/v1/rapid-assessments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(assessmentData)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Assessment submitted successfully:', result);
          handleAssessmentComplete();
        } else {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          throw new Error(errorData.error || 'Failed to submit assessment');
        }
      } catch (error) {
        console.error('Error submitting assessment:', error);
        throw error;
      }
    }

    const commonProps = {
      entityId: '', // This would normally be provided by the router or context
      onSubmit: handleAssessmentSubmit,
      onCancel: handleGoBack
    }

    switch (selectedType) {
      case 'HEALTH':
        return <HealthAssessmentForm {...commonProps} />
      case 'POPULATION':
        return <PopulationAssessmentForm {...commonProps} />
      case 'FOOD':
        return <FoodAssessmentForm {...commonProps} />
      case 'WASH':
        return <WASHAssessmentForm {...commonProps} />
      case 'SHELTER':
        return <ShelterAssessmentForm {...commonProps} />
      case 'SECURITY':
        return <SecurityAssessmentForm {...commonProps} />
      default:
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Invalid assessment type selected. Please go back and choose a valid assessment type.
            </AlertDescription>
          </Alert>
        )
    }
  }

  return (
    <RoleBasedRoute requiredRole="ASSESSOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {showForm ? 'Back to Selection' : 'Back to Assessments'}
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {showForm ? `${selectedAssessment?.label}` : 'Create New Assessment'}
            </h1>
            <p className="text-gray-600 mt-2">
              {showForm 
                ? `Complete the ${selectedAssessment?.label.toLowerCase()} form below`
                : 'Select the type of assessment you want to create'
              }
            </p>
          </div>

          {selectedAssessment && showForm && (
            <Badge className={selectedAssessment.color}>
              {selectedAssessment.icon && <selectedAssessment.icon className="h-4 w-4 mr-2" />}
              {selectedAssessment.value}
            </Badge>
          )}
        </div>

        {showForm && selectedAssessment ? (
          <div className="space-y-6">
            {/* Assessment Form */}
            {renderAssessmentForm()}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Assessment Type</CardTitle>
              <CardDescription>
                Choose the type of rapid assessment you want to conduct
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessmentTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <div
                      key={type.value}
                      onClick={() => {
                        setSelectedType(type.value)
                        setShowForm(true)
                        // Update URL with type parameter
                        const url = new URL(window.location.href)
                        url.searchParams.set('type', type.value)
                        window.history.replaceState({}, '', url.toString())
                      }}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <Icon className="h-5 w-5 text-gray-700" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{type.label}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {type.description}
                            </p>
                          </div>
                        </div>
                        <Badge className={type.color}>
                          {type.value}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleBasedRoute>
  )
}