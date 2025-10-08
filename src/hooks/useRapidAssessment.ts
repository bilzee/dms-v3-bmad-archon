import { useState, useCallback, useEffect } from 'react';
import { rapidAssessmentService } from '@/lib/services/rapid-assessment.service';
import { useRapidAssessmentStore } from '@/stores/rapid-assessment.store';
import { entityAssignmentService } from '@/lib/services/entity-assignment.service';
import { 
  RapidAssessment, 
  RapidAssessmentType, 
  CreateAssessmentRequest,
  RapidAssessmentResponse 
} from '@/types/rapid-assessment';
import { useAuthStore } from '@/stores/auth.store';

export interface UseRapidAssessmentOptions {
  enableAutoSync?: boolean;
  syncInterval?: number;
}

export interface RapidAssessmentHookReturn {
  // Assessment data
  currentAssessment: any;
  assessments: any[];
  drafts: any[];
  pendingSync: any[];
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isSyncing: boolean;
  
  // Error states
  error: string | null;
  syncError: string | null;
  
  // Actions
  createAssessment: (data: CreateAssessmentRequest) => Promise<RapidAssessmentResponse>;
  updateAssessment: (id: string, data: Partial<CreateAssessmentRequest>) => Promise<RapidAssessmentResponse>;
  deleteAssessment: (id: string) => Promise<RapidAssessmentResponse>;
  getAssessment: (id: string) => Promise<RapidAssessmentResponse>;
  
  // Draft management
  createDraft: (type: RapidAssessmentType, initialData?: Partial<CreateAssessmentRequest>) => void;
  saveDraft: (data: Partial<CreateAssessmentRequest>) => void;
  deleteDraft: (id: string) => void;
  
  // Sync operations
  syncPendingAssessments: () => Promise<void>;
  markForSync: (id: string) => void;
  
  // Utility
  reset: () => void;
  refreshAssessments: () => Promise<void>;
}

