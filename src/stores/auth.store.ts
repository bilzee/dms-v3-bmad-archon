import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@/types/auth';

interface AuthState {
  // Authentication state
  user: Omit<AuthUser, 'passwordHash'> | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  roles: string[];
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: Omit<AuthUser, 'passwordHash'>, token: string) => void;
  
  // Utility
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
      roles: [],

      setUser: (user, token) => {
        const roles = user.roles.map(ur => ur.role.name)
        const permissions = Array.from(
          new Set(
            user.roles.flatMap(ur => 
              ur.role.permissions.map(rp => rp.permission.code)
            )
          )
        )

        set({
          user,
          token,
          isAuthenticated: true,
          roles,
          permissions,
          isLoading: false
        })
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Login failed')
          }

          const data = await response.json()
          get().setUser(data.data.user, data.data.token)
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Make logout API call (optional for JWT)
        const token = get().token
        if (token) {
          fetch('/api/v1/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).catch(() => {
            // Ignore errors on logout
          })
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: [],
          roles: [],
          isLoading: false
        })
      },

      refresh: async () => {
        const token = get().token
        if (!token) {
          throw new Error('No token available')
        }

        const response = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          // Logout on refresh failure
          get().logout()
          throw new Error('Token refresh failed')
        }

        const data = await response.json()
        set({ token: data.data.token })
      },

      hasPermission: (permission: string) => {
        return get().permissions.includes(permission)
      },

      hasRole: (role: string) => {
        return get().roles.includes(role)
      },

      hasAnyRole: (...roles: string[]) => {
        const userRoles = get().roles
        return roles.some(role => userRoles.includes(role))
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        roles: state.roles
      })
    }
  )
);