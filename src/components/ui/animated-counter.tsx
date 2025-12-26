import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter = ({
  value,
  duration = 1000,
  className,
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const difference = endValue - startValue;
    
    if (difference === 0) return;
    
    setIsAnimating(true);
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.round(startValue + difference * easeOut);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span
      className={cn(
        "tabular-nums transition-transform",
        isAnimating && "animate-count-pulse",
        className
      )}
    >
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};
