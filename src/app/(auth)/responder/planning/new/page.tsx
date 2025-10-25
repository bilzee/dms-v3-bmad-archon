'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Icons
import { ArrowLeft, Package } from 'lucide-react'

// Forms and components
import { ResponsePlanningForm } from '@/components/forms/response'

export default function NewResponsePlanningPage() {
  const router = useRouter()

  const handleCancel = () => {
    router.push('/responder/planning')
  }

  const handleSuccess = () => {
    router.push('/responder/planning')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Response Plans
        </Button>
        <Badge variant="outline">
          NEW RESPONSE PLAN
        </Badge>
      </div>
      
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Response Plan
          </CardTitle>
          <CardDescription>
            Plan and coordinate disaster response resources before deployment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsePlanningForm
            mode="create"
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  )
}