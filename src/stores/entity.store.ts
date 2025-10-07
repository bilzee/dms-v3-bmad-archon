import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface EntityAssignment {
  id: string;
  userId: string;
  entityId: string;
  assignedAt: string;
  assignedBy: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: Array<{
      role: {
        id: string;
        name: string;
      }
    }>;
  };
  entity: {
    id: string;
    name: string;
    type: string;
    location: string | null;
  };
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  location: string | null;
  coordinates?: any;
  metadata?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Array<{
    role: {
      id: string;
      name: string;
    }
  }>;
}

interface EntityState {
  // Assignment data
  assignments: EntityAssignment[];
  entities: Entity[];
  assignableUsers: User[];
  
  // UI state
  isLoading: boolean;
  selectedEntities: string[];
  selectedUsers: string[];
  bulkAssignModalOpen: boolean;
  assignmentSearchQuery: string;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  
  // Actions
  setAssignments: (assignments: EntityAssignment[]) => void;
  setEntities: (entities: Entity[]) => void;
  setAssignableUsers: (users: User[]) => void;
  addAssignment: (assignment: EntityAssignment) => void;
  removeAssignment: (assignmentId: string) => void;
  
  // Entity assignment operations
  createAssignment: (userId: string, entityId: string) => Promise<boolean>;
  createBulkAssignments: (userIds: string[], entityIds: string[]) => Promise<boolean>;
  deleteAssignment: (assignmentId: string) => Promise<boolean>;
  
  // Data fetching
  fetchAssignments: (page?: number) => Promise<void>;
  fetchEntities: () => Promise<void>;
  fetchAssignableUsers: () => Promise<void>;
  fetchUserAssignments: (userId: string) => Promise<EntityAssignment[]>;
  fetchEntityAssignments: (entityId: string) => Promise<EntityAssignment[]>;
  
  // UI state management
  setLoading: (loading: boolean) => void;
  setSelectedEntities: (entityIds: string[]) => void;
  setSelectedUsers: (userIds: string[]) => void;
  toggleEntitySelection: (entityId: string) => void;
  toggleUserSelection: (userId: string) => void;
  clearSelections: () => void;
  setBulkAssignModalOpen: (open: boolean) => void;
  setAssignmentSearchQuery: (query: string) => void;
  
  // Utility
  getUserAssignedEntities: (userId: string) => Entity[];
  getEntityAssignedUsers: (entityId: string) => User[];
  isUserAssignedToEntity: (userId: string, entityId: string) => boolean;
}

