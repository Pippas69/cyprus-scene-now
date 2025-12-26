import { useMemo } from 'react';

interface StaggerConfig {
  baseDelay?: number;
  delayIncrement?: number;
  maxDelay?: number;
}

interface StaggerProps {
  style: {
    animationDelay: string;
    opacity: number;
  };
  className: string;
}

export function useStaggeredAnimation(config: StaggerConfig = {}) {
  const { 
    baseDelay = 0, 
    delayIncrement = 50, 
    maxDelay = 500 
  } = config;

  const getStaggerProps = useMemo(() => {
    return (index: number): StaggerProps => {
      const delay = Math.min(baseDelay + index * delayIncrement, maxDelay);
      return {
        style: {
          animationDelay: `${delay}ms`,
          opacity: 0,
        },
        className: 'animate-stagger-fade-in',
      };
    };
  }, [baseDelay, delayIncrement, maxDelay]);

  const getStaggerDelay = (index: number): number => {
    return Math.min(baseDelay + index * delayIncrement, maxDelay);
  };

  return { getStaggerProps, getStaggerDelay };
}

export default useStaggeredAnimation;
