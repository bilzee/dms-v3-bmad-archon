import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  currentRole: UserRole;
  assignedEntities: string[];
  permissions: string[];
  lastLogin?: Date;
}

export interface UserRole {
  id: string;
  name: 'assessor' | 'coordinator' | 'responder' | 'donor' | 'admin';
  displayName: string;
  permissions: string[];
}

interface AuthState {
  // Authentication state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken?: string;
  refreshToken?: string;
  sessionExpiry?: Date;
  
  // Role management
  availableRoles: UserRole[];
  
  // Actions
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  switchRole: (roleId: string) => void;
  updateUser: (updates: Partial<User>) => void;
  
  // Session management
  setSession: (tokens: { sessionToken: string; refreshToken: string; expiresIn: number }) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
  
  // Utility
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  canAccessEntity: (entityId: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      availableRoles: [],

      // Authentication actions
      login: async (credentials: { email: string; password: string }) => {
        set({ isLoading: true });
        
        try {
          // This would typically make an API call
          // For now, implementing mock authentication
          const mockUser: User = {
            id: 'user-1',
            email: credentials.email,
            name: 'Test User',
            roles: [
              {
                id: 'role-assessor',
                name: 'assessor',
                displayName: 'Assessor',
                permissions: ['create_assessment', 'edit_assessment', 'view_entities']
              },
              {
                id: 'role-coordinator',
                name: 'coordinator',
                displayName: 'Coordinator',
                permissions: ['view_all_assessments', 'assign_entities', 'approve_responses']
              }
            ],
            currentRole: {
              id: 'role-assessor',
              name: 'assessor',
              displayName: 'Assessor',
              permissions: ['create_assessment', 'edit_assessment', 'view_entities']
            },
            assignedEntities: ['entity-1', 'entity-2'],
            permissions: ['create_assessment', 'edit_assessment', 'view_entities'],
            lastLogin: new Date()
          };

          const tokens = {
            sessionToken: 'mock-session-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 86400 // 24 hours
          };

          set({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            availableRoles: mockUser.roles
          });

          get().setSession(tokens);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        get().clearSession();
        set({
          user: null,
          isAuthenticated: false,
          availableRoles: [],
        });
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          // This would make an API call to refresh the session
          // For now, extending the mock session
          const tokens = {
            sessionToken: 'refreshed-session-token',
            refreshToken: refreshToken,
            expiresIn: 86400
          };
          
          get().setSession(tokens);
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      switchRole: (roleId: string) => {
        const { user, availableRoles } = get();
        if (!user) return;

        const newRole = availableRoles.find(role => role.id === roleId);
        if (!newRole) return;

        set({
          user: {
            ...user,
            currentRole: newRole,
            permissions: newRole.permissions
          }
        });
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();
        if (!user) return;

        set({
          user: { ...user, ...updates }
        });
      },

      // Session management
      setSession: (tokens: { sessionToken: string; refreshToken: string; expiresIn: number }) => {
        const expiryDate = new Date(Date.now() + tokens.expiresIn * 1000);
        set({
          sessionToken: tokens.sessionToken,
          refreshToken: tokens.refreshToken,
          sessionExpiry: expiryDate
        });
      },

      clearSession: () => {
        set({
          sessionToken: undefined,
          refreshToken: undefined,
          sessionExpiry: undefined
        });
      },

      isSessionValid: () => {
        const { sessionExpiry } = get();
        if (!sessionExpiry) return false;
        return new Date() < sessionExpiry;
      },

      // Utility functions
      hasPermission: (permission: string) => {
        const { user } = get();
        return user?.permissions.includes(permission) ?? false;
      },

      hasRole: (roleName: string) => {
        const { user } = get();
        return user?.roles.some(role => role.name === roleName) ?? false;
      },

      canAccessEntity: (entityId: string) => {
        const { user } = get();
        return user?.assignedEntities.includes(entityId) ?? false;
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
        refreshToken: state.refreshToken,
        sessionExpiry: state.sessionExpiry,
        availableRoles: state.availableRoles,
      }),
    }
  )
);