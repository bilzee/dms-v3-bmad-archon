'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TouchGestureOptions {
  onPinchZoom?: (scale: number, centerX: number, centerY: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onPanEnd?: () => void;
  onTap?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  threshold?: number;
  preventDefault?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  identifier: number;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) {
  const {
    onPinchZoom,
    onPan,
    onPanEnd,
    onTap,
    onDoubleTap,
    threshold = 10,
    preventDefault = true
  } = options;

  const touchesRef = useRef<TouchPoint[]>([]);
  const lastDistanceRef = useRef<number>(0);
  const lastPanTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const now = Date.now();
    const touches = Array.from(e.touches);

    touchesRef.current = touches.map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      identifier: touch.identifier
    }));

    if (touches.length === 1) {
      // Potential tap or double tap
      const touch = touches[0];

      // Check for double tap
      if (lastTapTimeRef.current && lastTapPositionRef.current) {
        const timeDiff = now - lastTapTimeRef.current;
        const distance = Math.sqrt(
          Math.pow(touch.clientX - lastTapPositionRef.current.x, 2) +
          Math.pow(touch.clientY - lastTapPositionRef.current.y, 2)
        );

        if (timeDiff < 300 && distance < 50) {
          // Double tap detected
          onDoubleTap?.(touch.clientX, touch.clientY);
          lastTapTimeRef.current = 0;
          return;
        }
      }

      lastTapTimeRef.current = now;
      lastTapPositionRef.current = { x: touch.clientX, y: touch.clientY };
      isPanningRef.current = true;
    } else if (touches.length === 2) {
      // Potential pinch zoom
      isPinchingRef.current = true;
      isPanningRef.current = false;
      lastDistanceRef.current = getDistance(touches[0], touches[1]);
    }
  }, [preventDefault, onDoubleTap, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const touches = Array.from(e.touches);
    const now = Date.now();

    if (touches.length === 2 && isPinchingRef.current) {
      // Pinch zoom
      const currentDistance = getDistance(touches[0], touches[1]);
      const center = getCenter(touches[0], touches[1]);
      
      if (lastDistanceRef.current > 0) {
        const scale = currentDistance / lastDistanceRef.current;
        onPinchZoom?.(scale, center.x, center.y);
      }
      
      lastDistanceRef.current = currentDistance;
    } else if (touches.length === 1 && isPanningRef.current && !isPinchingRef.current) {
      // Pan gesture
      const touch = touches[0];
      const lastTouch = touchesRef.current[0];
      
      if (lastTouch && now - lastPanTimeRef.current > 16) { // Throttle to ~60fps
        const deltaX = touch.clientX - lastTouch.x;
        const deltaY = touch.clientY - lastTouch.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > threshold) {
          onPan?.(deltaX, deltaY);
          lastPanTimeRef.current = now;
          
          // Update last touch position
          touchesRef.current[0] = {
            x: touch.clientX,
            y: touch.clientY,
            identifier: touch.identifier
          };
        }
      }
    }
  }, [preventDefault, onPinchZoom, onPan, getDistance, getCenter, threshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const touches = Array.from(e.touches);
    const now = Date.now();

    if (touches.length === 0) {
      // All fingers lifted
      if (isPanningRef.current) {
        onPanEnd?.();
      }
      
      // Check for tap if we didn't pan much
      const lastTouch = touchesRef.current[0];
      if (lastTouch && lastTapPositionRef.current) {
        const distance = Math.sqrt(
          Math.pow(lastTouch.x - lastTapPositionRef.current.x, 2) +
          Math.pow(lastTouch.y - lastTapPositionRef.current.y, 2)
        );
        const timeDiff = now - lastTapTimeRef.current;
        
        if (distance < threshold && timeDiff < 200 && !isPinchingRef.current) {
          onTap?.(lastTouch.x, lastTouch.y);
        }
      }
      
      isPinchingRef.current = false;
      isPanningRef.current = false;
    } else if (touches.length === 1 && isPinchingRef.current) {
      // Pinch ended, but one finger still down
      isPinchingRef.current = false;
      isPanningRef.current = true;
    }

    touchesRef.current = touches.map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      identifier: touch.identifier
    }));
  }, [preventDefault, onPanEnd, onTap, threshold]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: !preventDefault });

    return () => {
      // Clean up event listeners
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);
}

export default useTouchGestures;