export const useEntityStore = create<EntityState>()(
  persist(
    (set, get) => ({
      // Initial state
      assignments: [],
      entities: [],
      assignableUsers: [],
      isLoading: false,
      selectedEntities: [],
      selectedUsers: [],
      bulkAssignModalOpen: false,
      assignmentSearchQuery: '',
      currentPage: 1,
      totalPages: 1,

      // Basic setters
      setAssignments: (assignments) => set({ assignments }),
      setEntities: (entities) => set({ entities }),
      setAssignableUsers: (users) => set({ assignableUsers: users }),
      addAssignment: (assignment) => set((state) => ({ 
        assignments: [...state.assignments, assignment] 
      })),
      removeAssignment: (assignmentId) => set((state) => ({
        assignments: state.assignments.filter(a => a.id !== assignmentId)
      })),

      // Assignment operations
      createAssignment: async (userId: string, entityId: string) => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return false;
        }

        try {
          const response = await fetch('/api/v1/entity-assignments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId,
              entityId,
              assignedBy: authStore.user?.id
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Error creating assignment:', error.error);
            return false;
          }

          const result = await response.json();
          get().addAssignment(result.data);
          return true;
        } catch (error) {
          console.error('Error creating assignment:', error);
          return false;
        }
      },

      createBulkAssignments: async (userIds: string[], entityIds: string[]) => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return false;
        }

        try {
          const response = await fetch('/api/v1/entity-assignments/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userIds,
              entityIds,
              assignedBy: authStore.user?.id
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Error creating bulk assignments:', error.error);
            return false;
          }

          const result = await response.json();
          
          // Add new assignments to store
          const currentAssignments = get().assignments;
          set({ assignments: [...currentAssignments, ...result.data] });
          
          return true;
        } catch (error) {
          console.error('Error creating bulk assignments:', error);
          return false;
        }
      },

      deleteAssignment: async (assignmentId: string) => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return false;
        }

        try {
          const response = await fetch(`/api/v1/entity-assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Error deleting assignment:', error.error);
            return false;
          }

          get().removeAssignment(assignmentId);
          return true;
        } catch (error) {
          console.error('Error deleting assignment:', error);
          return false;
        }
      },

      // Data fetching
      fetchAssignments: async (page = 1) => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return;
        }

        set({ isLoading: true });

        try {
          const response = await fetch(`/api/v1/entity-assignments?page=${page}&limit=10`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch assignments');
          }

          const result = await response.json();
          set({ 
            assignments: result.data,
            currentPage: result.pagination.page,
            totalPages: result.pagination.pages,
            isLoading: false 
          });
        } catch (error) {
          console.error('Error fetching assignments:', error);
          set({ isLoading: false });
        }
      },

      fetchEntities: async () => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return;
        }

        try {
          // Assume entities endpoint exists - would need to be created
          const response = await fetch('/api/v1/entities', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch entities');
          }

          const result = await response.json();
          set({ entities: result.data });
        } catch (error) {
          console.error('Error fetching entities:', error);
        }
      },

      fetchAssignableUsers: async () => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return;
        }

        try {
          // Fetch users with ASSESSOR or RESPONDER roles
          const response = await fetch('/api/v1/users?roles=ASSESSOR,RESPONDER', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch assignable users');
          }

          const result = await response.json();
          set({ assignableUsers: result.data });
        } catch (error) {
          console.error('Error fetching assignable users:', error);
        }
      },

      fetchUserAssignments: async (userId: string) => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return [];
        }

        try {
          const response = await fetch(`/api/v1/entity-assignments/user/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user assignments');
          }

          const result = await response.json();
          return result.data;
        } catch (error) {
          console.error('Error fetching user assignments:', error);
          return [];
        }
      },

      fetchEntityAssignments: async (entityId: string) => {
        const authStore = (window as any).authStore?.getState?.();
        const token = authStore?.token;
        
        if (!token) {
          console.error('No auth token available');
          return [];
        }

        try {
          const response = await fetch(`/api/v1/entity-assignments/entity/${entityId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch entity assignments');
          }

          const result = await response.json();
          return result.data;
        } catch (error) {
          console.error('Error fetching entity assignments:', error);
          return [];
        }
      },

      // UI state management
      setLoading: (loading) => set({ isLoading: loading }),
      
      setSelectedEntities: (entityIds) => set({ selectedEntities: entityIds }),
      
      setSelectedUsers: (userIds) => set({ selectedUsers: userIds }),
      
      toggleEntitySelection: (entityId) => set((state) => ({
        selectedEntities: state.selectedEntities.includes(entityId)
          ? state.selectedEntities.filter(id => id !== entityId)
          : [...state.selectedEntities, entityId]
      })),
      
      toggleUserSelection: (userId) => set((state) => ({
        selectedUsers: state.selectedUsers.includes(userId)
          ? state.selectedUsers.filter(id => id !== userId)
          : [...state.selectedUsers, userId]
      })),
      
      clearSelections: () => set({ selectedEntities: [], selectedUsers: [] }),
      
      setBulkAssignModalOpen: (open) => set({ bulkAssignModalOpen: open }),
      
      setAssignmentSearchQuery: (query) => set({ assignmentSearchQuery: query }),

      // Utility functions
      getUserAssignedEntities: (userId: string) => {
        const state = get();
        const userAssignments = state.assignments.filter(a => a.userId === userId);
        return userAssignments.map(a => a.entity).map(entityData => {
          // Find full entity data
          const fullEntity = state.entities.find(e => e.id === entityData.id);
          return fullEntity || {
            id: entityData.id,
            name: entityData.name,
            type: entityData.type,
            location: entityData.location,
            coordinates: null,
            metadata: null,
            isActive: true,
            createdAt: '',
            updatedAt: ''
          };
        });
      },
      
      getEntityAssignedUsers: (entityId: string) => {
        const state = get();
        const entityAssignments = state.assignments.filter(a => a.entityId === entityId);
        return entityAssignments.map(a => a.user);
      },
      
      isUserAssignedToEntity: (userId: string, entityId: string) => {
        const state = get();
        return state.assignments.some(a => a.userId === userId && a.entityId === entityId);
      }
    }),
    {
      name: 'entity-assignment-storage',
      partialize: (state) => ({
        assignments: state.assignments,
        entities: state.entities,
        assignableUsers: state.assignableUsers,
        selectedEntities: state.selectedEntities,
        selectedUsers: state.selectedUsers,
        assignmentSearchQuery: state.assignmentSearchQuery
      })
    }
  )
);