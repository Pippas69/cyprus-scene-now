import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent",
        "before:animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )} 
      {...props} 
    />
  );
}

interface SkeletonGroupProps {
  count: number;
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  children?: (index: number) => React.ReactNode;
}

function SkeletonGroup({
  count,
  className,
  itemClassName,
  staggerDelay = 50,
  children,
}: SkeletonGroupProps) {
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            delay: prefersReducedMotion ? 0 : index * (staggerDelay / 1000),
          }}
          className={itemClassName}
        >
          {children ? children(index) : <Skeleton className="h-12 w-full" />}
        </motion.div>
      ))}
    </div>
  );
}

interface ContentRevealProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

function ContentReveal({
  isLoading,
  skeleton,
  children,
  className,
  duration = 0.4,
}: ContentRevealProps) {
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : duration / 2 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : duration,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Skeleton, SkeletonGroup, ContentReveal };
