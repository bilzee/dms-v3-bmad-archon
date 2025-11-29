'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, CheckCircle, Clock, FileText, Activity, PlusCircle, TrendingUp, Shield, BarChart3, Shield as ReportIcon } from 'lucide-react';
import Link from 'next/link';
import { VerificationQueueManagement } from '@/components/dashboards/crisis/VerificationQueueManagement';
import { AutoApprovalConfig } from '@/components/verification/AutoApprovalConfig';
import { EnhancedAutoApprovalConfig } from '@/components/verification/EnhancedAutoApprovalConfig';
import { ResourceManagement } from '@/components/dashboards/crisis/ResourceManagement';
import { useVerificationStore } from '@/stores/verification.store';
import { useEffect, useState } from 'react';

export default function CoordinatorDashboard() {
  const { currentRole, user, token } = useAuth();
  const { assessmentQueueDepth, deliveryQueueDepth, refreshAll } = useVerificationStore();
  const [showAutoApprovalConfig, setShowAutoApprovalConfig] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load verification queue data on mount (with protection)
  useEffect(() => {
    if (!isClient || !token) return; // Only load when client is ready and authenticated
    
    const loadData = async () => {
      try {
        await refreshAll();
      } catch (error) {
        console.error('Failed to load initial dashboard data:', error);
      }
    };
    
    // Add small delay to prevent immediate API calls on mount
    const timeoutId = setTimeout(loadData, 100);
    
    return () => clearTimeout(timeoutId);
  }, [refreshAll, isClient, token]);

  const totalPendingVerifications = (assessmentQueueDepth?.total || 0) + (deliveryQueueDepth?.total || 0);

  // Prevent hydration mismatch by showing loading state on server
  if (!isClient) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

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

  
        {/* Verification Queue Management - Story 6.1 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
              Story 6.1
            </Badge>
            <span className="text-sm text-gray-600">Verification Queue Management</span>
          </div>
          <VerificationQueueManagement />
        </div>

        {/* Resource Management Section - Story 6.3 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              Story 6.3
            </Badge>
            <span className="text-sm text-gray-600">Resource & Donation Management</span>
          </div>
          <ResourceManagement />
        </div>

        {/* Auto-Approval Configuration Section - Story 6.2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
                    Story 6.2
                  </Badge>
                  <span className="text-sm text-gray-600">Auto-Approval Configuration</span>
                </div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Enhanced Auto-Approval Management
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
              <Link href="/coordinator/situation-dashboard?export=true">
                <Button variant="secondary" size="sm" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Export Dashboard Data
                </Button>
              </Link>
              <Link href="/coordinator/situation-dashboard?reports=true">
                <Button variant="secondary" size="sm" className="w-full">
                  <Activity className="mr-2 h-4 w-4" />
                  View Export Reports
                </Button>
              </Link>
              <Link href="/coordinator/reports">
                <Button variant="outline" className="w-full justify-start">
                  <ReportIcon className="mr-2 h-4 w-4" />
                  Report Builder ({totalPendingVerifications})
                </Button>
              </Link>
              <Link href="/coordinator/verification">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  Verification Queue
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

        {/* User Management Access - Story 9.1 & 9.2 */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage system users and monitor audit trails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </Button>
              </Link>
              <Link href="/admin/audit">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Audit Trail & Monitoring
                </Button>
              </Link>
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

      </div>
    </RoleBasedRoute>
  );
}