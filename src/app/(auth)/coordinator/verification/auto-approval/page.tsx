import { Metadata } from 'next';
import { AutoApprovalConfig } from '@/components/verification/AutoApprovalConfig';

export const metadata: Metadata = {
  title: 'Auto-Approval Configuration | Coordinator Dashboard',
  description: 'Configure automatic verification settings for entities and assessment types.',
};

export default function AutoApprovalPage() {
  return (
    <div className="container mx-auto p-6">
      <AutoApprovalConfig />
    </div>
  );
}