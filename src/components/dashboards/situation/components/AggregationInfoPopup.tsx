'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, X, BarChart3, Users, AlertTriangle, CheckCircle } from 'lucide-react';

interface AggregationInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AggregationInfoPopup({ isOpen, onClose }: AggregationInfoPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-600" />
              Understanding "All Entities" Aggregation
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Overview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              What This View Shows
            </h3>
            <p className="text-gray-600 leading-relaxed">
              When you select <span className="font-medium">"All Entities"</span>, the dashboard combines assessment data 
              from all entities affected by the selected incident. This gives you a comprehensive overview of gaps 
              across the entire incident area, helping identify widespread issues and prioritize resources effectively.
            </p>
          </div>

          {/* How Aggregation Works */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              How We Calculate Severity
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-700">
                We analyze each gap indicator across all entities and calculate severity based on 
                <span className="font-medium"> how many entities are affected</span>:
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <div>
                    <span className="font-semibold">CRITICAL (67%+)</span> - Most entities affected (2/3 or more)
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <div>
                    <span className="font-semibold">HIGH (34-66%)</span> - Many entities affected (1/3 or more)
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <div>
                    <span className="font-semibold">MEDIUM (1-33%)</span> - Some entities affected
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <div>
                    <span className="font-semibold">LOW (0%)</span> - No entities affected
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Practical Example
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                <span className="font-semibold">Scenario:</span> 5 entities have Food assessments
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>"Food Sufficiency" gap in 4 entities</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">CRITICAL</span>
                </div>
                <div className="text-gray-600 text-xs pl-2">
                  4 out of 5 entities = 80% affected → CRITICAL severity
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span>"Regular Meal Access" gap in 2 entities</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">HIGH</span>
                </div>
                <div className="text-gray-600 text-xs pl-2">
                  2 out of 5 entities = 40% affected → HIGH severity
                </div>
              </div>
            </div>
          </div>

          {/* What the Colors Mean */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              What the Colors Indicate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-sm font-medium">Red (Critical)</span>
                </div>
                <p className="text-xs text-gray-600 pl-5">
                  Urgent action needed. Widespread problem affecting most entities.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Orange (High)</span>
                </div>
                <p className="text-xs text-gray-600 pl-5">
                  Significant issue requiring immediate attention.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">Yellow (Medium)</span>
                </div>
                <p className="text-xs text-gray-600 pl-5">
                  Moderate issue affecting some entities.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium">Green (Low)</span>
                </div>
                <p className="text-xs text-gray-600 pl-5">
                  No significant gaps detected.
                </p>
              </div>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Key Benefits</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Identifies widespread issues that need coordinated response</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Helps prioritize resource allocation to most critical gaps</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Reveals patterns across different locations and entity types</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Enables data-driven decision making for incident response</span>
              </li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              Got it, thanks!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AggregationInfoPopup;