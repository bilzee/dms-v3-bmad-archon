'use client'

import React, { useState } from 'react'
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
  WifiOff
} from 'lucide-react'

import { useBackgroundSyncContext } from '@/providers/BackgroundSyncProvider'
import { OfflineSyncDashboard } from '@/components/delivery/OfflineSyncDashboard'
import { DeliveryConfirmationForm } from '@/components/forms/delivery/DeliveryConfirmationForm'
import { useAuthStore } from '@/stores/auth.store'

export default function ResponderDashboardPage() {
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
        
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="default" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            
            {pendingCount > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pendingCount} pending
              </Badge>
            )}
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Response
          </Button>
        </div>
      </div>

      <Tabs defaultValue="planned" className="space-y-6">
        <TabsList>
          <TabsTrigger value="planned">Planned Deliveries</TabsTrigger>
          <TabsTrigger value="offline">Offline Sync</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="planned" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Planned</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockPlannedResponses.length}</div>
                <p className="text-xs text-muted-foreground">Awaiting delivery</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Successfully delivered</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Sync</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Waiting for connection</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isSyncing ? 'Active' : 'Idle'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Connected' : 'Offline mode'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Planned Deliveries List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planned Deliveries</CardTitle>
                  <CardDescription>
                    Aid deliveries that need to be confirmed
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {mockPlannedResponses.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No planned deliveries</h3>
                  <p className="text-muted-foreground">
                    You don&apos;t have any planned deliveries waiting for confirmation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockPlannedResponses.map((response) => (
                    <div
                      key={response.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{response.entityName}</h4>
                          <Badge variant="outline">{response.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Planned for {new Date(response.plannedDate).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {response.items.map((item, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleConfirmDelivery(response.id)}
                        disabled={!isOnline}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Confirm Delivery
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline">
          <OfflineSyncDashboard />
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Statistics</CardTitle>
                <CardDescription>
                  Your delivery performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Deliveries</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>This Week</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Time</span>
                    <span className="font-medium">2.5 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Success Rate</span>
                    <span className="font-medium">98%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Offline Activity</CardTitle>
                <CardDescription>
                  Offline operations and sync status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Offline Confirmations</span>
                    <span className="font-medium">{pendingCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Sync</span>
                    <span className="font-medium">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Failed Syncs</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Usage</span>
                    <span className="font-medium">124 MB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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