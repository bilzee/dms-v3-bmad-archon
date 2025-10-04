# 12. State Management with Zustand

### 12.1 Auth Store

```typescript
// stores/auth.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, RoleName, Permission } from '@/types/entities';

interface AuthState {
  user: User | null;
  token: string | null;
  currentRole: RoleName | null;
  availableRoles: RoleName[];
  permissions: string[];
  
  // Actions
  login: (user: User, token: string, roles: RoleName[]) => void;
  logout: () => void;
  switchRole: (role: RoleName) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      currentRole: null,
      availableRoles: [],
      permissions: [],
      
      login: (user, token, roles) => {
        set({
          user,
          token,
          availableRoles: roles,
          currentRole: roles[0] || null,
        });
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          currentRole: null,
          availableRoles: [],
          permissions: [],
        });
        
        // Clear all other stores
        localStorage.clear();
      },
      
      switchRole: (role) => {
        const { availableRoles } = get();
        if (!availableRoles.includes(role)) {
          console.error('Role not available:', role);
          return;
        }
        
        set({ currentRole: role });
      },
      
      updateUser: (updates) => {
        const { user } = get();
        if (!user) return;
        
        set({ user: { ...user, ...updates } });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        currentRole: state.currentRole,
        user: state.user,
        availableRoles: state.availableRoles,
      }),
    }
  )
);
```

---

### 12.2 Offline Store

```typescript
// stores/offline.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db/offline';
import { OfflineQueueItem } from '@/types/entities';

interface OfflineState {
  isOffline: boolean;
  queueSize: number;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  syncQueue: OfflineQueueItem[];
  
  // Actions
  setOfflineStatus: (status: boolean) => void;
  queueItem: (item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'>) => Promise<void>;
  startSync: () => Promise<void>;
  clearQueue: () => Promise<void>;
  loadQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOffline: !navigator.onLine,
      queueSize: 0,
      syncInProgress: false,
      lastSyncTime: null,
      syncQueue: [],
      
      setOfflineStatus: (status) => set({ isOffline: status }),
      
      queueItem: async (item) => {
        try {
          const queueItem: OfflineQueueItem = {
            ...item,
            id: crypto.randomUUID(),
            retryCount: 0,
            createdAt: new Date(),
          };
          
          await db.syncQueue.add(queueItem);
          await get().loadQueue();
        } catch (error) {
          console.error('Failed to queue item:', error);
          throw error;
        }
      },
      
      startSync: async () => {
        const { syncInProgress, isOffline } = get();
        
        if (syncInProgress || isOffline) {
          return;
        }
        
        set({ syncInProgress: true });
        
        try {
          const queue = await db.syncQueue.toArray();
          
          // Call sync API
          const response = await fetch('/api/v1/sync/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${useAuthStore.getState().token}`,
            },
            body: JSON.stringify({ changes: queue }),
          });
          
          if (!response.ok) {
            throw new Error('Sync failed');
          }
          
          const result = await response.json();
          
          // Remove successful items from queue
          for (const success of result.data.successful) {
            const item = queue.find(q => q.offlineId === success.offlineId);
            if (item) {
              await db.syncQueue.delete(item.id);
            }
          }
          
          // Update retry count for failed items
          for (const failed of result.data.failed) {
            const item = queue.find(q => q.offlineId === failed.offlineId);
            if (item) {
              await db.syncQueue.update(item.id, {
                retryCount: item.retryCount + 1,
                lastAttempt: new Date(),
                error: failed.message,
              });
            }
          }
          
          set({
            lastSyncTime: new Date(),
            syncInProgress: false,
          });
          
          await get().loadQueue();
        } catch (error) {
          console.error('Sync failed:', error);
          set({ syncInProgress: false });
        }
      },
      
      clearQueue: async () => {
        await db.syncQueue.clear();
        set({ queueSize: 0, syncQueue: [] });
      },
      
      loadQueue: async () => {
        const queue = await db.syncQueue.toArray();
        set({
          queueSize: queue.length,
          syncQueue: queue,
        });
      },
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOfflineStatus(false);
    useOfflineStore.getState().startSync();
  });
  
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOfflineStatus(true);
  });
}
```

### 12.3 Entity Store

```typescript
// stores/entity.store.ts

import { create } from 'zustand';
import { AffectedEntity, RapidAssessment, RapidResponse } from '@/types/entities';

interface EntityState {
  assignedEntities: AffectedEntity[];
  selectedEntityId: string | null;
  entityAssessments: Record<string, RapidAssessment[]>;
  entityResponses: Record<string, RapidResponse[]>;
  
  // Actions
  setAssignedEntities: (entities: AffectedEntity[]) => void;
  selectEntity: (entityId: string) => void;
  setEntityAssessments: (entityId: string, assessments: RapidAssessment[]) => void;
  setEntityResponses: (entityId: string, responses: RapidResponse[]) => void;
  clearEntityData: () => void;
}

export const useEntityStore = create<EntityState>((set) => ({
  assignedEntities: [],
  selectedEntityId: null,
  entityAssessments: {},
  entityResponses: {},
  
  setAssignedEntities: (entities) => set({ assignedEntities: entities }),
  
  selectEntity: (entityId) => set({ selectedEntityId: entityId }),
  
  setEntityAssessments: (entityId, assessments) =>
    set((state) => ({
      entityAssessments: {
        ...state.entityAssessments,
        [entityId]: assessments,
      },
    })),
  
  setEntityResponses: (entityId, responses) =>
    set((state) => ({
      entityResponses: {
        ...state.entityResponses,
        [entityId]: responses,
      },
    })),
  
  clearEntityData: () =>
    set({
      assignedEntities: [],
      selectedEntityId: null,
      entityAssessments: {},
      entityResponses: {},
    }),
}));
```

---
