import { CreatePlannedResponseInput, ResponseItem } from '@/lib/validation/response'
import { useAuthStore } from '@/stores/auth.store'

export class ResponseService {
  private static readonly BASE_URL = '/api/v1/responses'

  static async createPlannedResponse(data: CreatePlannedResponseInput) {
    const response = await fetch(`${this.BASE_URL}/planned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create planned response')
    }

    const result = await response.json()
    return result.data
  }

  static async getResponseById(id: string) {
    const response = await fetch(`${this.BASE_URL}/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get response')
    }

    const result = await response.json()
    return result.data
  }

  static async updatePlannedResponse(id: string, data: Partial<CreatePlannedResponseInput>) {
    const response = await fetch(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update response')
    }

    const result = await response.json()
    return result.data
  }

  static async getPlannedResponsesForResponder(query: {
    assessmentId?: string
    entityId?: string
    type?: string
    page?: number
    limit?: number
  } = {}) {
    const searchParams = new URLSearchParams()
    
    if (query.assessmentId) searchParams.append('assessmentId', query.assessmentId)
    if (query.entityId) searchParams.append('entityId', query.entityId)
    if (query.type) searchParams.append('type', query.type)
    if (query.page) searchParams.append('page', query.page.toString())
    if (query.limit) searchParams.append('limit', query.limit.toString())

    const response = await fetch(`${this.BASE_URL}/planned/assigned?${searchParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get assigned responses')
    }

    const result = await response.json()
    // Transform API response format to match client expectations
    return {
      responses: result.data,
      total: result.meta?.total || 0
    }
  }

  static async checkAssessmentConflicts(assessmentId: string) {
    const response = await fetch(`${this.BASE_URL}/conflicts/${assessmentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to check assessment conflicts')
    }

    const result = await response.json()
    return result.data
  }

  static async getCollaborationStatus(responseId: string) {
    const response = await fetch(`${this.BASE_URL}/${responseId}/collaboration`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get collaboration status')
    }

    const result = await response.json()
    return result.data
  }

  static async updateCollaboration(responseId: string, action: 'join' | 'leave' | 'start_editing' | 'stop_editing') {
    const response = await fetch(`${this.BASE_URL}/${responseId}/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ action })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update collaboration')
    }

    const result = await response.json()
    return result.data
  }

  private static getAuthToken(): string {
    if (typeof window === 'undefined') {
      throw new Error('getAuthToken can only be called on client side')
    }

    // Get token from auth store
    const authStore = useAuthStore.getState()
    const token = authStore.token
    
    if (!token) {
      throw new Error('User not authenticated - no token found')
    }

    return token
  }
}

// Export singleton instance for client-side use
export const responseService = new ResponseService()