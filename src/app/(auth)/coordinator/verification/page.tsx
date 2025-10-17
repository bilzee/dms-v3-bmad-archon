import { Metadata } from 'next';
import { VerificationDashboard } from '@/components/verification/VerificationDashboard';

export const metadata: Metadata = {
  title: 'Assessment Verification | Coordinator Dashboard',
  description: 'Verify and approve assessment submissions from field assessors.',
};

export default function VerificationPage() {
  return <VerificationDashboard />;
}