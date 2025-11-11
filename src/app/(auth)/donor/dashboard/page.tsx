'use client'

import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { DonorDashboard } from '@/components/donor/DonorDashboard'
import { Badge } from '@/components/ui/badge'

export default function DonorDashboardPage() {
  const { currentRole, user } = useAuth()

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {(user as any)?.name}. Your current role is: <Badge variant="outline">{currentRole}</Badge>
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <DonorDashboard />
      </div>
    </RoleBasedRoute>
  )
}