'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface PanelResizerProps {
  onResize: (leftWidth: number, centerWidth: number, rightWidth: number) => void;
  leftPanelMinWidth?: number;
  centerPanelMinWidth?: number;
  rightPanelMinWidth?: number;
  leftPanelMaxWidth?: number;
  centerPanelMaxWidth?: number;
  rightPanelMaxWidth?: number;
  initialSizes?: {
    left: number;
    center: number;
    right: number;
  };
  disabled?: boolean;
}

interface ResizerHandleProps {
  position: 'left' | 'right';
  isDragging: boolean;
  onDragStart: (position: 'left' | 'right') => void;
  disabled?: boolean;
}

/**
 * Individual resize handle component
 */
const ResizerHandle: React.FC<ResizerHandleProps> = ({ 
  position, 
  isDragging, 
  onDragStart, 
  disabled 
}) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    onDragStart(position);
  }, [position, onDragStart, disabled]);

  return (
    <div
      className={cn(
        // Base styles
        'absolute top-0 bottom-0 w-1 z-20',
        'transition-colors duration-150',
        
        // Position
        position === 'left' ? 'right-0' : 'left-0',
        
        // Hover and drag states
        'hover:bg-blue-400',
        isDragging && 'bg-blue-500',
        
        // Cursor
        !disabled && 'cursor-col-resize',
        disabled && 'cursor-default',
        
        // Touch feedback
        'active:bg-blue-500'
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={disabled ? undefined : (e) => {
        e.preventDefault();
        onDragStart(position);
      }}
      role="separator"
      aria-label={`Resize ${position} panel`}
      aria-orientation="vertical"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDragStart(position);
        }
      }}
    />
  );
};

/**
 * Panel resizer component that enables dragging dividers between panels
 * 
 * Features:
 * - Drag-to-resize functionality with visual feedback
 * - Minimum/maximum width constraints
 * - Smooth resize animations
 * - Touch support for mobile devices
 * - Keyboard accessibility
 */
export const PanelResizer: React.FC<PanelResizerProps> = ({
  onResize,
  leftPanelMinWidth = 20,
  centerPanelMinWidth = 20,
  rightPanelMinWidth = 20,
  leftPanelMaxWidth = 50,
  centerPanelMaxWidth = 60,
  rightPanelMaxWidth = 50,
  initialSizes = { left: 30, center: 40, right: 30 },
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const [currentSizes, setCurrentSizes] = useState(initialSizes);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startSizesRef = useRef(initialSizes);

  // Handle mouse/touch move during resize
  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const deltaX = clientX - startXRef.current;
    const deltaPercent = (deltaX / containerWidth) * 100;

    const newSizes = { ...startSizesRef.current };

    if (isDragging === 'left') {
      // Resize left and center panels
      newSizes.left = Math.max(
        leftPanelMinWidth,
        Math.min(leftPanelMaxWidth, startSizesRef.current.left + deltaPercent)
      );
      newSizes.center = 100 - newSizes.left - currentSizes.right;
      
      // Ensure center panel respects constraints
      if (newSizes.center < centerPanelMinWidth) {
        newSizes.center = centerPanelMinWidth;
        newSizes.left = 100 - newSizes.center - currentSizes.right;
      }
      if (newSizes.center > centerPanelMaxWidth) {
        newSizes.center = centerPanelMaxWidth;
        newSizes.left = 100 - newSizes.center - currentSizes.right;
      }
    } else if (isDragging === 'right') {
      // Resize center and right panels
      newSizes.right = Math.max(
        rightPanelMinWidth,
        Math.min(rightPanelMaxWidth, startSizesRef.current.right - deltaPercent)
      );
      newSizes.center = 100 - currentSizes.left - newSizes.right;
      
      // Ensure center panel respects constraints
      if (newSizes.center < centerPanelMinWidth) {
        newSizes.center = centerPanelMinWidth;
        newSizes.right = 100 - currentSizes.left - newSizes.center;
      }
      if (newSizes.center > centerPanelMaxWidth) {
        newSizes.center = centerPanelMaxWidth;
        newSizes.right = 100 - currentSizes.left - newSizes.center;
      }
    }

    // Normalize to ensure 100% total
    const total = newSizes.left + newSizes.center + newSizes.right;
    if (Math.abs(total - 100) > 0.1) {
      const adjustment = (100 - total) / 3;
      newSizes.left += adjustment;
      newSizes.center += adjustment;
      newSizes.right += adjustment;
    }

    setCurrentSizes(newSizes);
    onResize(newSizes.left, newSizes.center, newSizes.right);
  }, [
    isDragging,
    currentSizes.right,
    leftPanelMinWidth,
    leftPanelMaxWidth,
    centerPanelMinWidth,
    centerPanelMaxWidth,
    rightPanelMinWidth,
    rightPanelMaxWidth,
    onResize
  ]);

  // Handle drag start
  const handleDragStart = useCallback((position: 'left' | 'right') => {
    if (disabled) return;
    
    setIsDragging(position);
    startXRef.current = position === 'left' 
      ? currentSizes.left * (containerRef.current?.clientWidth || 0) / 100
      : (100 - currentSizes.right) * (containerRef.current?.clientWidth || 0) / 100;
    startSizesRef.current = { ...currentSizes };

    // Add global event listeners
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [disabled, currentSizes]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  // Global mouse/touch event listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      // Clean up event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleDragEnd]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
    >
      {/* Left resizer handle */}
      <ResizerHandle
        position="left"
        isDragging={isDragging === 'left'}
        onDragStart={handleDragStart}
        disabled={disabled}
      />

      {/* Right resizer handle */}
      <ResizerHandle
        position="right"
        isDragging={isDragging === 'right'}
        onDragStart={handleDragStart}
        disabled={disabled}
      />

      {/* Visual feedback overlay when dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-20 z-10 pointer-events-none" />
      )}
    </div>
  );
};

export default PanelResizer;