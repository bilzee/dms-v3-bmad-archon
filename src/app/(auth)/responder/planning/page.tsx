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
import { ResponseService } from '@/lib/services/response-client.service'

// Hooks and utilities
import { useAuthStore } from '@/stores/auth.store'

export default function ResponsePlanningPage() {
  const { user } = useAuthStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingResponse, setEditingResponse] = useState<string | null>(null)

  // Get assigned planned responses for this responder
  const { data: responsesData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['responses', 'planned', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      return await ResponseService.getPlannedResponsesForResponder({
        page: 1,
        limit: 50
      })
    },
    enabled: !!user
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

  // Loading state
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