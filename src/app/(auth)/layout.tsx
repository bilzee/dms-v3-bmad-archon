import { AppShell } from '@/components/layouts/AppShell';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}