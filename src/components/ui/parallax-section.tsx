import { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ParallaxSectionProps {
  children: ReactNode;
  intensity?: number; // 0 to 1, how much parallax effect
  className?: string;
  fadeOnScroll?: boolean;
}

const ParallaxSection = ({
  children,
  intensity = 0.3,
  className = "",
  fadeOnScroll = false,
}: ParallaxSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Transform based on scroll progress
  const y = useTransform(scrollYProgress, [0, 1], [100 * intensity, -100 * intensity]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    fadeOnScroll ? [0, 1, 1, 0] : [1, 1, 1, 1]
  );

  // Check for reduced motion
  const prefersReducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ParallaxSection;
