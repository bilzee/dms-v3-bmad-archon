'use client'

import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { DonorMetricsDashboard } from '@/components/dashboards/crisis/DonorMetricsDashboard'

export default function DonorMetricsPage() {
  return (
    <RoleBasedRoute requiredRole="COORDINATOR" fallbackPath="/dashboard">
      <DonorMetricsDashboard />
    </RoleBasedRoute>
  )
}