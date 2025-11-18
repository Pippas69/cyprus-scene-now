import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollPosition {
  x: number;
  y: number;
}

const scrollPositions = new Map<string, ScrollPosition>();

export const useScrollMemory = () => {
  const location = useLocation();
  const key = location.pathname + location.search;
  const isRestoringRef = useRef(false);

  useEffect(() => {
    // Restore scroll position when component mounts
    const savedPosition = scrollPositions.get(key);
    if (savedPosition && !isRestoringRef.current) {
      isRestoringRef.current = true;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo(savedPosition.x, savedPosition.y);
        isRestoringRef.current = false;
      });
    }

    // Save scroll position on unmount and during scroll
    const handleScroll = () => {
      if (!isRestoringRef.current) {
        scrollPositions.set(key, {
          x: window.scrollX,
          y: window.scrollY
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Save final position before unmount
      handleScroll();
    };
  }, [key]);
};

export const clearScrollMemory = () => {
  scrollPositions.clear();
};
