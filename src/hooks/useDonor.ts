import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DonorProfileUpdateInput } from '@/lib/validation/donor'

export interface DonorProfile {
  id: string
  name: string
  type: string
  contactEmail?: string
  contactPhone?: string
  organization?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  metrics: {
    commitments: {
      total: number
      totalCommitted: number
      delivered: number
      deliveryRate: number
    }
    responses: {
      total: number
    }
    combined: {
      totalActivities: number
    }
  }
}

export interface DonorProfileResponse {
  donor: DonorProfile
}

export interface DonorEntity {
  id: string
  name: string
  type: string
  location?: string
  coordinates?: any
  isActive: boolean
  autoApproveEnabled: boolean
  createdAt: string
  stats: {
    verifiedAssessments: number
    responses: number
    commitments: number
  }
}

export interface DonorEntitiesResponse {
  entities: DonorEntity[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary: {
    totalAssigned: number
    totalWithResponses: number
    totalWithCommitments: number
  }
}

// Hook for donor profile operations
export function useDonorProfile() {
  const queryClient = useQueryClient()

  const {
    data: profileData,
    isLoading,
    error,
    refetch
  } = useQuery<DonorProfileResponse>({
    queryKey: ['donor-profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/v1/donors/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch donor profile')
      }

      return response.json()
    },
    enabled: !!localStorage.getItem('auth_token')
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: DonorProfileUpdateInput) => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/v1/donors/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-profile'] })
    }
  })

  return {
    profile: profileData?.donor,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending
  }
}

// Hook for donor entities
export function useDonorEntities(filters?: {
  search?: string
  type?: string
  page?: number
  limit?: number
}) {
  const {
    data: entitiesData,
    isLoading,
    error,
    refetch
  } = useQuery<DonorEntitiesResponse>({
    queryKey: ['donor-entities', filters],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const response = await fetch(`/api/v1/donors/entities?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch donor entities')
      }

      return response.json()
    },
    enabled: !!localStorage.getItem('auth_token')
  })

  return {
    entities: entitiesData?.entities || [],
    pagination: entitiesData?.pagination,
    summary: entitiesData?.summary,
    isLoading,
    error,
    refetch
  }
}

// Hook for donor registration
export function useDonorRegistration() {
  const mutation = useMutation({
    mutationFn: async (data: {
      name: string
      type: string
      contactEmail?: string
      contactPhone?: string
      organization?: string
      userCredentials: {
        username: string
        password: string
        email: string
        name: string
      }
    }) => {
      const response = await fetch('/api/v1/donors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Registration failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Store auth token
      localStorage.setItem('auth_token', data.data.token)
      localStorage.setItem('user_data', JSON.stringify(data.data.user))
    }
  })

  return {
    register: mutation.mutateAsync,
    isRegistering: mutation.isPending,
    error: mutation.error,
    data: mutation.data
  }
}

// Hook for donor authentication context
export function useDonorAuth() {
  const profileResult = useDonorProfile()

  const isDonor = !!profileResult.profile
  const isProfileComplete = !!(
    profileResult.profile?.name && 
    (profileResult.profile?.contactEmail || profileResult.profile?.contactPhone)
  )

  return {
    isDonor,
    isProfileComplete,
    profile: profileResult.profile,
    isLoading: profileResult.isLoading,
    error: profileResult.error
  }
}