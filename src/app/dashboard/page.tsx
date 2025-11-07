'use client'

import { useAuth } from '@/hooks/useAuth'
import { useCommitmentStats } from '@/hooks/use-commitment-stats'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  UserCog, 
  Activity, 
  User,
  MapPin,
  ClipboardList,
  CheckCircle,
  Settings,
  BarChart3,
  Package,
  PlusCircle,
  Truck,
  Camera,
  HandHeart,
  TrendingUp,
  Clock,
  Loader2
} from 'lucide-react'

export default function DashboardPage() {
  const { user, hasPermission } = useAuth()
  const { stats, recentCommitments, loading, error } = useCommitmentStats()

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome to the Disaster Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Entity Assignment Management - Story 2.3 & 3.3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Entity Assignment
            </CardTitle>
            <CardDescription>
              Manage entity assignments and auto-approval settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 2.3</Badge>
                <Badge variant="outline" className="text-xs">Story 3.3</Badge>
                <Badge variant="secondary" className="text-xs">All Users</Badge>
              </div>
              <Link href="/coordinator/entities">
                <Button className="w-full">
                  <UserCog className="h-4 w-4 mr-2" />
                  Manage Assignments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Rapid Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rapid Assessments
            </CardTitle>
            <CardDescription>
              Manage rapid assessments for disaster response coordination
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 3.2</Badge>
                <Badge variant="secondary" className="text-xs">Assessor</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/rapid-assessments" data-testid="rapid-assessments-nav">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    View All Assessments
                  </Button>
                </Link>
                <Link href="/assessor/rapid-assessments/new">
                  <Button className="w-full justify-start">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Create New Assessment
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preliminary Assessment - Story 3.1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Preliminary Assessment
            </CardTitle>
            <CardDescription>
              Create preliminary disaster assessments with GPS capture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 3.1</Badge>
                <Badge variant="secondary" className="text-xs">Assessor</Badge>
              </div>
              <Link href="/assessor/preliminary-assessment">
                <Button className="w-full">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Create Assessment
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Verification - Story 3.3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Assessment Verification
            </CardTitle>
            <CardDescription>
              Verify or reject submitted assessments to maintain data quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 3.3</Badge>
                <Badge variant="secondary" className="text-xs">All Users</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/coordinator/verification">
                  <Button className="w-full justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verification Queue
                  </Button>
                </Link>
                <Link href="/coordinator/verification/auto-approval">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Auto-Approval Settings
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Metrics - Story 3.3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Verification Metrics
            </CardTitle>
            <CardDescription>
              Monitor verification performance and queue statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 3.3</Badge>
                <Badge variant="secondary" className="text-xs">All Users</Badge>
              </div>
              <Link href="/verification/metrics">
                <Button className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Metrics Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Donor Commitment Import - Story 4.3 */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandHeart className="h-5 w-5 text-blue-600" />
              Donor Commitment Import
              {!loading && stats && stats.availableCommitments > 0 && (
                <Badge variant="default" className="ml-auto bg-green-500">
                  {stats.availableCommitments} Available
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Import available donor commitments to create response plans efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 4.3</Badge>
                <Badge variant="secondary" className="text-xs">Responder</Badge>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">New</Badge>
                {stats && stats.availableCommitments > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Ready to Use
                  </Badge>
                )}
              </div>
              
              {/* Live Availability Status */}
              {!loading && stats && (
                <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Available Commitments</span>
                    <span className="text-lg font-bold text-blue-600">
                      {stats.availableCommitments}
                    </span>
                  </div>
                  {stats.availableCommitments > 0 ? (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Ready for immediate import
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      No commitments currently available
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                <Link href="/responder/planning?tab=commitments">
                  <Button 
                    className="w-full justify-start bg-blue-600 hover:bg-blue-700" 
                    disabled={loading || (stats ? stats.availableCommitments === 0 : false)}
                  >
                    <HandHeart className="h-4 w-4 mr-2" />
                    Import from Commitments
                    {stats && stats.availableCommitments > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {stats.availableCommitments}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/responder/planning">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Response Planning
                  </Button>
                </Link>
              </div>
              <div className="text-xs text-muted-foreground">
                Access donor-supplied resources, maintain donor attribution, and track commitment usage
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commitment Statistics - Story 4.3 */}
        {hasPermission('RESPONDER') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Commitment Statistics
              </CardTitle>
              <CardDescription>
                Real-time donor commitment availability and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Story 4.3</Badge>
                  <Badge variant="secondary" className="text-xs">Responder</Badge>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Live Data</Badge>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading commitment data...</span>
                  </div>
                ) : error ? (
                  <div className="text-sm text-red-600 py-2">
                    Unable to load commitment statistics
                  </div>
                ) : stats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalCommitments}</div>
                        <div className="text-xs text-muted-foreground">Total Commitments</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{stats.availableCommitments}</div>
                        <div className="text-xs text-muted-foreground">Available</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{stats.recentCommitments}</div>
                        <div className="text-xs text-muted-foreground">This Week</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{stats.totalValue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Units</div>
                      </div>
                    </div>

                    {recentCommitments.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Recent Commitments
                        </div>
                        <div className="space-y-2">
                          {recentCommitments.slice(0, 3).map((commitment) => (
                            <div key={commitment.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <HandHeart className="h-3 w-3 text-blue-500" />
                                <span className="font-medium">{commitment.donor.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={commitment.status === 'PLANNED' ? 'secondary' : 'outline'} 
                                  className="text-xs"
                                >
                                  {commitment.availableQuantity} units
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link href="/responder/planning?tab=commitments">
                      <Button variant="outline" className="w-full" size="sm">
                        View All Commitments
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response Planning - Story 4.1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Response Planning
            </CardTitle>
            <CardDescription>
              Plan and coordinate disaster response resources before deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 4.1</Badge>
                <Badge variant="secondary" className="text-xs">Responder</Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">New</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/responder/planning">
                  <Button className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Response Planning Dashboard
                  </Button>
                </Link>
                {hasPermission('CREATE_RESPONSE') && (
                  <Link href="/responder/planning/new">
                    <Button variant="outline" className="w-full justify-start">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Response Plan
                    </Button>
                  </Link>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Features offline planning, real-time collaboration, and resource management
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Delivery Documentation - Story 4.2 (Responder) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Documentation
            </CardTitle>
            <CardDescription>
              Document actual deliveries with GPS proof and media attachments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 4.2</Badge>
                <Badge variant="secondary" className="text-xs">Responder</Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">New</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/responder/responses">
                  <Button className="w-full justify-start">
                    <Truck className="h-4 w-4 mr-2" />
                    My Planned Responses
                  </Button>
                </Link>
                <Link href="/responder/planning">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Response Planning
                  </Button>
                </Link>
              </div>
              <div className="text-xs text-muted-foreground">
                Features GPS capture, photo proof, and auto-submission for verification
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Verification - Story 4.2 (Coordinator) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Delivery Verification
            </CardTitle>
            <CardDescription>
              Verify documented deliveries and manage delivery approval workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 4.2</Badge>
                <Badge variant="secondary" className="text-xs">Coordinator</Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">New</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/coordinator/verification/deliveries">
                  <Button className="w-full justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Delivery Verification Queue
                  </Button>
                </Link>
                <Link href="/coordinator/verification">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Assessment Verification
                  </Button>
                </Link>
              </div>
              <div className="text-xs text-muted-foreground">
                Review delivery documentation, GPS data, and photo evidence
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management - Admin only */}
        {hasPermission('MANAGE_USERS') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage system users and role assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge variant="destructive" className="text-xs">Admin</Badge>
                <Link href="/admin/users">
                  <Button className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Crisis Management Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Crisis Management
            </CardTitle>
            <CardDescription>
              Coordinate crisis response activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              <Link href="/dashboard/crisis">
                <Button className="w-full" variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View Crisis Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Manage your account settings and view role information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {(user as any).name}</p>
                <p><strong>Email:</strong> {(user as any).email}</p>
                <div className="flex items-center gap-2">
                  <strong>Roles:</strong>
                  {user.roles?.map(r => (
                    <Badge key={r.role.id} variant="secondary" className="text-xs">
                      {r.role.name}
                    </Badge>
                  )) || <Badge variant="outline" className="text-xs">No roles assigned</Badge>}
                </div>
              </div>
              <Link href="/profile">
                <Button className="w-full" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}