export function useRapidAssessment(options: UseRapidAssessmentOptions = {}): RapidAssessmentHookReturn {
  const { enableAutoSync = true, syncInterval = 30000 } = options;
  
  // Store state
  const {
    currentAssessment,
    assessments,
    drafts,
    pendingSync,
    isOnline,
    setCurrentAssessment,
    createDraft: storeCreateDraft,
    saveDraft: storeSaveDraft,
    deleteDraft: storeDeleteDraft,
    markForSync: storeMarkForSync,
    updateSyncStatus,
    reset: storeReset,
  } = useRapidAssessmentStore();
  
  // Auth state
  const { user } = useAuthStore();
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Clear errors
  const clearErrors = useCallback(() => {
    setError(null);
    setSyncError(null);
  }, []);

  // Create assessment
  const createAssessment = useCallback(async (data: CreateAssessmentRequest): Promise<RapidAssessmentResponse> => {
    if (!user) {
      const response = {
        success: false,
        message: 'User not authenticated',
        errors: ['Authentication required']
      };
      return response;
    }

    // Validate entity assignment
    const canCreate = await entityAssignmentService.canCreateAssessment(user.id, data.affectedEntityId);
    if (!canCreate) {
      const response = {
        success: false,
        message: 'Not authorized to create assessment for this entity',
        errors: ['Entity assignment validation failed']
      };
      return response;
    }

    setIsCreating(true);
    clearErrors();

    try {
      let response: RapidAssessmentResponse;

      if (isOnline) {
        // Online: Create directly via API
        response = await rapidAssessmentService.createAssessment(data, data.rapidAssessmentType);
        
        if (response.success && response.data) {
          // Store successful assessment
          useRapidAssessmentStore.setState((state) => ({
            assessments: [...state.assessments, {
              ...response.data,
              syncStatus: 'synced',
              syncAttempts: 0,
              isModified: false,
            } as any],
          }));
        }
      } else {
        // Offline: Create draft for later sync
        const draft = storeCreateDraft(data.rapidAssessmentType, data);
        storeMarkForSync(draft.id);
        
        response = {
          success: true,
          data: draft as any,
          message: 'Assessment saved for offline sync'
        };
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assessment';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    } finally {
      setIsCreating(false);
    }
  }, [user, isOnline, storeCreateDraft, storeMarkForSync]);

  // Update assessment
  const updateAssessment = useCallback(async (id: string, data: Partial<CreateAssessmentRequest>): Promise<RapidAssessmentResponse> => {
    setIsUpdating(true);
    clearErrors();

    try {
      let response: RapidAssessmentResponse;

      if (isOnline) {
        // Online: Update via API
        const assessment = useRapidAssessmentStore.getState().getAssessmentById(id);
        if (assessment) {
          response = await rapidAssessmentService.updateAssessment(id, data, assessment.rapidAssessmentType as RapidAssessmentType);
          
          if (response.success && response.data) {
            // Update stored assessment
            useRapidAssessmentStore.setState((state) => ({
              assessments: state.assessments.map(a => 
                a.id === id ? { ...response.data!, syncStatus: 'synced', isModified: false } : a
              ),
            }));
          }
        } else {
          throw new Error('Assessment not found');
        }
      } else {
        // Offline: Update locally and mark for sync
        useRapidAssessmentStore.getState().updateAssessment(id, data);
        storeMarkForSync(id);
        
        response = {
          success: true,
          message: 'Assessment updated for offline sync'
        };
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update assessment';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    } finally {
      setIsUpdating(false);
    }
  }, [isOnline, storeMarkForSync]);

  // Delete assessment
  const deleteAssessment = useCallback(async (id: string): Promise<RapidAssessmentResponse> => {
    clearErrors();

    try {
      let response: RapidAssessmentResponse;

      if (isOnline) {
        // Online: Delete via API
        response = await rapidAssessmentService.deleteAssessment(id);
        
        if (response.success) {
          // Remove from store
          useRapidAssessmentStore.getState().deleteAssessment(id);
        }
      } else {
        // Offline: Remove locally
        useRapidAssessmentStore.getState().deleteAssessment(id);
        
        response = {
          success: true,
          message: 'Assessment deleted locally'
        };
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete assessment';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    }
  }, [isOnline]);

  // Get assessment by ID
  const getAssessment = useCallback(async (id: string): Promise<RapidAssessmentResponse> => {
    setIsLoading(true);
    clearErrors();

    try {
      // First check local store
      const localAssessment = useRapidAssessmentStore.getState().getAssessmentById(id);
      if (localAssessment) {
        return {
          success: true,
          data: localAssessment as RapidAssessment,
          message: 'Assessment loaded from local storage'
        };
      }

      // If not found locally and online, fetch from API
      if (isOnline) {
        const response = await rapidAssessmentService.getAssessmentById(id);
        
        if (response.success && response.data) {
          // Cache in store
          useRapidAssessmentStore.setState((state) => ({
            assessments: [...state.assessments, {
              ...response.data,
              syncStatus: 'synced',
              syncAttempts: 0,
              isModified: false,
            } as any],
          }));
        }
        
        return response;
      } else {
        return {
          success: false,
          message: 'Assessment not found locally and offline',
          errors: ['No internet connection']
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get assessment';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage]
      };
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Sync pending assessments
  const syncPendingAssessments = useCallback(async (): Promise<void> => {
    if (!isOnline || isSyncing) return;

    const pending = useRapidAssessmentStore.getState().pendingSync;
    if (pending.length === 0) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      for (const assessment of pending) {
        try {
          updateSyncStatus(assessment.id, 'syncing');

          // Convert offline assessment to API format
          const apiData = {
            ...assessment,
            rapidAssessmentDate: new Date(assessment.rapidAssessmentDate),
            gpsCoordinates: assessment.gpsCoordinates ? {
              ...assessment.gpsCoordinates,
              timestamp: new Date(assessment.gpsCoordinates.timestamp)
            } : undefined,
          };

          let response: RapidAssessmentResponse;

          if (assessment.id.startsWith('draft_')) {
            // New assessment
            response = await rapidAssessmentService.createAssessment(apiData, assessment.rapidAssessmentType as RapidAssessmentType);
          } else {
            // Existing assessment update
            response = await rapidAssessmentService.updateAssessment(assessment.id, apiData, assessment.rapidAssessmentType as RapidAssessmentType);
          }

          if (response.success) {
            updateSyncStatus(assessment.id, 'synced');
          } else {
            updateSyncStatus(assessment.id, 'error', response.message);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Sync failed';
          updateSyncStatus(assessment.id, 'error', errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync process failed';
      setSyncError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Draft management
  const createDraft = useCallback((type: RapidAssessmentType, initialData?: Partial<CreateAssessmentRequest>) => {
    storeCreateDraft(type, initialData);
  }, [storeCreateDraft]);

  const saveDraft = useCallback((data: Partial<CreateAssessmentRequest>) => {
    storeSaveDraft(data);
  }, [storeSaveDraft]);

  const deleteDraft = useCallback((id: string) => {
    storeDeleteDraft(id);
  }, [storeDeleteDraft]);

  // Reset
  const reset = useCallback(() => {
    storeReset();
    clearErrors();
    setIsLoading(false);
    setIsCreating(false);
    setIsUpdating(false);
    setIsSyncing(false);
  }, [storeReset, clearErrors]);

  // Refresh assessments from API
  const refreshAssessments = useCallback(async (): Promise<void> => {
    if (!user || !isOnline) return;

    setIsLoading(true);
    clearErrors();

    try {
      // Get user's assigned entities
      const assignedEntities = await entityAssignmentService.getUserAssignedEntities(user.id);
      
      // This would need to be implemented in the service
      // For now, just clear the error state
      clearErrors();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh assessments';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user, isOnline, clearErrors]);

  // Auto-sync effect
  useEffect(() => {
    if (enableAutoSync && isOnline && pendingSync.length > 0) {
      const interval = setInterval(() => {
        syncPendingAssessments();
      }, syncInterval);

      return () => clearInterval(interval);
    }
  }, [enableAutoSync, isOnline, pendingSync.length, syncInterval, syncPendingAssessments]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && pendingSync.length > 0) {
      syncPendingAssessments();
    }
  }, [isOnline, pendingSync.length, syncPendingAssessments]);

  return {
    // Assessment data
    currentAssessment,
    assessments,
    drafts,
    pendingSync,
    
    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isSyncing,
    
    // Error states
    error,
    syncError,
    
    // Actions
    createAssessment,
    updateAssessment,
    deleteAssessment,
    getAssessment,
    
    // Draft management
    createDraft,
    saveDraft,
    deleteDraft,
    
    // Sync operations
    syncPendingAssessments,
    markForSync: storeMarkForSync,
    
    // Utility
    reset,
    refreshAssessments,
  };
}