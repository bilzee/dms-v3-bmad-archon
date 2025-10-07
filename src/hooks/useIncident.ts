import { useIncidentStore } from '@/stores/incident.store'
import { useAuth } from '@/hooks/useAuth'

export const useIncident = () => {
  const store = useIncidentStore()
  const { token } = useAuth()

  // Update localStorage token for store methods
  if (token && typeof window !== 'undefined') {
    localStorage.setItem('token', token)
  }

  return {
    // State
    incidents: store.incidents,
    activeIncidents: store.activeIncidents,
    criticalIncidents: store.criticalIncidents,
    isLoading: store.isLoading,
    error: store.error,
    incidentTypes: store.incidentTypes,

    // Actions
    createIncident: store.createIncident,
    createIncidentFromAssessment: store.createIncidentFromAssessment,
    loadIncidents: store.loadIncidents,
    loadIncidentTypes: store.loadIncidentTypes,
    updateIncidentStatus: store.updateIncidentStatus,

    // Utility
    clearError: store.clearError,
    setError: store.setError,
    getIncidentById: store.getIncidentById
  }
}