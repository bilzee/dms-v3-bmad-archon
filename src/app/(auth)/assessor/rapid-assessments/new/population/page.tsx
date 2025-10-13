'use client'

import { useEffect, useState } from 'react'
import { PopulationAssessmentForm } from '@/components/forms/assessment'
import { usePopulationAssessment } from '@/hooks/usePopulationAssessment'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, AlertTriangle, FileText, Clock, Wifi, WifiOff, RefreshCw, Plus, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function PopulationAssessmentPage() {
  const { user, hasRole } = useAuth()
  const { 
    loadAssessments, 
    loadDrafts,
    syncDrafts,
    deleteDraft,
    recentAssessments, 
    drafts, 
    isLoading,
    error 
  } = usePopulationAssessment()
  
  const [showForm, setShowForm] = useState(false)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (hasRole('ASSESSOR')) {
      loadAssessments()
      loadDrafts()
    }
  }, [hasRole, loadAssessments, loadDrafts])

  // Set online status client-side only to prevent hydration errors
  useEffect(() => {
    setIsOnline(navigator?.onLine ?? false)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleSyncDrafts = async () => {
    try {
      await syncDrafts()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteDraft(draftId)
      // If the deleted draft was selected, clear the selection
      if (selectedDraftId === draftId) {
        setSelectedDraftId(null)
        setShowForm(false)
      }
    } catch (error) {
      console.error('Delete draft failed:', error)
    }
  }

  const handlePopulationSubmit = async (data: any) => {
    console.log('Population assessment submitted:', data)
    // This would typically call an API or service to save the assessment
    setShowForm(false)
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
        <div className="flex items-center gap-4">
          <Link href="/assessor/rapid-assessments/new">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Assessment Types
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Population Assessment</h1>
            <p className="text-gray-600">
              Evaluate demographics, population counts, and vulnerable groups
            </p>
          </div>
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
                  Create New Assessment
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
                      <div key={draft.id} className="flex items-center justify-between p-2 hover:bg-gray-100 group">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedDraftId(draft.id)
                            setShowForm(true)
                            setFormKey(prev => prev + 1)
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {draft.data.populationAssessment?.totalPopulation ? `${draft.data.populationAssessment.totalPopulation} Population Assessment` : 'Population Draft'} - {draft.data.affectedEntityId || 'Unknown Entity'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {draft.autoSaved ? 'Auto-saved' : 'Manual save'} - {new Date(draft.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDraft(draft.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
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
              Submitted population assessments
            </p>
            {recentAssessments.length > 0 && (
              <div className="mt-2 space-y-1">
                {recentAssessments.slice(0, 3).map((assessment) => (
                  <div key={assessment.id} className="text-xs text-gray-600">
                    {assessment.affectedEntityId} - {new Date(assessment.createdAt).toLocaleDateString()}
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
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
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
                  onClick={handleSyncDrafts}
                  disabled={isLoading || !isOnline}
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
          <AlertDescription>{error}</AlertDescription>
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
        <Card>
          <CardHeader>
            <CardTitle>Population Assessment Form</CardTitle>
            <CardDescription>
              Complete all sections to the best of your ability. Fields marked with * are required.
              <br />
              <span className="text-sm text-blue-600">
                ✅ Auto-populated fields: Assessor Name (from your profile) and Assessment Date (current date/time)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PopulationAssessmentForm
              key={formKey}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Population Counts:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Count total affected population</li>
                  <li>• Identify demographic breakdowns</li>
                  <li>• Assess population density</li>
                  <li>• Note displacement patterns</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Vulnerable Groups:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Identify children, elderly, disabled</li>
                  <li>• Assess pregnant and lactating women</li>
                  <li>• Note chronic illness patients</li>
                  <li>• Evaluate specific protection needs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}