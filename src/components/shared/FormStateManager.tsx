'use client';

import { useEffect, useState } from 'react';
import { useRoleSession } from '@/hooks/useRoleSession';

interface FormStateManagerProps {
  formId: string;
  formData: any;
  onFormDataChange?: (data: any) => void;
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
  children?: React.ReactNode;
}

export const FormStateManager = ({ 
  formId, 
  formData, 
  onFormDataChange,
  onUnsavedChangesChange,
  children 
}: FormStateManagerProps) => {
  const { saveFormData, getFormData, clearFormData } = useRoleSession();
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [currentFormData, setCurrentFormData] = useState<any>(null);

  // Load saved form data on mount
  useEffect(() => {
    if (formId) {
      const savedData = getFormData(formId);
      if (savedData) {
        setInitialFormData(savedData);
        setCurrentFormData(savedData);
        onFormDataChange?.(savedData);
      } else if (formData) {
        setInitialFormData(formData);
        setCurrentFormData(formData);
      }
    }
  }, [formId, formData, getFormData, onFormDataChange]);

  // Auto-save form data when it changes
  useEffect(() => {
    if (formId && currentFormData && JSON.stringify(currentFormData) !== JSON.stringify(initialFormData)) {
      const timeoutId = setTimeout(() => {
        saveFormData(formId, currentFormData);
        onUnsavedChangesChange?.(true);
      }, 2000); // Debounce save by 2 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [formId, currentFormData, initialFormData, saveFormData, onUnsavedChangesChange]);

  // Check for unsaved changes
  const hasUnsavedChanges = currentFormData && initialFormData && 
    JSON.stringify(currentFormData) !== JSON.stringify(initialFormData);

  // Update current form data when external formData changes
  useEffect(() => {
    if (formData !== undefined && formData !== currentFormData) {
      setCurrentFormData(formData);
    }
  }, [formData, currentFormData]);

  const handleFormDataChange = (newData: any) => {
    setCurrentFormData(newData);
    onFormDataChange?.(newData);
  };

  const clearForm = () => {
    clearFormData(formId);
    setInitialFormData(null);
    setCurrentFormData(null);
    onUnsavedChangesChange?.(false);
  };

  const resetToInitial = () => {
    setCurrentFormData(initialFormData);
    onFormDataChange?.(initialFormData);
    onUnsavedChangesChange?.(false);
  };

  if (children) {
    return (
      <>
        {typeof children === 'function' 
          ? children({ 
              formData: currentFormData,
              hasUnsavedChanges,
              onFormDataChange: handleFormDataChange,
              clearForm,
              resetToInitial
            })
          : children
        }
      </>
    );
  }

  return {
    formData: currentFormData,
    hasUnsavedChanges,
    onFormDataChange: handleFormDataChange,
    clearForm,
    resetToInitial
  };
};