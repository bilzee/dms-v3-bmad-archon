'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, CheckCircle, Clock, FileText, Activity, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function CoordinatorDashboard() {
  const { currentRole, user } = useAuth();

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.name}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
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
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">
                8 high priority
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