'use client';

import { useState, useEffect } from 'react';
import { ConflictLog } from '@/components/dashboards/crisis/ConflictLog';
import { ConflictExportDialog } from '@/components/dashboards/crisis/ConflictExportDialog';
import { useConflicts } from '@/hooks/useConflicts';
import { useOffline } from '@/hooks/useOffline';

export default function CrisisDashboard() {
  const { summary, fetchSummary } = useConflicts();
  const { isOnline, pendingOperations } = useOffline();
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const getConflictStatusColor = (unresolvedCount: number) => {
    if (unresolvedCount === 0) return 'text-green-600 bg-green-50 border-green-200';
    if (unresolvedCount < 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConflictStatusIcon = (unresolvedCount: number) => {
    if (unresolvedCount === 0) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l6.09-6.09L17.5 9.5 10 17z"/>
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Crisis Management Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor system status, conflicts, and coordinate response efforts
        </p>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Connection Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Connection</p>
              <p className="text-xl font-semibold text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Sync Operations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${pendingOperations > 0 ? 'bg-orange-500' : 'bg-green-500'}`}></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Sync</p>
              <p className="text-xl font-semibold text-gray-900">
                {pendingOperations}
              </p>
            </div>
          </div>
        </div>

        {/* Total Conflicts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-3 bg-blue-500"></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Conflicts</p>
              <p className="text-xl font-semibold text-gray-900">
                {summary?.totalConflicts || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Unresolved Conflicts */}
        <div className={`rounded-lg border p-6 ${summary ? getConflictStatusColor(summary.unresolvedConflicts) : 'bg-white border-gray-200'}`}>
          <div className="flex items-center">
            {summary && getConflictStatusIcon(summary.unresolvedConflicts)}
            <div className="ml-3">
              <p className="text-sm font-medium">Unresolved</p>
              <p className="text-xl font-semibold">
                {summary?.unresolvedConflicts || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Summary Metrics */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Conflict Resolution Summary</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Resolution Rate:</span>
              <span className="text-lg font-semibold text-green-600">{summary.resolutionRate}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Resolution Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Resolution Methods</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Auto-resolved</span>
                  <span className="text-sm font-medium">{summary.autoResolvedConflicts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Manual</span>
                  <span className="text-sm font-medium">{summary.manuallyResolvedConflicts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-medium text-red-600">{summary.unresolvedConflicts}</span>
                </div>
              </div>
            </div>

            {/* Conflicts by Type */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Conflicts by Type</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Assessments</span>
                  <span className="text-sm font-medium">{summary.conflictsByType.assessment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Responses</span>
                  <span className="text-sm font-medium">{summary.conflictsByType.response}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Entities</span>
                  <span className="text-sm font-medium">{summary.conflictsByType.entity}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Conflicts</h3>
              <div className="space-y-2">
                {summary.recentConflicts.length > 0 ? (
                  summary.recentConflicts.slice(0, 3).map((conflict) => (
                    <div key={conflict.id} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-600">{conflict.entityType}</span>
                        <div className={`w-2 h-2 rounded-full inline-block ml-2 ${conflict.isResolved ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(conflict.conflictDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No recent conflicts</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowExportDialog(true)}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
              </svg>
              <div>
                <h3 className="font-medium text-gray-900">Export Conflicts</h3>
                <p className="text-sm text-gray-600">Download conflict reports</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/assessments'}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <div>
                <h3 className="font-medium text-gray-900">Review Assessments</h3>
                <p className="text-sm text-gray-600">Verify pending assessments</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/responses'}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <div>
                <h3 className="font-medium text-gray-900">Coordinate Response</h3>
                <p className="text-sm text-gray-600">Manage response efforts</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Conflict Log */}
      <ConflictLog className="mb-8" />

      {/* Export Dialog */}
      <ConflictExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  );
}