'use client'

import React, { useState } from 'react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Wifi,
  WifiOff,
  User,
  Shield
} from 'lucide-react'

import { useBackgroundSyncContext } from '@/providers/BackgroundSyncProvider'
import { OfflineSyncDashboard } from '@/components/delivery/OfflineSyncDashboard'
import { DeliveryConfirmationForm } from '@/components/forms/delivery/DeliveryConfirmationForm'
import { useAuthStore } from '@/stores/auth.store'
import { Alert, AlertDescription } from '@/components/ui/alert'

function ResponderDashboardPageContent() {
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const { isOnline, isSyncing, pendingCount } = useBackgroundSyncContext()
  const { user } = useAuthStore()

  const mockPlannedResponses = [
    {
      id: 'resp-1',
      entityName: 'Central Shelter',
      plannedDate: '2024-01-15',
      items: ['Blankets', 'Water', 'Food'],
      status: 'PLANNED'
    },
    {
      id: 'resp-2', 
      entityName: 'East Zone Medical Center',
      plannedDate: '2024-01-15',
      items: ['Medical Supplies', 'PPE'],
      status: 'PLANNED'
    }
  ]

  const handleConfirmDelivery = (responseId: string) => {
    setSelectedResponseId(responseId)
    setShowDeliveryForm(true)
  }

  const handleDeliveryComplete = () => {
    setShowDeliveryForm(false)
    setSelectedResponseId(null)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Responder Dashboard</h1>
          <p className="text-muted-foreground">
            Manage aid deliveries and track response activities
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">Offline</span>
              </>
            )}
          </div>
          
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-orange-600">
                {pendingCount} pending sync
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">8</div>
            <p className="text-xs text-muted-foreground">
              Completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">4</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              On-time delivery rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="planned" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="planned">Planned Deliveries</TabsTrigger>
          <TabsTrigger value="active">Active Deliveries</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="planned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planned Deliveries</CardTitle>
              <CardDescription>
                Deliveries scheduled for today that need confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPlannedResponses.map((response) => (
                  <div key={response.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{response.entityName}</h3>
                        <p className="text-sm text-muted-foreground">Planned: {response.plannedDate}</p>
                        <div className="flex gap-1 mt-1">
                          {response.items.map((item, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleConfirmDelivery(response.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirm Delivery
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Deliveries</CardTitle>
              <CardDescription>
                Deliveries currently in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No active deliveries</h3>
                <p>All planned deliveries will appear here once confirmed.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Deliveries</CardTitle>
              <CardDescription>
                Recently completed and verified deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No completed deliveries</h3>
                <p>Completed deliveries will appear here with status and verification information.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Offline Sync Status */}
      {!isOnline && (
        <Card className="border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-900">Offline Mode</h3>
                <p className="text-sm text-orange-700">
                  You're currently offline. Actions will be synced when you reconnect.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Confirmation Modal */}
      {showDeliveryForm && selectedResponseId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <DeliveryConfirmationForm
              responseId={selectedResponseId}
              onSuccess={handleDeliveryComplete}
              onCancel={handleDeliveryComplete}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResponderDashboardPage() {
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
                  You do not have permission to access this page. Responder role is required.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                This dashboard is only available to users with the Responder role for managing aid deliveries.
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
                You have the Responder role assigned, but you need to actively select it to access the responder dashboard.
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
      <ResponderDashboardPageContent />
    </RoleBasedRoute>
  )
}