import { useAuthStore } from '@/stores/auth.store'
import { UseAuthReturn } from '@/types/auth'

export const useAuth = (): UseAuthReturn => {
  const store = useAuthStore()
  
  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    permissions: store.permissions,
    roles: store.roles,
    login: store.login,
    logout: store.logout,
    refresh: store.refresh,
    hasPermission: store.hasPermission,
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole
  }
}