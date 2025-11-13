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
  Loader2,
  UserPlus,
  Heart,
  Award,
  Target,
  Building2
} from 'lucide-react'

export default function DashboardPage() {
  const { user, hasPermission, hasRole } = useAuth()
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
        {/* Donor Entity Assignment - Story 5.2 Enhancement */}
        {hasPermission('MANAGE_ENTITIES') && (
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-indigo-600" />
                Donor Entity Assignment
              </CardTitle>
              <CardDescription>
                Manage entity assignments for donor organizations and commitment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Story 5.2</Badge>
                  <Badge variant="secondary" className="text-xs">Coordinator</Badge>
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">Enhanced</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Link href="/coordinator/entities?filter=donor">
                    <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700">
                      <HandHeart className="h-4 w-4 mr-2" />
                      Assign Donor Entities
                    </Button>
                  </Link>
                  <Link href="/coordinator/entities">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      All Entity Assignments
                    </Button>
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">
                  Enhanced entity assignment system with donor support, bulk assignment capabilities, and commitment overview interface
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
        {hasRole('RESPONDER') && (
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

        {/* Donor Registration - Story 5.1 */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Donor Registration
            </CardTitle>
            <CardDescription>
              Register donor organizations and manage their contributions to disaster response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 5.1</Badge>
                <Badge variant="secondary" className="text-xs">Public Access</Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">New</Badge>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-green-200">Complete</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/register">
                  <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register as Donor
                  </Button>
                </Link>
                {hasPermission('MANAGE_USERS') && (
                  <Link href="/admin/donors">
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      Manage Donors (Admin)
                    </Button>
                  </Link>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Features multi-step registration, organization profile management, and entity assignment
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donor Portal & Management - Story 5.1 */}
        {(hasPermission('VIEW_DONOR_DASHBOARD') || hasPermission('MANAGE_USERS')) && (
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-600" />
                Donor Portal
              </CardTitle>
              <CardDescription>
                Access donor dashboard, manage profiles, view assessments, and track contribution impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Story 5.1</Badge>
                  <Badge variant="secondary" className="text-xs">Donor Role</Badge>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Complete</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {hasPermission('VIEW_DONOR_DASHBOARD') && (
                    <Link href="/donor/dashboard">
                      <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700">
                        <Heart className="h-4 w-4 mr-2" />
                        Donor Dashboard
                      </Button>
                    </Link>
                  )}
                  {hasPermission('VIEW_DONOR_DASHBOARD') && (
                    <Link href="/rapid-assessments">
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        View Assessments
                      </Button>
                    </Link>
                  )}
                  <Link href="/donor/profile">
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Donor Profile
                    </Button>
                  </Link>
                  <Link href="/donor/entities">
                    <Button variant="outline" className="w-full justify-start">
                      <MapPin className="h-4 w-4 mr-2" />
                      Assigned Entities
                    </Button>
                  </Link>
                  {hasPermission('MANAGE_USERS') && (
                    <Link href="/admin/donors/metrics">
                      <Button variant="outline" className="w-full justify-start">
                        <Award className="h-4 w-4 mr-2" />
                        Donor Metrics
                      </Button>
                    </Link>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Features performance metrics, commitment tracking, and read-only assessment viewing
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commitment Management - Story 5.2 */}
        {hasPermission('VIEW_DONOR_DASHBOARD') && (
          <Card className="border-violet-200 bg-violet-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-600" />
                Commitment Management
              </CardTitle>
              <CardDescription>
                Register and manage aid commitments with real-time status tracking and value estimation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Story 5.2</Badge>
                  <Badge variant="secondary" className="text-xs">Donor Role</Badge>
                  <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">New</Badge>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Complete</Badge>
                </div>
                
                {/* Live Commitment Stats */}
                {!loading && stats && (
                  <div className="bg-white/60 rounded-lg p-3 border border-violet-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Your Commitments</span>
                      <span className="text-lg font-bold text-violet-600">
                        {stats.totalCommitments}
                      </span>
                    </div>
                    <div className="text-xs text-violet-600 mt-1">
                      ✓ Multi-step form with preview functionality
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-2">
                  <Link href="/donor/dashboard?tab=commitments">
                    <Button className="w-full justify-start bg-violet-600 hover:bg-violet-700">
                      <Target className="h-4 w-4 mr-2" />
                      Manage Commitments
                    </Button>
                  </Link>
                  <Link href="/donor/dashboard?action=new-commitment">
                    <Button variant="outline" className="w-full justify-start">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Register New Commitment
                    </Button>
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">
                  Features commitment form (item/unit/quantity), entity assignment, incident tracking, delivery reporting, status tracking (Planned/Partial/Complete), and value estimation
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commitment Status Tracking - Story 5.2 */}
        {(hasPermission('VIEW_DONOR_DASHBOARD') || hasPermission('VIEW_RESPONSE')) && (
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Commitment Status Tracking
              </CardTitle>
              <CardDescription>
                Track commitment delivery progress with real-time status updates and reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Story 5.2</Badge>
                  <Badge variant="secondary" className="text-xs">All Roles</Badge>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Complete</Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {hasPermission('VIEW_DONOR_DASHBOARD') && (
                    <Link href="/donor/dashboard?tab=commitments">
                      <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Your Commitment Status
                      </Button>
                    </Link>
                  )}
                  {hasPermission('VIEW_DONOR_DASHBOARD') && (
                    <Link href="/donor/responses">
                      <Button variant="outline" className="w-full justify-start">
                        <Truck className="h-4 w-4 mr-2" />
                        All Commitments Status
                      </Button>
                    </Link>
                  )}
                  {hasPermission('VIEW_RESPONSE') && (
                    <Link href="/responder/planning?tab=commitments&filter=status">
                      <Button variant="outline" className="w-full justify-start">
                        <Clock className="h-4 w-4 mr-2" />
                        Response Planning
                      </Button>
                    </Link>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Real-time status tracking: Planned → Partial → Complete with delivery verification and affected entity reporting
                </div>
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

        {/* Response Verification Process - Story 4.4 */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              Response Verification Process
            </CardTitle>
            <CardDescription>
              Complete response verification workflow with donor attribution and auto-approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Story 4.4</Badge>
                <Badge variant="secondary" className="text-xs">Coordinator</Badge>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Latest</Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Complete</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/coordinator/verification?tab=responses">
                  <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Response Verification Queue
                  </Button>
                </Link>
                <Link href="/coordinator/verification/auto-approval">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Auto-Approval Configuration
                  </Button>
                </Link>
                <Link href="/coordinator/verification">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Verification Dashboard
                  </Button>
                </Link>
              </div>
              <div className="text-xs text-muted-foreground">
                Features response queue filtering, donor attribution visibility, approve/reject with feedback, and auto-approval support
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