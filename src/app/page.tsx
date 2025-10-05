'use client';

import { useEffect, useState } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { ConflictSummary } from '@/components/dashboards/crisis/ConflictSummary';

export default function HomePage() {
  const { 
    isOnline, 
    pendingOperations, 
    getOfflineStats,
    queueOperation 
  } = useOffline();
  
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      const storageStats = await getOfflineStats();
      setStats(storageStats);
    };
    loadStats();
  }, [getOfflineStats]);

  const handleTestOfflineOperation = async () => {
    try {
      await queueOperation({
        type: 'assessment',
        action: 'create',
        entityUuid: crypto.randomUUID(),
        data: {
          assessorId: 'test-assessor',
          entityId: 'test-entity',
          assessmentType: 'rapid',
          formData: { test: 'data' },
          gpsLocation: '12.0464,15.0557'
        },
        priority: 5
      });
      
      // Refresh stats
      const newStats = await getOfflineStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to create test operation:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Disaster Management System
        </h1>
        <p className="text-lg text-gray-600">
          Borno State Emergency Response Platform
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Connection Status</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${pendingOperations > 0 ? 'bg-orange-500' : 'bg-green-500'}`}></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Sync</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pendingOperations}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-3 bg-blue-500"></div>
            <div>
              <p className="text-sm font-medium text-gray-500">PWA Status</p>
              <p className="text-2xl font-semibold text-gray-900">Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Statistics and Conflict Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Storage Statistics */}
        {stats && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Local Storage</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.assessments}</p>
                <p className="text-sm text-gray-500">Assessments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.responses}</p>
                <p className="text-sm text-gray-500">Responses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.entities}</p>
                <p className="text-sm text-gray-500">Entities</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.syncQueue}</p>
                <p className="text-sm text-gray-500">Queue Items</p>
              </div>
            </div>
          </div>
        )}

        {/* Conflict Summary */}
        <ConflictSummary 
          className="shadow"
          onConflictClick={() => window.location.href = '/dashboard/crisis'}
        />
      </div>

      {/* Test Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Offline Functionality</h2>
        <div className="space-y-4">
          <button
            onClick={handleTestOfflineOperation}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Test Assessment
          </button>
          <p className="text-sm text-gray-500">
            This will create a test assessment that will be queued for sync when online.
          </p>
        </div>
      </div>

      {/* PWA Installation Prompt */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Install App</h2>
        <p className="text-gray-600 mb-4">
          Install this app on your device for the best offline experience. 
          Look for the "Add to Home Screen" or "Install App" option in your browser menu.
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-gray-500">
          <span className="bg-white px-3 py-1 rounded-full">📱 Works offline</span>
          <span className="bg-white px-3 py-1 rounded-full">🔄 Auto-sync</span>
          <span className="bg-white px-3 py-1 rounded-full">🔒 Encrypted storage</span>
        </div>
      </div>
    </div>
  );
}