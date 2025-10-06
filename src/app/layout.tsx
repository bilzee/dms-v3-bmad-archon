import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/shared/Header';

export const metadata: Metadata = {
  title: 'Disaster Management System - Borno State',
  description: 'Offline-first disaster management and humanitarian assessment PWA for Borno State, Nigeria',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DMS Borno',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <div className="min-h-screen flex flex-col">
          <Header />

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-gray-500">
                Disaster Management System - Borno State, Nigeria
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}