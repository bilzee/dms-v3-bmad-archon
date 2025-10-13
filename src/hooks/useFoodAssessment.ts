import { useState, useEffect, useCallback } from 'react'
import { RapidAssessment, CreateFoodAssessmentRequest } from '@/types/rapid-assessment'

interface FoodAssessmentDraft {
  id: string
  data: Partial<CreateFoodAssessmentRequest>
  timestamp: number
  autoSaved: boolean
}

interface UseFoodAssessmentReturn {
  recentAssessments: RapidAssessment[]
  drafts: FoodAssessmentDraft[]
  isLoading: boolean
  error: string | null
  loadAssessments: () => Promise<void>
  loadDrafts: () => Promise<void>
  saveDraft: (data: Partial<CreateFoodAssessmentRequest>) => Promise<void>
  deleteDraft: (draftId: string) => Promise<void>
  syncDrafts: () => Promise<void>
}

export function useFoodAssessment(): UseFoodAssessmentReturn {
  const [recentAssessments, setRecentAssessments] = useState<RapidAssessment[]>([])
  const [drafts, setDrafts] = useState<FoodAssessmentDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load recent food assessments
  const loadAssessments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/v1/rapid-assessments?type=FOOD')
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
      const storedDrafts = localStorage.getItem('food-assessment-drafts')
      if (storedDrafts) {
        const parsedDrafts: FoodAssessmentDraft[] = JSON.parse(storedDrafts)
        setDrafts(parsedDrafts)
      }
    } catch (err) {
      console.error('Error loading drafts:', err)
    }
  }, [])

  // Save draft to localStorage
  const saveDraft = useCallback(async (data: Partial<CreateFoodAssessmentRequest>) => {
    try {
      const newDraft: FoodAssessmentDraft = {
        id: `draft-${Date.now()}`,
        data,
        timestamp: Date.now(),
        autoSaved: false
      }

      const existingDrafts = JSON.parse(localStorage.getItem('food-assessment-drafts') || '[]')
      const updatedDrafts = [...existingDrafts, newDraft]
      
      localStorage.setItem('food-assessment-drafts', JSON.stringify(updatedDrafts))
      setDrafts(updatedDrafts)
    } catch (err) {
      console.error('Error saving draft:', err)
      throw err
    }
  }, [])

  // Delete draft from localStorage
  const deleteDraft = useCallback(async (draftId: string) => {
    try {
      const existingDrafts = JSON.parse(localStorage.getItem('food-assessment-drafts') || '[]')
      const updatedDrafts = existingDrafts.filter((draft: FoodAssessmentDraft) => draft.id !== draftId)
      
      localStorage.setItem('food-assessment-drafts', JSON.stringify(updatedDrafts))
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