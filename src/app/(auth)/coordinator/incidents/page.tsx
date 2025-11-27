import { Suspense } from 'react'
import { IncidentManagement } from '@/components/coordinator/IncidentManagement'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Incident Management',
  description: 'Create and manage disaster incidents for crisis response coordination'
}

export default function IncidentsPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<div>Loading incidents...</div>}>
        <IncidentManagement 
          showCreateButton={true}
          enableRealTimeUpdates={true}
          autoSave={true}
          gpsEnabled={true}
        />
      </Suspense>
    </div>
  )
}