'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Icons
import { Plus, Edit, Package, AlertTriangle, Search, Filter } from 'lucide-react'

// Forms and components
import { ResponsePlanningForm } from '@/components/forms/response'
import { ResponsePlanningDashboard } from '@/components/response/ResponsePlanningDashboard'

// Hooks and utilities
import { useAuthStore } from '@/stores/auth.store'

export default function ResponsePlanningPage() {
  const { user, token } = useAuthStore()
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
    queryKey: ['responses', 'planned', user?.id],
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
            items: editingResponseData?.items?.map(item => ({
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
      <div className="flex items-center gap-4">
        <Badge variant="outline">
          RESPONSE PLANNING MODE
        </Badge>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString()}
        </span>
      </div>
      
      <ResponsePlanningDashboard
        onCreateResponse={handleCreateResponse}
        onEditResponse={handleEditResponse}
      />
    </div>
  )
}