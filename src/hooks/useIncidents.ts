'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'

export interface Incident {
  id: string
  type: string
  subType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'DRAFT' | 'ACTIVE' | 'RESOLVED' | 'CLOSED'
  description: string
  location: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  createdAt: string
  updatedAt: string
}

interface UseIncidentsOptions {
  status?: 'ACTIVE' | 'ALL'
  limit?: number
}

async function fetchIncidents(token: string, options: UseIncidentsOptions = {}): Promise<Incident[]> {
  const { status = 'ACTIVE', limit = 50 } = options
  
  const params = new URLSearchParams()
  if (status !== 'ALL') {
    params.append('status', status)
  }
  if (limit) {
    params.append('limit', limit.toString())
  }

  const response = await fetch(`/api/v1/incidents?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch incidents')
  }

  const result = await response.json()
  return result.data || []
}

export function useIncidents(options: UseIncidentsOptions = {}) {
  const { token } = useAuthStore()

  return useQuery({
    queryKey: ['incidents', options],
    queryFn: () => {
      if (!token) {
        throw new Error('No authentication token available')
      }
      return fetchIncidents(token, options)
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useActiveIncidents() {
  return useIncidents({ status: 'ACTIVE' })
}