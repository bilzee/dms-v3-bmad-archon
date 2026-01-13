'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PanelResizer } from './PanelResizer';
import { useDashboardLayoutStore } from '@/stores/dashboardLayout.store';

export interface PanelConfiguration {
  leftPanelWidth: number;
  centerPanelWidth: number;
  rightPanelWidth: number;
}

interface SituationDashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  defaultPanelSizes?: PanelConfiguration;
}

interface PanelProps {
  position: 'left' | 'center' | 'right';
  children: React.ReactNode;
  className?: string;
}

/**
 * Three-panel dashboard layout component for situation awareness dashboard
 * 
 * Features:
 * - Responsive CSS Grid layout with three distinct panels
 * - Full-screen optimization with proper viewport height calculations
 * - No vertical scroll on standard displays (1920x1080 and larger)
 * - Mobile responsive design with stackable panels
 * - Panel resize capability (to be implemented in Task 2)
 */
export const SituationDashboardLayout: React.FC<SituationDashboardLayoutProps> = ({
  children,
  className,
  defaultPanelSizes
}) => {
  // Use Zustand store for layout state
  const { 
    panelSizes, 
    isResizing, 
    activePanel, 
    setPanelSizes, 
    setIsResizing, 
    setActivePanel,
    isMobile
  } = useDashboardLayoutStore();
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobileView = width < 1024; // lg breakpoint
      
      // Update store with responsive state
      setActivePanel(null);
      setIsResizing(false);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setActivePanel, setIsResizing]);

  // Handle panel resize from PanelResizer component
  const handlePanelResize = (leftWidth: number, centerWidth: number, rightWidth: number) => {
    setPanelSizes({ left: leftWidth, center: centerWidth, right: rightWidth });
  };

  // Calculate grid template columns based on panel sizes
  const gridTemplateColumns = isMobile 
    ? '1fr' // Single column on mobile
    : `${panelSizes.leftPanelWidth}% ${panelSizes.centerPanelWidth}% ${panelSizes.rightPanelWidth}%`;

  if (isMobile) {
    // Mobile layout: stacked panels
    return (
      <div 
        ref={containerRef}
        className={cn(
          'h-[calc(100vh-8rem)]',
          'min-h-[600px]',
          'w-full',
          'flex flex-col',
          'space-y-4',
          className
        )}
      >
        {React.Children.map(children, (child, index) => {
          if (!child) return null;
          
          const position = index === 0 ? 'left' : index === 1 ? 'center' : 'right';
          
          return (
            <Panel 
              key={position}
              position={position}
              className={cn(
                'bg-white border border-gray-200',
                'overflow-hidden',
                'flex-1',
                'flex flex-col'
              )}
            >
              {child}
            </Panel>
          );
        })}
      </div>
    );
  }

  // Desktop layout: resizable panels
  return (
    <div 
      ref={containerRef}
      className={cn(
        'h-[calc(100vh-8rem)]',
        'min-h-[600px]',
        'w-full',
        'relative',
        className
      )}
    >
      <div 
        className={cn(
          'h-full w-full',
          'grid gap-0',
          'transition-all duration-200 ease-in-out'
        )}
        style={{
          gridTemplateColumns,
        }}
      >
        {React.Children.map(children, (child, index) => {
          if (!child) return null;
          
          const position = index === 0 ? 'left' : index === 1 ? 'center' : 'right';
          
          return (
            <Panel 
              key={position}
              position={position}
              className={cn(
                'bg-white border border-gray-200',
                'border-r',
                'last:border-r-0',
                'h-full',
                'flex flex-col',
                // Left and right panels need scrolling, center panel keeps overflow-hidden
                position === 'center' ? 'overflow-hidden' : 'overflow-y-auto'
              )}
            >
              {child}
            </Panel>
          );
        })}
      </div>
      
      {/* Panel resizer overlay */}
      <PanelResizer
        onResize={handlePanelResize}
        disabled={isResizing}
        initialSizes={{
          left: panelSizes.leftPanelWidth,
          center: panelSizes.centerPanelWidth,
          right: panelSizes.rightPanelWidth
        }}
      />
    </div>
  );
};

const Panel: React.FC<PanelProps> = ({ position, children, className }) => {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      {children}
    </div>
  );
};

export default SituationDashboardLayout;