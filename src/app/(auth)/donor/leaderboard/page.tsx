'use client';

import React from 'react';
import { LeaderboardDisplay } from '@/components/donor/LeaderboardDisplay';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Info } from 'lucide-react';

export default function LeaderboardPage() {
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
          Rankings are updated every 15 minutes based on verified delivery rates, 
          commitment value, consistency, and response speed.
        </p>
      </div>

      {/* Leaderboard Explanation */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            How Rankings Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">40%</div>
              <div className="text-sm text-gray-600">Verified Delivery Rate</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">30%</div>
              <div className="text-sm text-gray-600">Commitment Value</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">20%</div>
              <div className="text-sm text-gray-600">Consistency</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">10%</div>
              <div className="text-sm text-gray-600">Response Speed</div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
              🥇 Top 10%: Reliable Delivery Gold (95%+)
            </Badge>
            <Badge variant="outline" className="bg-gray-50 border-gray-300 text-gray-700">
              🥈 Top 25%: Reliable Delivery Silver (85%+)
            </Badge>
            <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
              🥉 Top 40%: Reliable Delivery Bronze (70%+)
            </Badge>
          </div>
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