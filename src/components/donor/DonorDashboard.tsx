'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Building, 
  User, 
  MapPin, 
  Package, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Eye,
  Plus,
  RefreshCw,
  Calendar,
  Activity,
  BarChart3,
  Target,
  Truck
} from 'lucide-react'

import { DonorProfile } from './DonorProfile'
import { EntitySelector } from './EntitySelector'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

export function DonorDashboard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch donor profile with metrics
  const { 
    data: donorData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['donor-profile'],
    queryFn: async () => {
      const response = await fetch('/api/v1/donors/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch donor profile')
      }
      
      const result = await response.json()
      return result.data
    },
    enabled: !!user
  })

  // Fetch assigned entities
  const { 
    data: entitiesData, 
    isLoading: entitiesLoading 
  } = useQuery({
    queryKey: ['donor-entities'],
    queryFn: async () => {
      const response = await fetch('/api/v1/donors/entities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch entities')
      }
      
      const result = await response.json()
      return result.data
    },
    enabled: !!user
  })

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  const donor = donorData?.donor
  const entities = entitiesData?.entities || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between" data-testid="dashboard-header">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12" data-testid="dashboard-avatar">
            <AvatarImage src="" />
            <AvatarFallback className="text-lg">
              {donor?.name?.charAt(0) || 'D'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold" data-testid="dashboard-title">{donor?.name}</h1>
            <p className="text-gray-600" data-testid="dashboard-subtitle">Donor Dashboard</p>
          </div>
        </div>
        
        <Button 
          data-testid="dashboard-refresh-button"
          variant="outline" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-metrics-grid">
        <MetricCard
          title="Assigned Entities"
          value={entitiesData?.summary?.totalAssigned || 0}
          icon={MapPin}
          iconColor="text-blue-600"
          description="Entities you can support"
          data-testid="assigned-entities-metric"
        />
        
        <MetricCard
          title="Total Commitments"
          value={donor?.metrics?.commitments?.total || 0}
          icon={Package}
          iconColor="text-green-600"
          description="Active commitments"
          data-testid="total-commitments-metric"
        />
        
        <MetricCard
          title="Delivery Rate"
          value={`${donor?.metrics?.commitments?.deliveryRate || 0}%`}
          icon={TrendingUp}
          iconColor="text-purple-600"
          description="Fulfillment performance"
          data-testid="delivery-rate-metric"
        />
        
        <MetricCard
          title="Total Responses"
          value={donor?.metrics?.responses?.total || 0}
          icon={Truck}
          iconColor="text-orange-600"
          description="Deliveries made"
          data-testid="total-responses-metric"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="dashboard-tabs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="dashboard-overview-tab">Overview</TabsTrigger>
          <TabsTrigger value="entities" data-testid="dashboard-entities-tab">Entities</TabsTrigger>
          <TabsTrigger value="profile" data-testid="dashboard-profile-tab">Profile</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="dashboard-analytics-tab">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Entities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Assigned Entities
                </CardTitle>
                <CardDescription>
                  Entities where you can provide support
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entitiesLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded">
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : entities.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No entities assigned yet</p>
                    <p className="text-sm">Contact coordinators to get assigned to entities</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entities.slice(0, 5).map((entity: any) => (
                      <div key={entity.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{entity.name}</p>
                          <p className="text-sm text-gray-600">{entity.type}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {entity.stats?.responses || 0} responses
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {entities.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="outline" size="sm">
                          View All ({entities.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Performance Summary
                </CardTitle>
                <CardDescription>
                  Your contribution impact metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {donor?.metrics?.commitments?.total || 0}
                      </div>
                      <div className="text-sm text-gray-600">Commitments</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {donor?.metrics?.commitments?.delivered || 0}
                      </div>
                      <div className="text-sm text-gray-600">Delivered</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Delivery Rate</span>
                      <span className="font-medium">
                        {donor?.metrics?.commitments?.deliveryRate || 0}%
                      </span>
                    </div>
                    <Progress 
                      value={donor?.metrics?.commitments?.deliveryRate || 0} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">
                        {donor?.metrics?.responses?.total || 0}
                      </div>
                      <div className="text-xs text-gray-600">Total Responses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-orange-600">
                        {donor?.metrics?.combined?.totalActivities || 0}
                      </div>
                      <div className="text-xs text-gray-600">Total Activities</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your latest contributions and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Your activities will appear here once you start making commitments and deliveries</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities" className="space-y-6">
          <EntitySelector />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <DonorProfile />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5" />
                  Commitment Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Analytics coming soon</p>
                  <p className="text-sm">Detailed commitment analytics will be available here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Performance tracking coming soon</p>
                  <p className="text-sm">Historical performance data will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components
interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconColor?: string
  description?: string
}

function MetricCard({ title, value, icon: Icon, iconColor = "text-gray-600", description, ...props }: MetricCardProps & { [key: string]: any }) {
  return (
    <Card {...props}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
      </CardContent>
    </Card>
  )
}