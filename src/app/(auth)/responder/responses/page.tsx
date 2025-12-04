'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

// UI components
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Icons
import { Package, Truck, Search, Filter, AlertTriangle, Clock, CheckCircle, ArrowLeft, User, Shield } from 'lucide-react'

// Services and hooks
import { useAuthStore } from '@/stores/auth.store'

function ResponderResponsesPageContent() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Get all responses for this responder
  const { data: responsesData, isLoading, error } = useQuery({
    queryKey: ['responses', 'responder', (user as any)?.id],
    queryFn: async () => {
      if (!user || !token) throw new Error('User not authenticated')
      
      const response = await fetch(`/api/v1/responses/assigned?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch responses')
      }
      
      const result = await response.json()
      return {
        responses: result.data || [],
        total: result.meta?.total || 0
      }
    },
    enabled: !!user && !!token
  })

  const responses = responsesData?.responses || []
  const total = responsesData?.total || 0

  // Filter responses
  const filteredResponses = responses
    .filter((response: any) => {
      const matchesSearch = searchTerm === '' || 
        response.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        response.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchesStatus = false
      if (filterStatus === 'all') {
        matchesStatus = true
      } else if (filterStatus === 'PLANNED') {
        matchesStatus = response.status === 'PLANNED'
      } else if (filterStatus === 'AWAITING_VERIFICATION') {
        matchesStatus = response.status === 'DELIVERED' && response.verificationStatus === 'SUBMITTED'
      } else if (filterStatus === 'VERIFIED') {
        matchesStatus = response.status === 'DELIVERED' && 
          (response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED')
      }
      
      const matchesType = filterType === 'all' || response.type === filterType
      
      return matchesSearch && matchesStatus && matchesType
    })

  // Calculate status counts based on verification workflow
  const plannedCount = responses.filter((r: any) => r.status === 'PLANNED').length
  const awaitingVerificationCount = responses.filter((r: any) => 
    r.status === 'DELIVERED' && r.verificationStatus === 'SUBMITTED'
  ).length
  const verifiedCount = responses.filter((r: any) => 
    r.status === 'DELIVERED' && (r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED')
  ).length

  const handleNavigateToDelivery = (responseId: string) => {
    router.push(`/responder/responses/${responseId}/deliver`)
  }

  const handleBackToPlanning = () => {
    router.push('/responder/planning')
  }

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
              Failed to load responses. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBackToPlanning}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Planning
          </Button>
          
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold">My Assigned Responses</h1>
            <Badge variant="outline">Responder</Badge>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              All assigned responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{plannedCount}</div>
            <p className="text-xs text-muted-foreground">
              Ready for delivery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Verification</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{awaitingVerificationCount}</div>
            <p className="text-xs text-muted-foreground">
              Delivered, pending verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Responses</CardTitle>
          <CardDescription>
            Search and filter your assigned responses by type and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search responses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="AWAITING_VERIFICATION">Awaiting Verification</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="SHELTER">Shelter</SelectItem>
                  <SelectItem value="MEDICAL">Medical</SelectItem>
                  <SelectItem value="CLOTHING">Clothing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses List */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Responses</CardTitle>
          <CardDescription>
            {filteredResponses.length} of {total} responses match your filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No responses found</h3>
              <p>Try adjusting your filters or contact your coordinator for new assignments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResponses.map((response: any) => (
                <div key={response.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium">{response.type}</h3>
                      <p className="text-sm text-muted-foreground">{response.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={response.status === 'DELIVERED' ? 'default' : 'secondary'}>
                          {response.status}
                        </Badge>
                        {response.verificationStatus && (
                          <Badge variant="outline">
                            {response.verificationStatus.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {response.status === 'PLANNED' && (
                      <Button 
                        onClick={() => handleNavigateToDelivery(response.id)}
                        size="sm"
                      >
                        Confirm Delivery
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResponderResponsesPage() {
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
                  You do not have permission to access this page. Responder role is required to view responses.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                This page is only available to users with the Responder role for managing assigned responses.
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
                You have the Responder role assigned, but you need to actively select it to view your assigned responses.
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
      <ResponderResponsesPageContent />
    </RoleBasedRoute>
  )
}