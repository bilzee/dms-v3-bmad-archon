import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { 
  ResponseVerificationQueueResponse, 
  ResponseVerificationFilters,
  VerifyResponseRequest,
  RejectResponseRequest 
} from '@/types/response-verification';

interface UseResponseVerificationQueueParams extends ResponseVerificationFilters {
  page?: number;
  limit?: number;
}

export function useResponseVerificationQueue(params: UseResponseVerificationQueueParams = {}) {
  const { token } = useAuth();
  const {
    page = 1,
    limit = 10,
    ...filters
  } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(filters.verificationStatus && { status: filters.verificationStatus }),
    ...(filters.entityId && { entityId: filters.entityId }),
    ...(filters.responseType && { type: filters.responseType }),
    ...(filters.donorId && { donorId: filters.donorId }),
  });

  return useQuery({
    queryKey: ['response-verification-queue', params],
    queryFn: async () => {
      const response = await fetch(`/api/v1/verification/queue/responses?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch response verification queue');
      }
      
      return response.json() as Promise<ResponseVerificationQueueResponse>;
    },
    enabled: !!token,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useVerifyResponse() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ responseId, data }: { responseId: string; data: VerifyResponseRequest }) => {
      const response = await fetch(`/api/v1/responses/${responseId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify response');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch verification queue
      queryClient.invalidateQueries({ queryKey: ['response-verification-queue'] });
    },
  });
}

export function useRejectResponse() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ responseId, data }: { responseId: string; data: RejectResponseRequest }) => {
      const response = await fetch(`/api/v1/responses/${responseId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject response');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch verification queue
      queryClient.invalidateQueries({ queryKey: ['response-verification-queue'] });
    },
  });
}

// Filters hook for response verification
export function useResponseVerificationFilters() {
  const [filters, setFilters] = useState<ResponseVerificationFilters>({});
  
  const updateFilter = (key: keyof ResponseVerificationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const clearFilters = () => {
    setFilters({});
  };
  
  return {
    filters,
    updateFilter,
    clearFilters,
  };
}