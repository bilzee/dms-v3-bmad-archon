import { Incident } from '@prisma/client'

export interface IncidentData {
  type: string
  subType?: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED'
  description: string
  location: string
  coordinates?: { lat: number; lng: number }
}

export interface CreateIncidentRequest {
  data: IncidentData
  preliminaryAssessmentId?: string
}

export interface IncidentResponse {
  data: Incident
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface IncidentListResponse {
  data: Incident[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}