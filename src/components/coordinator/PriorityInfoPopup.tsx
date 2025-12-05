'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityInfoPopupProps {
  className?: string;
}

interface PriorityInfo {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
  bgStyle: string;
  description: string;
  examples: string[];
  responseTime: string;
  impact: string;
}

const PRIORITY_INFOS: PriorityInfo[] = [
  {
    level: 'CRITICAL',
    color: 'text-red-600',
    bgStyle: 'bg-red-100 text-red-800 border-red-300',
    description: 'Immediate life-threatening situations requiring urgent action',
    examples: [
      'Mass casualties (>10 deaths)',
      'Hospital infrastructure failure',
      'Widespread disease outbreak',
      'Mass displacement (>1000 people)'
    ],
    responseTime: 'Immediate response required',
    impact: 'High risk of loss of life or severe injury'
  },
  {
    level: 'HIGH',
    color: 'text-orange-600',
    bgStyle: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Serious situations requiring prompt response',
    examples: [
      'Multiple injuries (3-10)',
      'Partial infrastructure damage',
      'Localized health concerns',
      'Significant displacement (100-1000 people)'
    ],
    responseTime: 'Response within 1-2 hours',
    impact: 'Potential for escalation if not addressed'
  },
  {
    level: 'MEDIUM',
    color: 'text-yellow-600',
    bgStyle: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Moderate situations requiring attention',
    examples: [
      'Minor injuries (<3)',
      'Resource shortages',
      'Isolated incidents',
      'Small-scale displacement (<100 people)'
    ],
    responseTime: 'Response within 4-6 hours',
    impact: 'Manageable with available resources'
  },
  {
    level: 'LOW',
    color: 'text-green-600',
    bgStyle: 'bg-green-100 text-green-800 border-green-300',
    description: 'Minor situations requiring monitoring',
    examples: [
      'Non-critical service disruptions',
      'Supply chain concerns',
      'Information gathering needs',
      'Preventive measures'
    ],
    responseTime: 'Response within 24 hours',
    impact: 'Low immediate risk, monitoring advised'
  }
];

export function PriorityInfoPopup({ className }: PriorityInfoPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("text-muted-foreground hover:text-foreground", className)}
        >
          <Info className="h-4 w-4" />
          Priority Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Understanding Priority Levels
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Introduction */}
          <div className="text-sm text-muted-foreground">
            <p>
              Priority levels indicate the urgency and severity of incidents. They help coordinate 
              response teams prioritize actions and allocate resources effectively.
            </p>
          </div>

          {/* Priority Levels */}
          <div className="grid grid-cols-1 gap-6">
            {PRIORITY_INFOS.map((priority) => (
              <div key={priority.level} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={priority.bgStyle}
                  >
                    {priority.level}
                  </Badge>
                  <span className={cn("text-sm font-medium", priority.color)}>
                    {priority.level === 'CRITICAL' && '🚨'}
                    {priority.level === 'HIGH' && '⚠️'}
                    {priority.level === 'MEDIUM' && '📍'}
                    {priority.level === 'LOW' && '📋'}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{priority.description}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Examples</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {priority.examples.map((example, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-xs text-gray-500">Response Time</span>
                    <p className="text-muted-foreground">{priority.responseTime}</p>
                  </div>
                  <div>
                    <span className="font-medium text-xs text-gray-500">Impact</span>
                    <p className="text-muted-foreground">{priority.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Reference Guide */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Quick Reference</h4>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">🚨</Badge>
                <span>Life-threatening - Immediate action required</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">⚠️</Badge>
                <span>Serious - Prompt response needed</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">📍</Badge>
                <span>Moderate - Attention required</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 text-center">📋</Badge>
                <span>Minor - Monitoring advised</span>
              </div>
            </div>
          </div>

          {/* Usage Notes */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Usage Notes:</p>
            <ul className="space-y-1">
              <li>• Priorities are assigned by assessors based on initial impact assessment</li>
              <li>• Priorities can be updated as more information becomes available</li>
              <li>• Response teams use priorities to allocate resources and plan interventions</li>
              <li>• Critical incidents automatically trigger immediate notification protocols</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}