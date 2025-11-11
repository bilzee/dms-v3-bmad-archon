import { useQuery } from '@tanstack/react-query';

export interface ResponseVerificationMetrics {
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
  totalAutoVerified: number;
  verificationRate: number;
  rejectionRate: number;
  averageProcessingTime: number;
  pendingByType: Record<string, number>;
  verifiedByType: Record<string, number>;
  autoVerifiedByType: Record<string, number>;
  pendingByDonor: Record<string, number>;
  verifiedByDonor: Record<string, number>;
  dailyTrends: Array<{
    date: string;
    pending: number;
    verified: number;
    rejected: number;
    autoVerified: number;
  }>;
}

export function useResponseVerificationMetrics() {
  return useQuery({
    queryKey: ['response-verification-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/v1/verification/metrics/responses');
      
      if (!response.ok) {
        throw new Error('Failed to fetch response verification metrics');
      }
      
      return response.json() as Promise<ResponseVerificationMetrics>;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}