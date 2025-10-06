import { useAuthStore } from '@/stores/auth.store'
import { UseAuthReturn, RoleName } from '@/types/auth'

export const useAuth = (): UseAuthReturn => {
  const store = useAuthStore()
  
  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    permissions: store.permissions,
    roles: store.roles,
    currentRole: store.currentRole,
    availableRoles: store.availableRoles,
    login: store.login,
    logout: store.logout,
    refresh: store.refresh,
    
    // Role switching
    switchRole: store.switchRole,
    canSwitchToRole: store.canSwitchToRole,
    
    // Role session management
    saveRoleSession: store.saveRoleSession,
    getRoleSession: store.getRoleSession,
    clearRoleSession: store.clearRoleSession,
    getCurrentRolePermissions: store.getCurrentRolePermissions,
    
    // Utility
    hasPermission: store.hasPermission,
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole
  }
}