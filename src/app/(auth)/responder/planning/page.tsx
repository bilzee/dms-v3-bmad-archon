'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Icons
import { Plus, Edit, Package, AlertTriangle, Search, Filter, CheckCircle, User, Shield } from 'lucide-react'

// Forms and components
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { ResponsePlanningForm } from '@/components/forms/response'
import { ResponsePlanningDashboard } from '@/components/response/ResponsePlanningDashboard'

// Hooks and utilities
import { useAuthStore } from '@/stores/auth.store'

function ResponsePlanningPageContent() {
  const { user, token } = useAuthStore()
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingResponse, setEditingResponse] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch response data for editing
  const { data: editingResponseData, isLoading: isEditingLoading } = useQuery({
    queryKey: ['response', editingResponse],
    queryFn: async () => {
      if (!editingResponse || !token) return null
      
      const response = await fetch(`/api/v1/responses/${editingResponse}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again')
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this response')
        } else if (response.status === 404) {
          throw new Error('Response not found')
        } else {
          throw new Error('Failed to fetch response')
        }
      }
      
      const result = await response.json()
      return result.data
    },
    enabled: !!editingResponse && !!user && !!token && isClient
  })

  // Get assigned planned responses for this responder
  const { data: responsesData, isLoading, error, refetch } = useQuery({
    queryKey: ['responses', 'planned', (user as any)?.id],
    queryFn: async () => {
      if (!user || !token) throw new Error('User not authenticated')
      
      const response = await fetch(`/api/v1/responses/planned/assigned?page=1&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch planned responses')
      }
      
      const result = await response.json()
      return {
        responses: result.data || [],
        total: result.meta?.total || 0
      }
    },
    enabled: !!user && !!token && isClient, // Only run query on client side after hydration
    initialData: { responses: [], total: 0 }
  })

  const responses = responsesData?.responses || []
  const total = responsesData?.total || 0

  const handleCreateResponse = () => {
    setShowCreateForm(true)
  }

  const handleEditResponse = (responseId: string) => {
    setEditingResponse(responseId)
  }

  const handleBackToList = () => {
    setShowCreateForm(false)
    setEditingResponse(null)
  }

  // Loading state for editing response
  if (isEditingLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Response Plan...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state for response list
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Response Plans...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load response plans. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show create/edit form
  if (showCreateForm || editingResponse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBackToList}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Back to Response Plans
          </Button>
          <Badge variant="outline">
            {showCreateForm ? 'NEW RESPONSE PLAN' : 'EDITING RESPONSE PLAN'}
          </Badge>
        </div>
        
        <ResponsePlanningForm
          mode={editingResponse ? 'edit' : 'create'}
          initialData={editingResponse ? {
            id: editingResponse,
            assessmentId: editingResponseData?.assessmentId || '',
            entityId: editingResponseData?.entityId || '',
            type: editingResponseData?.type || 'HEALTH',
            priority: editingResponseData?.priority || 'MEDIUM',
            description: editingResponseData?.description || '',
            assessment: editingResponseData?.assessment,
            items: editingResponseData?.items?.map((item: any) => ({
              ...item,
              // Remove category from display since it's auto-assigned
              name: item.name,
              unit: item.unit,
              quantity: item.quantity,
              notes: item.notes
            })) || [{ name: '', unit: '', quantity: 1 }]
          } : undefined}
          onCancel={handleBackToList}
          onSuccess={() => {
            handleBackToList()
            refetch()
          }}
        />
      </div>
    )
  }

  // Show response plans dashboard
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            RESPONSE PLANNING MODE
          </Badge>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString()}
          </span>
        </div>
        
        <Button
          variant="default"
          size="lg"
          onClick={() => router.push('/responder/responses')}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 shadow-lg"
        >
          <CheckCircle className="h-5 w-5" />
          View Response Deliveries
        </Button>
      </div>
      
      <ResponsePlanningDashboard
        onCreateResponse={handleCreateResponse}
        onEditResponse={handleEditResponse}
      />
    </div>
  )
}

export default function ResponsePlanningPageWrapper() {
  const { availableRoles } = useAuth()

  // Custom error message for multi-role users who haven't selected RESPONDER role
  const RoleAccessError = () => {
    const hasResponderRole = availableRoles.includes('RESPONDER');
    
    if (!hasResponderRole) {
      return (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  You do not have permission to access this page. Responder role is required for response planning.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                This page is only available to users with the Responder role for planning and managing response operations.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              You need to select the <strong>Responder</strong> role to access this page.
            </AlertDescription>
          </Alert>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Role Selection Required
              </h3>
              <p className="text-blue-700 mb-4">
                You have the Responder role assigned, but you need to actively select it to access response planning features.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                Switch to the Responder role using the role selector in the top-right corner of the page.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Refresh Page After Selecting Role
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <RoleBasedRoute 
      requiredRole="RESPONDER" 
      fallbackPath="/dashboard"
      errorComponent={<RoleAccessError />}
    >
      <ResponsePlanningPageContent />
    </RoleBasedRoute>
  )
}