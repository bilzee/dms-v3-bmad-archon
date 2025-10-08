import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  RapidAssessment, 
  RapidAssessmentType, 
  CreateAssessmentRequest 
} from '@/types/rapid-assessment';

// Offline assessment data with sync status
export interface OfflineRapidAssessment extends Omit<CreateAssessmentRequest, 'rapidAssessmentDate'> {
  id: string;
  rapidAssessmentDate: string; // ISO string for consistency
  createdAt: string;
  updatedAt: string;
  syncStatus: 'draft' | 'pending' | 'syncing' | 'synced' | 'error';
  lastSyncAttempt?: string;
  syncError?: string;
  syncAttempts: number;
  isModified: boolean;
  photos?: string[];
}

export interface RapidAssessmentState {
  // Current assessment being worked on
  currentAssessment: OfflineRapidAssessment | null;
  assessmentType: RapidAssessmentType | null;
  
  // All offline assessments
  assessments: OfflineRapidAssessment[];
  
  // Draft assessments (auto-saved)
  drafts: OfflineRapidAssessment[];
  
  // Pending sync assessments
  pendingSync: OfflineRapidAssessment[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  
  // Actions
  setCurrentAssessment: (assessment: OfflineRapidAssessment | null) => void;
  setAssessmentType: (type: RapidAssessmentType | null) => void;
  
  // Draft management
  createDraft: (type: RapidAssessmentType, initialData?: Partial<CreateAssessmentRequest>) => OfflineRapidAssessment;
  saveDraft: (assessmentData: Partial<CreateAssessmentRequest>) => void;
  deleteDraft: (assessmentId: string) => void;
  clearDrafts: () => void;
  
  // Assessment management
  updateAssessment: (assessmentId: string, updates: Partial<CreateAssessmentRequest>) => void;
  deleteAssessment: (assessmentId: string) => void;
  
  // Sync management
  markForSync: (assessmentId: string) => void;
  updateSyncStatus: (assessmentId: string, status: OfflineRapidAssessment['syncStatus'], error?: string) => void;
  removeSyncedAssessments: () => void;
  
  // Utility
  getAssessmentById: (id: string) => OfflineRapidAssessment | null;
  getAssessmentsByType: (type: RapidAssessmentType) => OfflineRapidAssessment[];
  getDraftCount: () => number;
  getPendingSyncCount: () => number;
  
  // Connection management
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentAssessment: null,
  assessmentType: null,
  assessments: [],
  drafts: [],
  pendingSync: [],
  isLoading: false,
  error: null,
  isOnline: navigator.onLine,
};

// Create the Zustand store
export const useRapidAssessmentStore = create<RapidAssessmentState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentAssessment: (assessment) => {
        set({ currentAssessment: assessment });
      },

      setAssessmentType: (type) => {
        set({ assessmentType: type });
      },

      createDraft: (type, initialData = {}) => {
        const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        const draft: OfflineRapidAssessment = {
          id: draftId,
          rapidAssessmentType: type,
          rapidAssessmentDate: initialData.rapidAssessmentDate?.toISOString() || now,
          affectedEntityId: initialData.affectedEntityId || '',
          assessorName: initialData.assessorName || '',
          gpsCoordinates: initialData.gpsCoordinates,
          photos: initialData.photos || [],
          ...initialData,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'draft',
          syncAttempts: 0,
          isModified: false,
        };

        // Add type-specific assessment data
        switch (type) {
          case 'HEALTH':
            draft.healthAssessment = (initialData as any).healthAssessment || {};
            break;
          case 'POPULATION':
            draft.populationAssessment = (initialData as any).populationAssessment || {};
            break;
          case 'FOOD':
            draft.foodAssessment = (initialData as any).foodAssessment || {};
            break;
          case 'WASH':
            draft.washAssessment = (initialData as any).washAssessment || {};
            break;
          case 'SHELTER':
            draft.shelterAssessment = (initialData as any).shelterAssessment || {};
            break;
          case 'SECURITY':
            draft.securityAssessment = (initialData as any).securityAssessment || {};
            break;
        }

        set((state) => ({
          drafts: [...state.drafts, draft],
          assessments: [...state.assessments, draft],
          currentAssessment: draft,
          assessmentType: type,
        }));

        return draft;
      },

      saveDraft: (assessmentData) => {
        const state = get();
        if (!state.currentAssessment) return;

        const updatedAssessment: OfflineRapidAssessment = {
          ...state.currentAssessment,
          ...assessmentData,
          updatedAt: new Date().toISOString(),
          isModified: true,
          rapidAssessmentDate: assessmentData.rapidAssessmentDate?.toISOString() || state.currentAssessment.rapidAssessmentDate,
        };

        set((currentState) => ({
          assessments: currentState.assessments.map(a => 
            a.id === state.currentAssessment?.id ? updatedAssessment : a
          ),
          drafts: currentState.drafts.map(d => 
            d.id === state.currentAssessment?.id ? updatedAssessment : d
          ),
          currentAssessment: updatedAssessment,
        }));
      },

