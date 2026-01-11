import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

// Hook to detect reduced motion preference
const useReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  variant?: "fade" | "slide" | "scale" | "slideUp";
}

const variants: Record<string, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
  slideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  },
};

const reducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export function PageTransition({ 
  children, 
  className = "",
  variant = "slideUp"
}: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  const selectedVariants = prefersReducedMotion ? reducedVariants : variants[variant];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedVariants}
      transition={{
        duration: prefersReducedMotion ? 0.15 : 0.3,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth feel
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for child animations
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export function StaggerContainer({ 
  children, 
  className = "",
  staggerDelay = 0.08 
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        ...staggerContainerVariants,
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger item for use within StaggerContainer
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Fade in on scroll component
interface FadeInViewProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function FadeInView({ 
  children, 
  className = "", 
  delay = 0 
}: FadeInViewProps) {
  // Render immediately without scroll-based animation for stable layouts
  return <div className={className}>{children}</div>;
}

export { useReducedMotion };
