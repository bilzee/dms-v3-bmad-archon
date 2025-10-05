import type { Metadata } from 'next';
import './globals.css';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { SyncIndicator } from '@/components/shared/SyncIndicator';

export const metadata: Metadata = {
  title: 'Disaster Management System - Borno State',
  description: 'Offline-first disaster management and humanitarian assessment PWA for Borno State, Nigeria',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DMS Borno',
  },
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
          {/* Header with status indicators */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900">
                    DMS Borno
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <SyncIndicator />
                  <OfflineIndicator />
                </div>
              </div>
            </div>
          </header>

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