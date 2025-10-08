import { useState, useEffect, useCallback } from 'react'
import { RapidAssessment, CreateHealthAssessmentRequest } from '@/types/rapid-assessment'

interface HealthAssessmentDraft {
  id: string
  data: Partial<CreateHealthAssessmentRequest>
  timestamp: number
  autoSaved: boolean
}

interface UseHealthAssessmentReturn {
  recentAssessments: RapidAssessment[]
  drafts: HealthAssessmentDraft[]
  isLoading: boolean
  error: string | null
  loadAssessments: () => Promise<void>
  loadDrafts: () => Promise<void>
  saveDraft: (data: Partial<CreateHealthAssessmentRequest>) => Promise<void>
  deleteDraft: (draftId: string) => Promise<void>
  syncDrafts: () => Promise<void>
}

export function useHealthAssessment(): UseHealthAssessmentReturn {
  const [recentAssessments, setRecentAssessments] = useState<RapidAssessment[]>([])
  const [drafts, setDrafts] = useState<HealthAssessmentDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load recent health assessments
  const loadAssessments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/v1/rapid-assessments?type=HEALTH')
      const result = await response.json()
      
      if (result.success) {
        setRecentAssessments(result.data || [])
      } else {
        setError(result.message || 'Failed to load assessments')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load drafts from localStorage
  const loadDrafts = useCallback(async () => {
    try {
      const storedDrafts = localStorage.getItem('health-assessment-drafts')
      if (storedDrafts) {
        const parsedDrafts: HealthAssessmentDraft[] = JSON.parse(storedDrafts)
        setDrafts(parsedDrafts)
      }
    } catch (err) {
      console.error('Error loading drafts:', err)
    }
  }, [])

  // Save draft to localStorage
  const saveDraft = useCallback(async (data: Partial<CreateHealthAssessmentRequest>) => {
    try {
      const newDraft: HealthAssessmentDraft = {
        id: `draft-${Date.now()}`,
        data,
        timestamp: Date.now(),
        autoSaved: false
      }

      const existingDrafts = JSON.parse(localStorage.getItem('health-assessment-drafts') || '[]')
      const updatedDrafts = [...existingDrafts, newDraft]
      
      localStorage.setItem('health-assessment-drafts', JSON.stringify(updatedDrafts))
      setDrafts(updatedDrafts)
    } catch (err) {
      console.error('Error saving draft:', err)
      throw err
    }
  }, [])

  // Delete draft from localStorage
  const deleteDraft = useCallback(async (draftId: string) => {
    try {
      const existingDrafts = JSON.parse(localStorage.getItem('health-assessment-drafts') || '[]')
      const updatedDrafts = existingDrafts.filter((draft: HealthAssessmentDraft) => draft.id !== draftId)
      
      localStorage.setItem('health-assessment-drafts', JSON.stringify(updatedDrafts))
      setDrafts(updatedDrafts)
    } catch (err) {
      console.error('Error deleting draft:', err)
      throw err
    }
  }, [])

  // Sync drafts to server
  const syncDrafts = useCallback(async () => {
    // This would implement syncing logic for offline drafts
    // For now, it's a placeholder
    console.log('Syncing drafts...')
  }, [])

  
  return {
    recentAssessments,
    drafts,
    isLoading,
    error,
    loadAssessments,
    loadDrafts,
    saveDraft,
    deleteDraft,
    syncDrafts
  }
}