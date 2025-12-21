'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type DashboardMode = 'coordinator' | 'executive';

interface ModeToggleProps {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  className?: string;
}

export function ModeToggle({ mode, onModeChange, className }: ModeToggleProps) {
  const isExecutive = mode === 'executive';

  return (
    <div className={cn("flex items-center gap-4 p-3 bg-gray-50 rounded-lg border transition-all duration-300 ease-in-out hover:shadow-md", className)}>
      <div className="flex items-center gap-2">
        <Users className={cn(
          "h-4 w-4 transition-all duration-300 ease-in-out transform",
          !isExecutive ? "text-blue-600 scale-110" : "text-gray-400 scale-100"
        )} />
        <Label 
          htmlFor="mode-toggle" 
          className={cn(
            "text-sm font-medium cursor-pointer transition-all duration-300 ease-in-out",
            !isExecutive ? "text-gray-900 font-semibold" : "text-gray-500 font-medium"
          )}
        >
          Coordinator
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="mode-toggle"
          checked={isExecutive}
          onCheckedChange={(checked) => onModeChange(checked ? 'executive' : 'coordinator')}
          className="data-[state=checked]:bg-amber-600 transition-all duration-300 ease-in-out"
        />
        <Badge 
          variant={isExecutive ? "default" : "secondary"}
          className={cn(
            "transition-all duration-300 ease-in-out transform hover:scale-105",
            isExecutive ? "bg-amber-100 text-amber-800 border-amber-200 animate-in fade-in-0 slide-in-from-bottom-1" : "animate-in fade-in-0 slide-in-from-bottom-1"
          )}
        >
          {isExecutive ? "Executive" : "Standard"}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Label 
          htmlFor="mode-toggle" 
          className={cn(
            "text-sm font-medium cursor-pointer transition-all duration-300 ease-in-out",
            isExecutive ? "text-gray-900 font-semibold" : "text-gray-500 font-medium"
          )}
        >
          Executive
        </Label>
        <Crown className={cn(
          "h-4 w-4 transition-all duration-300 ease-in-out transform",
          isExecutive ? "text-amber-600 scale-110" : "text-gray-400 scale-100"
        )} />
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <div>
                <strong>Coordinator Mode:</strong> Detailed operational view with entity selection and gap analysis
              </div>
              <div>
                <strong>Executive Mode:</strong> High-level overview with organizational metrics and simplified displays
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}