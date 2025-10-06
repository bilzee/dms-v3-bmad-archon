'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoleName } from '@/types/auth';

interface FormData {
  [key: string]: any;
}

interface PageState {
  scrollPosition?: number;
  formData?: FormData;
  filters?: Record<string, any>;
  selectedItems?: string[];
}

interface RoleSessionManager {
  savePageState: (pageKey: string, state: Partial<PageState>) => void;
  getPageState: (pageKey: string) => PageState | undefined;
  clearPageState: (pageKey: string) => void;
  saveFormData: (formId: string, data: FormData) => void;
  getFormData: (formId: string) => FormData | undefined;
  clearFormData: (formId: string) => void;
  hasUnsavedForms: () => boolean;
}

export const useRoleSession = (): RoleSessionManager => {
  const { 
    currentRole, 
    saveRoleSession, 
    getRoleSession, 
    clearRoleSession 
  } = useAuth();

  const getSessionKey = useCallback((key: string) => {
    return `${currentRole || 'unknown'}_${key}`;
  }, [currentRole]);

  const savePageState = useCallback((pageKey: string, state: Partial<PageState>) => {
    if (!currentRole) return;
    
    const sessionKey = getSessionKey(pageKey);
    const existingSession = getRoleSession(currentRole) || {};
    const existingPageState = existingSession[sessionKey] || {};
    
    saveRoleSession(currentRole, {
      [sessionKey]: {
        ...existingPageState,
        ...state,
        lastUpdated: Date.now()
      }
    });
  }, [currentRole, saveRoleSession, getRoleSession, getSessionKey]);

  const getPageState = useCallback((pageKey: string): PageState | undefined => {
    if (!currentRole) return undefined;
    
    const sessionKey = getSessionKey(pageKey);
    const session = getRoleSession(currentRole);
    return session?.[sessionKey];
  }, [currentRole, getRoleSession, getSessionKey]);

  const clearPageState = useCallback((pageKey: string) => {
    if (!currentRole) return;
    
    const sessionKey = getSessionKey(pageKey);
    const session = getRoleSession(currentRole);
    if (session?.[sessionKey]) {
      const updatedSession = { ...session };
      delete updatedSession[sessionKey];
      
      // Update the role session with cleared state
      saveRoleSession(currentRole, updatedSession);
    }
  }, [currentRole, saveRoleSession, getRoleSession, getSessionKey]);

  const saveFormData = useCallback((formId: string, data: FormData) => {
    const pageKey = `form_${formId}`;
    savePageState(pageKey, { formData: data });
  }, [savePageState]);

  const getFormData = useCallback((formId: string): FormData | undefined => {
    const pageKey = `form_${formId}`;
    const pageState = getPageState(pageKey);
    return pageState?.formData;
  }, [getPageState]);

  const clearFormData = useCallback((formId: string) => {
    const pageKey = `form_${formId}`;
    clearPageState(pageKey);
  }, [clearPageState]);

  const hasUnsavedForms = useCallback((): boolean => {
    if (!currentRole) return false;
    
    const session = getRoleSession(currentRole);
    if (!session) return false;
    
    // Check for any form data in the session
    return Object.keys(session).some(key => 
      key.startsWith('form_') && session[key]?.formData
    );
  }, [currentRole, getRoleSession]);

  return {
    savePageState,
    getPageState,
    clearPageState,
    saveFormData,
    getFormData,
    clearFormData,
    hasUnsavedForms
  };
};

// Hook for auto-saving form data
export const useFormAutoSave = (formId: string, formData: any) => {
  const { saveFormData, getFormData } = useRoleSession();

  // Load saved form data on mount
  useEffect(() => {
    if (formId && !formData) {
      const savedData = getFormData(formId);
      if (savedData) {
        // You would typically use a form setter method here
        // This is a basic example - you'd integrate with your form library
        console.log('Loaded saved form data for', formId, savedData);
      }
    }
  }, [formId, formData, getFormData]);

  // Auto-save form data when it changes
  useEffect(() => {
    if (formId && formData) {
      const timeoutId = setTimeout(() => {
        saveFormData(formId, formData);
      }, 1000); // Debounce save by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [formId, formData, saveFormData]);
};

// Hook for managing page scroll position
export const useScrollPosition = (pageKey: string) => {
  const { savePageState, getPageState } = useRoleSession();

  const saveScrollPosition = useCallback(() => {
    const scrollPosition = window.scrollY;
    savePageState(pageKey, { scrollPosition });
  }, [pageKey, savePageState]);

  const restoreScrollPosition = useCallback(() => {
    const pageState = getPageState(pageKey);
    if (pageState?.scrollPosition) {
      window.scrollTo(0, pageState.scrollPosition);
    }
  }, [pageKey, getPageState]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition();
    };

    const timeoutId = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 1000); // Start listening after 1 second

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [saveScrollPosition]);

  // Restore scroll position on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      restoreScrollPosition();
    }, 100); // Small delay to ensure page is rendered

    return () => clearTimeout(timeoutId);
  }, [restoreScrollPosition]);
};