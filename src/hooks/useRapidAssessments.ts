import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { RapidAssessment, CreateRapidAssessmentRequest } from '@/types/rapid-assessment'

// API response schema
const RapidAssessmentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(RapidAssessment),
  error: z.string().optional(),
})

const CreateAssessmentResponseSchema = z.object({
  success: z.boolean(),
  data: RapidAssessment.optional(),
  message: z.string(),
  error: z.string().optional(),
})

type RapidAssessmentsResponse = z.infer<typeof RapidAssessmentsResponseSchema>
type CreateAssessmentResponse = z.infer<typeof CreateAssessmentResponseSchema>

// Query keys
export const rapidAssessmentKeys = {
  all: ['rapidAssessments'] as const,
  lists: () => [...rapidAssessmentKeys.all, 'list'] as const,
  list: (type: string) => [...rapidAssessmentKeys.lists(), { type }] as const,
  details: () => [...rapidAssessmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...rapidAssessmentKeys.details(), id] as const,
}

// Fetch rapid assessments by type
const fetchRapidAssessments = async (type?: string): Promise<RapidAssessment[]> => {
  const url = type ? `/api/v1/rapid-assessments?type=${type}` : '/api/v1/rapid-assessments'
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch rapid assessments: ${response.statusText}`)
  }
  
  const data = await response.json()
  const validatedData = RapidAssessmentsResponseSchema.parse(data)
  
  if (!validatedData.success) {
    throw new Error(validatedData.error || 'Failed to fetch rapid assessments')
  }
  
  return validatedData.data
}

// Create rapid assessment
const createRapidAssessment = async (assessmentData: CreateRapidAssessmentRequest): Promise<RapidAssessment> => {
  const response = await fetch('/api/v1/rapid-assessments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assessmentData),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to create rapid assessment: ${response.statusText}`)
  }
  
  const data = await response.json()
  const validatedData = CreateAssessmentResponseSchema.parse(data)
  
  if (!validatedData.success) {
    throw new Error(validatedData.error || validatedData.message || 'Failed to create rapid assessment')
  }
  
  if (!validatedData.data) {
    throw new Error('No data returned from created assessment')
  }
  
  return validatedData.data
}

// Hook for fetching rapid assessments
export function useRapidAssessments(type?: string) {
  return useQuery({
    queryKey: rapidAssessmentKeys.list(type || 'all'),
    queryFn: () => fetchRapidAssessments(type),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

// Hook for creating rapid assessments
export function useCreateRapidAssessment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createRapidAssessment,
    onSuccess: () => {
      // Invalidate all rapid assessment queries to refetch
      queryClient.invalidateQueries({ queryKey: rapidAssessmentKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create rapid assessment:', error)
    },
  })
}

// Hook for food assessments specifically
export function useFoodAssessments() {
  return useRapidAssessments('FOOD')
}

// Hook for health assessments specifically
export function useHealthAssessments() {
  return useRapidAssessments('HEALTH')
}

// Hook for population assessments specifically
export function usePopulationAssessments() {
  return useRapidAssessments('POPULATION')
}

// Hook for security assessments specifically
export function useSecurityAssessments() {
  return useRapidAssessments('SECURITY')
}

// Hook for shelter assessments specifically
export function useShelterAssessments() {
  return useRapidAssessments('SHELTER')
}

// Hook for WASH assessments specifically
export function useWASHAssessments() {
  return useRapidAssessments('WASH')
}