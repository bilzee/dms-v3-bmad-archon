'use client'

import { useAuth } from '@/hooks/useAuth'
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
  PlusCircle
} from 'lucide-react'

export default function DashboardPage() {
  const { user, hasPermission } = useAuth()

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