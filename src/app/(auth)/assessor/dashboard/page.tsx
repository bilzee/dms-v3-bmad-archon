'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Users, MapPin, TrendingUp, Activity, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function AssessorDashboard() {
  const { currentRole, user } = useAuth();

  return (
    <RoleBasedRoute requiredRole="ASSESSOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessor Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {(user as any)?.name}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
            </p>
          </div>
          <Link href="/assessor/rapid-assessments/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +2 from last week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Communities Covered</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                +3 new communities
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">People Reached</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground">
                +180 from last assessment
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89%</div>
              <p className="text-xs text-muted-foreground">
                +5% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Rapid access to assessment tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/assessor/rapid-assessments" data-testid="rapid-assessments-nav">
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

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>
                Your latest assessment activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      North District Rapid Assessment
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Completed 2 hours ago
                    </p>
                  </div>
                  <Badge className="ml-auto">Completed</Badge>
                </div>
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Community Health Survey
                    </p>
                    <p className="text-sm text-muted-foreground">
                      In progress - 60% complete
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">In Progress</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned Communities</CardTitle>
              <CardDescription>
                Communities assigned to you for assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
      gawa Central
                    </p>
                    <p className="text-sm text-muted-foreground">
                      3 assessments pending
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">High Priority</Badge>
                </div>
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
      Sheria Community
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last assessment 5 days ago
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">Normal</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleBasedRoute>
  );
}