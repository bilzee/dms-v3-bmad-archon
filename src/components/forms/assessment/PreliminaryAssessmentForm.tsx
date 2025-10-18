'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

interface PreliminaryAssessmentFormProps {
  disabled?: boolean
  showIncidentCreation?: boolean
  selectedDraftId?: string | null
  onCancel?: () => void
}

export function PreliminaryAssessmentForm({
  disabled = false,
  showIncidentCreation = false,
  selectedDraftId = null,
  onCancel
}: PreliminaryAssessmentFormProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preliminary Assessment Form</CardTitle>
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={disabled}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The Preliminary Assessment form is currently under development. 
            This feature will be available in a future update.
          </AlertDescription>
        </Alert>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            In the meantime, you can use the specific assessment forms available:
          </p>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
            <li>Health Assessment</li>
            <li>WASH Assessment</li>
            <li>Shelter Assessment</li>
            <li>Food Assessment</li>
            <li>Security Assessment</li>
            <li>Population Assessment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}