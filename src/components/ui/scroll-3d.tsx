import { useRef, ReactNode } from "react";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";

interface Reveal3DProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "flip";
}

export function Reveal3D({ children, className, delay = 0, direction = "up" }: Reveal3DProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const variants = {
    up: {
      hidden: { opacity: 0, y: 48, rotateX: 15, scale: 0.97 },
      visible: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
    },
    left: {
      hidden: { opacity: 0, x: -60, rotateY: -12, scale: 0.97 },
      visible: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
    },
    right: {
      hidden: { opacity: 0, x: 60, rotateY: 12, scale: 0.97 },
      visible: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
    },
    flip: {
      hidden: { opacity: 0, rotateY: 90, scale: 0.9 },
      visible: { opacity: 1, rotateY: 0, scale: 1 },
    },
  };

  return (
    <motion.div
      ref={ref}
      style={{ perspective: 1200 }}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants[direction]}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerGrid3DProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
}

export function StaggerGrid3D({ children, className, itemClassName, staggerDelay = 0.08 }: StaggerGrid3DProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          style={{ perspective: 1000 }}
          initial={{ opacity: 0, y: 40, rotateX: 12, scale: 0.95 }}
          animate={inView ? { opacity: 1, y: 0, rotateX: 0, scale: 1 } : {}}
          transition={{
            duration: 0.6,
            delay: i * staggerDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={itemClassName}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

interface ParallaxDepthProps {
  children: ReactNode;
  className?: string;
  speed?: number;
}

export function ParallaxDepth({ children, className, speed = 0.15 }: ParallaxDepthProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rawY = useTransform(scrollYProgress, [0, 1], [`${speed * -100}px`, `${speed * 100}px`]);
  const y = useSpring(rawY, { stiffness: 80, damping: 25 });

  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

interface Card3DProps {
  children: ReactNode;
  className?: string;
}

export function Card3D({ children, className }: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ transition: "transform 0.15s ease-out", transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

interface ScrollScaleProps {
  children: ReactNode;
  className?: string;
}

export function ScrollScale({ children, className }: ScrollScaleProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const smoothScale = useSpring(scale, { stiffness: 100, damping: 30 });

  return (
    <motion.div ref={ref} style={{ scale: smoothScale, opacity }} className={className}>
      {children}
    </motion.div>
  );
}
