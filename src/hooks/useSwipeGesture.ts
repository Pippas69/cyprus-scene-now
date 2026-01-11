import { useRef, useEffect, useState, RefObject } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minDistance?: number;
}

interface SwipeState {
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

export const useSwipeGesture = <T extends HTMLElement>(
  options: SwipeGestureOptions
): [RefObject<T>, SwipeState] => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minDistance = 50
  } = options;

  const elementRef = useRef<T>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    distance: 0
  });

  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const isSwipingRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Passive listener: never block native scrolling
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      currentX.current = startX.current;
      currentY.current = startY.current;
      isSwipingRef.current = true;
      setSwipeState({ isSwiping: true, direction: null, distance: 0 });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipingRef.current) return;

      currentX.current = e.touches[0].clientX;
      currentY.current = e.touches[0].clientY;

      const deltaX = currentX.current - startX.current;
      const deltaY = currentY.current - startY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let direction: 'left' | 'right' | 'up' | 'down' | null = null;
      let distance = 0;

      if (absDeltaX > absDeltaY) {
        direction = deltaX > 0 ? 'right' : 'left';
        distance = absDeltaX;
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
        distance = absDeltaY;
      }

      setSwipeState({ isSwiping: true, direction, distance });
    };

    const handleTouchEnd = () => {
      if (!isSwipingRef.current) return;

      const deltaX = currentX.current - startX.current;
      const deltaY = currentY.current - startY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > absDeltaY && absDeltaX > minDistance) {
        if (deltaX > 0 && onSwipeRight) onSwipeRight();
        else if (deltaX < 0 && onSwipeLeft) onSwipeLeft();
      } else if (absDeltaY > absDeltaX && absDeltaY > minDistance) {
        if (deltaY > 0 && onSwipeDown) onSwipeDown();
        else if (deltaY < 0 && onSwipeUp) onSwipeUp();
      }

      isSwipingRef.current = false;
      setSwipeState({ isSwiping: false, direction: null, distance: 0 });
    };

    // Passive listeners prevent iOS from waiting on JS before allowing scroll
    const passive = { passive: true } as const;
    element.addEventListener('touchstart', handleTouchStart, passive);
    element.addEventListener('touchmove', handleTouchMove, passive);
    element.addEventListener('touchend', handleTouchEnd, passive);
    element.addEventListener('touchcancel', handleTouchEnd, passive);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [minDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return [elementRef, swipeState];
};
