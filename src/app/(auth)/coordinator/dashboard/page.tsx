'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, CheckCircle, Clock, FileText, Activity, PlusCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { VerificationQueueManagement } from '@/components/dashboards/crisis/VerificationQueueManagement';
import { AutoApprovalConfig } from '@/components/verification/AutoApprovalConfig';
import { EnhancedAutoApprovalConfig } from '@/components/verification/EnhancedAutoApprovalConfig';
import { ResourceManagement } from '@/components/dashboards/crisis/ResourceManagement';
import { useVerificationStore } from '@/stores/verification.store';
import { useEffect, useState } from 'react';

export default function CoordinatorDashboard() {
  const { currentRole, user } = useAuth();
  const { assessmentQueueDepth, deliveryQueueDepth, refreshAll } = useVerificationStore();
  const [showAutoApprovalConfig, setShowAutoApprovalConfig] = useState(false);

  // Load verification queue data on mount
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const totalPendingVerifications = (assessmentQueueDepth?.total || 0) + (deliveryQueueDepth?.total || 0);

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {(user as any)?.name}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
            </p>
          </div>
          <Button>
            <AlertTriangle className="h-4 w-4 mr-2" />
              New Response
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Responses</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                2 critical priority
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Responders Deployed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                18 in field, 6 on standby
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPendingVerifications}</div>
              <p className="text-xs text-muted-foreground">
                {(assessmentQueueDepth?.critical || 0) + (deliveryQueueDepth?.critical || 0)} critical priority
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                95% target achieved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Verification Queue Management */}
        <VerificationQueueManagement />

        {/* Resource Management Section */}
        <ResourceManagement />

        {/* Auto-Approval Configuration Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Auto-Approval Configuration
                </CardTitle>
                <CardDescription>
                  Manage automatic verification settings directly from the dashboard
                </CardDescription>
              </div>
              <Button 
                variant={showAutoApprovalConfig ? "secondary" : "outline"}
                onClick={() => setShowAutoApprovalConfig(!showAutoApprovalConfig)}
              >
                {showAutoApprovalConfig ? 'Hide Configuration' : 'Show Configuration'}
              </Button>
            </div>
          </CardHeader>
          {showAutoApprovalConfig && (
            <CardContent>
              <EnhancedAutoApprovalConfig compactMode={false} />
            </CardContent>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common coordinator tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/coordinator/verification">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  Verification Queue ({totalPendingVerifications})
                </Button>
              </Link>
              <Link href="/assessor/rapid-assessments">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Assessments
                </Button>
              </Link>
              <Link href="/coordinator/verification/auto-approval">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Auto-Approval Settings
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Response
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rapid Assessments Access */}
        <Card>
          <CardHeader>
            <CardTitle>Rapid Assessments</CardTitle>
            <CardDescription>
              Access and monitor rapid assessment activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/assessor/rapid-assessments">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  View All Assessments
                </Button>
              </Link>
              <Link href="/assessor/rapid-assessments/new">
                <Button className="w-full justify-start">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Assessment
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Response Management */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Critical Incidents</CardTitle>
              <CardDescription>
                Incidents requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Flood Response - North District
                    </p>
                    <p className="text-sm text-muted-foreground">
                      12 responders deployed, 3 hours ago
                    </p>
                  </div>
                  <Badge className="ml-auto">Critical</Badge>
                </div>
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Medical Emergency - East Sector
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Medical team dispatched, 30 min ago
                    </p>
                  </div>
                  <Badge className="ml-auto">Critical</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Status</CardTitle>
              <CardDescription>
                Current status of response teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Alpha Team
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Responding to North District flood
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">Deployed</Badge>
                </div>
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Medical Team
                    </p>
                    <p className="text-sm text-muted-foreground">
                      On route to East Sector
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">En Route</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleBasedRoute>
  );
}