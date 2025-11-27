'use client'

import { useEffect, useState } from 'react'
import { PreliminaryAssessmentForm } from '@/components/forms/assessment/PreliminaryAssessmentForm'
import { usePreliminaryAssessment } from '@/hooks/usePreliminaryAssessment'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, FileText, Clock, Wifi, WifiOff, RefreshCw, Plus, Edit } from 'lucide-react'

export default function PreliminaryAssessmentPage() {
  const { user, hasRole } = useAuth()
  const { 
    loadAssessments, 
    loadOfflineAssessments,
    syncOfflineAssessments,
    recentAssessments, 
    drafts, 
    isLoading,
    error 
  } = usePreliminaryAssessment()
  
  const [showForm, setShowForm] = useState(false)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (hasRole('ASSESSOR')) {
      loadAssessments()
      loadOfflineAssessments()
    }
  }, [hasRole, loadAssessments, loadOfflineAssessments])

  const handleSyncOffline = async () => {
    try {
      await syncOfflineAssessments()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const offlineCount = recentAssessments.filter((a: any) => a._offline).length
  const pendingCount = recentAssessments.filter((a: any) => a._syncStatus === 'pending').length

  if (!hasRole('ASSESSOR')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Assessor role is required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preliminary Assessment</h1>
          <p className="text-gray-600">
            Create initial disaster impact assessments for incident response
          </p>
        </div>
        <OfflineIndicator />
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Drafts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Saved Drafts
            </CardTitle>
            <Badge variant="secondary">{drafts.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drafts.length}</div>
            <p className="text-xs text-muted-foreground">
              Unsaved assessment drafts
            </p>
            {drafts.length > 0 && (
              <div className="mt-3">
                <Button
                  onClick={() => {
                    setSelectedDraftId(null)
                    setShowForm(true)
                    setFormKey(prev => prev + 1)
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full mb-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Continue Draft
                </Button>
                <Select onValueChange={(value) => {
                  setSelectedDraftId(value)
                  setShowForm(true)
                  setFormKey(prev => prev + 1)
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a draft to continue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drafts.map((draft) => (
                      <SelectItem key={draft.id} value={draft.id}>
                        <div className="flex flex-col">
                          <span className="text-sm">{draft.data?.reportingLGA || 'Draft'} - {draft.data?.reportingWard || 'Unknown Ward'}</span>
                          <span className="text-xs text-gray-500">
                            {draft.autoSaved ? 'Auto-saved' : 'Manual save'} - {new Date(draft.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assessments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Assessments</CardTitle>
            <Badge variant="secondary">{recentAssessments.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAssessments.length}</div>
            <p className="text-xs text-muted-foreground">
              Submitted assessments
            </p>
            {recentAssessments.length > 0 && (
              <div className="mt-2 space-y-1">
                {recentAssessments.slice(0, 3).map((assessment) => (
                  <div key={assessment.id} className="text-xs text-gray-600">
                    {assessment.reportingLGA}, {assessment.reportingWard} - {new Date(assessment.createdAt).toLocaleDateString()}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {navigator?.onLine ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              Sync Status
            </CardTitle>
            <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
              {pendingCount} pending
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offlineCount}</div>
            <p className="text-xs text-muted-foreground">
              Offline assessments
            </p>
            {pendingCount > 0 && (
              <div className="mt-2">
                <Button
                  onClick={handleSyncOffline}
                  disabled={isLoading || !navigator?.onLine}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sync Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : String(error)}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      {!showForm && (
        <div className="flex gap-4">
          <Button
            onClick={() => {
              setSelectedDraftId(null)
              setShowForm(true)
              setFormKey(prev => prev + 1)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Assessment
          </Button>
        </div>
      )}

      {/* Main Form */}
      {showForm && (
        <PreliminaryAssessmentForm
          key={formKey}
          disabled={isLoading}
          showIncidentCreation={false}
          selectedDraftId={selectedDraftId}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}