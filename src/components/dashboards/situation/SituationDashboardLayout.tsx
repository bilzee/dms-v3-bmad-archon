'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PanelResizer } from './PanelResizer';
import { useDashboardLayoutStore } from '@/stores/dashboardLayout.store';

interface PanelConfiguration {
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
    screenSize,
    updateResponsiveState,
    getOptimalPanelSizes
  } = useDashboardLayoutStore();
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle enhanced responsive breakpoints
  useEffect(() => {
    // Initialize responsive state on mount
    updateResponsiveState();

    const handleResize = () => {
      // Update responsive state using enhanced logic
      updateResponsiveState();
      // Reset active panel and resizing state on breakpoint change
      setActivePanel(null);
      setIsResizing(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateResponsiveState, setActivePanel, setIsResizing]);

  // Handle panel resize from PanelResizer component
  const handlePanelResize = (leftWidth: number, centerWidth: number, rightWidth: number) => {
    setPanelSizes({ left: leftWidth, center: centerWidth, right: rightWidth });
  };

  // Calculate grid template columns based on screen size and panel sizes
  const getGridLayout = () => {
    switch (screenSize) {
      case 'mobile':
        return '1fr'; // Single column stacked
      case 'tablet':
        // 2-column layout: Left + (Center+Right stacked)
        return `${panelSizes.leftPanelWidth}% ${panelSizes.rightPanelWidth}%`;
      case 'smallDesktop':
      case 'largeDesktop':
      case 'ultraWide':
        // 3-column layout with optimized proportions
        return `${panelSizes.leftPanelWidth}% ${panelSizes.centerPanelWidth}% ${panelSizes.rightPanelWidth}%`;
      default:
        return `${panelSizes.leftPanelWidth}% ${panelSizes.centerPanelWidth}% ${panelSizes.rightPanelWidth}%`;
    }
  };

  // Optimized height calculations - maximize viewport usage
  // We have: mobile header (64px) + minimal py-1 padding + compact title ~ 2rem total
  const containerHeight = 'h-[calc(100vh-2rem)]';

  if (screenSize === 'mobile') {
    // Mobile layout: stacked panels with better spacing
    return (
      <div 
        ref={containerRef}
        className={cn(
          containerHeight,
          'min-h-[600px]',
          'w-full',
          'flex flex-col',
          'gap-3', // Reduced from space-y-4 for better density
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

  // Enhanced desktop layout with optimized space utilization
  return (
    <div 
      ref={containerRef}
      className={cn(
        containerHeight, // Using optimized height calculation
        'min-h-[600px]',
        'w-full',
        'relative',
        // Remove width constraints - use full viewport width
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
          gridTemplateColumns: getGridLayout(),
        }}
      >
        {React.Children.map(children, (child, index) => {
          if (!child) return null;
          
          const position = index === 0 ? 'left' : index === 1 ? 'center' : 'right';
          
          // Special handling for tablet layout (2-column)
          if (screenSize === 'tablet' && position === 'center') {
            // Center panel is stacked with right panel on tablet
            return null;
          }
          
          // For tablet, combine center and right panels
          if (screenSize === 'tablet' && position === 'right') {
            return (
              <Panel 
                key="combined-center-right"
                position="right"
                className={cn(
                  'bg-white border border-gray-200',
                  'overflow-hidden',
                  'border-r',
                  'last:border-r-0',
                  'h-full',
                  'flex flex-col'
                )}
              >
                <div className="flex-1 overflow-hidden">
                  {React.Children.toArray(children)[1]} {/* Center panel */}
                </div>
                <div className="flex-1 overflow-hidden border-t">
                  {React.Children.toArray(children)[2]} {/* Right panel */}
                </div>
              </Panel>
            );
          }
          
          return (
            <Panel 
              key={position}
              position={position}
              className={cn(
                'bg-white border border-gray-200',
                'overflow-hidden',
                'border-r',
                'last:border-r-0',
                'h-full',
                'flex flex-col'
              )}
            >
              {child}
            </Panel>
          );
        })}
      </div>
      
      {/* Panel resizer overlay - only for desktop layouts */}
      {screenSize !== 'mobile' && screenSize !== 'tablet' && (
        <PanelResizer
          onResize={handlePanelResize}
          disabled={isResizing}
          initialSizes={{
            left: panelSizes.leftPanelWidth,
            center: panelSizes.centerPanelWidth,
            right: panelSizes.rightPanelWidth
          }}
        />
      )}
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