      deleteDraft: (assessmentId) => {
        set((state) => ({
          drafts: state.drafts.filter(d => d.id !== assessmentId),
          assessments: state.assessments.filter(a => a.id !== assessmentId),
          currentAssessment: state.currentAssessment?.id === assessmentId ? null : state.currentAssessment,
        }));
      },

      clearDrafts: () => {
        set((state) => ({
          drafts: [],
          assessments: state.assessments.filter(a => a.syncStatus !== 'draft'),
          currentAssessment: state.currentAssessment?.syncStatus === 'draft' ? null : state.currentAssessment,
        }));
      },

      updateAssessment: (assessmentId, updates) => {
        set((state) => {
          const updatedAssessments = state.assessments.map(assessment => 
            assessment.id === assessmentId 
              ? {
                  ...assessment,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                  isModified: true,
                  rapidAssessmentDate: updates.rapidAssessmentDate?.toISOString() || assessment.rapidAssessmentDate,
                }
              : assessment
          );

          return {
            assessments: updatedAssessments,
            currentAssessment: state.currentAssessment?.id === assessmentId 
              ? updatedAssessments.find(a => a.id === assessmentId) || null
              : state.currentAssessment,
          };
        });
      },

      deleteAssessment: (assessmentId) => {
        set((state) => ({
          assessments: state.assessments.filter(a => a.id !== assessmentId),
          drafts: state.drafts.filter(d => d.id !== assessmentId),
          pendingSync: state.pendingSync.filter(p => p.id !== assessmentId),
          currentAssessment: state.currentAssessment?.id === assessmentId ? null : state.currentAssessment,
        }));
      },

      markForSync: (assessmentId) => {
        const now = new Date().toISOString();
        set((state) => {
          const updatedAssessments = state.assessments.map(assessment => 
            assessment.id === assessmentId 
              ? {
                  ...assessment,
                  syncStatus: 'pending' as const,
                  lastSyncAttempt: now,
                  syncAttempts: 0,
                  syncError: undefined,
                  isModified: false,
                }
              : assessment
          );

          return {
            assessments: updatedAssessments,
            drafts: updatedAssessments.filter(a => a.syncStatus === 'draft'),
            pendingSync: updatedAssessments.filter(a => a.syncStatus === 'pending'),
          };
        });
      },

      updateSyncStatus: (assessmentId, status, error) => {
        const now = new Date().toISOString();
        set((state) => {
          const updatedAssessments = state.assessments.map(assessment => 
            assessment.id === assessmentId 
              ? {
                  ...assessment,
                  syncStatus: status,
                  lastSyncAttempt: now,
                  syncAttempts: status === 'error' ? assessment.syncAttempts + 1 : assessment.syncAttempts,
                  syncError: status === 'error' ? error : undefined,
                  isModified: status === 'error' ? true : assessment.isModified,
                }
              : assessment
          );

          return {
            assessments: updatedAssessments,
            pendingSync: updatedAssessments.filter(a => a.syncStatus === 'pending'),
          };
        });
      },

      removeSyncedAssessments: () => {
        set((state) => ({
          assessments: state.assessments.filter(a => a.syncStatus !== 'synced'),
          currentAssessment: state.currentAssessment?.syncStatus === 'synced' ? null : state.currentAssessment,
        }));
      },

      getAssessmentById: (id) => {
        return get().assessments.find(a => a.id === id) || null;
      },

      getAssessmentsByType: (type) => {
        return get().assessments.filter(a => a.rapidAssessmentType === type);
      },

      getDraftCount: () => {
        return get().drafts.length;
      },

      getPendingSyncCount: () => {
        return get().pendingSync.length;
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'rapid-assessment-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields to avoid large localStorage usage
      partialize: (state) => ({
        assessments: state.assessments.filter(a => a.syncStatus === 'draft' || a.syncStatus === 'pending'),
        currentAssessment: state.currentAssessment,
        assessmentType: state.assessmentType,
      }),
    }
  )
);

// Auto-save functionality
let autoSaveInterval: NodeJS.Timeout | null = null;

export const startAutoSave = () => {
  if (autoSaveInterval) return;

  autoSaveInterval = setInterval(() => {
    const state = useRapidAssessmentStore.getState();
    if (state.currentAssessment && state.currentAssessment.isModified) {
      // The assessment is already saved in the store, just mark as saved
      useRapidAssessmentStore.setState((prevState) => ({
        currentAssessment: prevState.currentAssessment 
          ? { ...prevState.currentAssessment, isModified: false }
          : null,
      }));
    }
  }, 30000); // Auto-save every 30 seconds
};

export const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
};

// Network status listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useRapidAssessmentStore.setState({ isOnline: true });
  });

  window.addEventListener('offline', () => {
    useRapidAssessmentStore.setState({ isOnline: false });
  });
}