'use client';

import React from 'react';
import { LeaderboardDisplay } from '@/components/donor/LeaderboardDisplay';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Info, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth/token-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function LeaderboardPage() {
  // Fetch leaderboard ranking criteria from backend
  const { 
    data: criteriaData, 
    isLoading: criteriaLoading, 
    error: criteriaError,
    refetch: refetchCriteria
  } = useQuery({
    queryKey: ['leaderboard-criteria'],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token available');
      
      const response = await fetch('/api/v1/leaderboard/criteria', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch ranking criteria');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 15 * 60 * 1000 // Refresh every 15 minutes
  });

  const criteria = criteriaData?.criteria;
  const stats = criteriaData?.statistics;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-4xl font-bold text-gray-900">Donor Leaderboard</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Recognizing and celebrating our most dedicated disaster response partners. 
          Rankings are updated {criteria?.calculation?.updateFrequency || 'every 15 minutes'} based on verified delivery rates, 
          commitment value, consistency, and response speed.
        </p>
        {stats && (
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span>{stats.totalActiveDonors} active donors</span>
            <span>•</span>
            <span>Avg. delivery rate: {stats.averageDeliveryRate}%</span>
            <span>•</span>
            <span>Updated {new Date(stats.lastCalculated).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Leaderboard Explanation */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              How Rankings Work
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchCriteria()}
              disabled={criteriaLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${criteriaLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {criteriaLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <Skeleton className="h-6 w-96" />
              </div>
            </div>
          ) : criteria ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`text-center p-4 bg-${criteria.weights.deliveryRate.color}-50 rounded-lg`}>
                  <div className={`text-2xl font-bold text-${criteria.weights.deliveryRate.color}-700`}>
                    {criteria.weights.deliveryRate.percentage}%
                  </div>
                  <div className="text-sm text-gray-600">{criteria.weights.deliveryRate.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{criteria.weights.deliveryRate.description}</div>
                </div>
                <div className={`text-center p-4 bg-${criteria.weights.commitmentValue.color}-50 rounded-lg`}>
                  <div className={`text-2xl font-bold text-${criteria.weights.commitmentValue.color}-700`}>
                    {criteria.weights.commitmentValue.percentage}%
                  </div>
                  <div className="text-sm text-gray-600">{criteria.weights.commitmentValue.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{criteria.weights.commitmentValue.description}</div>
                </div>
                <div className={`text-center p-4 bg-${criteria.weights.consistency.color}-50 rounded-lg`}>
                  <div className={`text-2xl font-bold text-${criteria.weights.consistency.color}-700`}>
                    {criteria.weights.consistency.percentage}%
                  </div>
                  <div className="text-sm text-gray-600">{criteria.weights.consistency.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{criteria.weights.consistency.description}</div>
                </div>
                <div className={`text-center p-4 bg-${criteria.weights.responseSpeed.color}-50 rounded-lg`}>
                  <div className={`text-2xl font-bold text-${criteria.weights.responseSpeed.color}-700`}>
                    {criteria.weights.responseSpeed.percentage}%
                  </div>
                  <div className="text-sm text-gray-600">{criteria.weights.responseSpeed.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{criteria.weights.responseSpeed.description}</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                  {criteria.badgeThresholds.gold.icon} {criteria.badgeThresholds.gold.requirement}: {criteria.badgeThresholds.gold.name} ({criteria.badgeThresholds.gold.minDeliveryRate}%+)
                </Badge>
                <Badge variant="outline" className="bg-gray-50 border-gray-300 text-gray-700">
                  {criteria.badgeThresholds.silver.icon} {criteria.badgeThresholds.silver.requirement}: {criteria.badgeThresholds.silver.name} ({criteria.badgeThresholds.silver.minDeliveryRate}%+)
                </Badge>
                <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                  {criteria.badgeThresholds.bronze.icon} {criteria.badgeThresholds.bronze.requirement}: {criteria.badgeThresholds.bronze.name} ({criteria.badgeThresholds.bronze.minDeliveryRate}%+)
                </Badge>
              </div>

              {stats && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
                  <p><strong>Current Distribution:</strong> {stats.badgeDistribution.gold} (Gold) • {stats.badgeDistribution.silver} (Silver) • {stats.badgeDistribution.bronze} (Bronze)</p>
                  <p className="mt-1"><strong>Formula:</strong> {criteria.calculation.formula}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">Unable to load ranking criteria. Please try refreshing.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Leaderboard */}
      <div className="max-w-6xl mx-auto">
        <LeaderboardDisplay
          timeframe="30d"
          showFilters={true}
          interactive={true}
          limit={50}
        />
      </div>
    </div>
  );
}