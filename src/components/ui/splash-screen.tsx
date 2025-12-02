import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  minDisplayTime?: number;
  onComplete?: () => void;
}

export function SplashScreen({ minDisplayTime = 1800, onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const displayTime = prefersReducedMotion ? 500 : minDisplayTime;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, displayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-ocean"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.34, 1.56, 0.64, 1] // Spring-like
            }}
            className="relative"
          >
            <h1 className="text-6xl md:text-8xl font-cinzel font-bold text-sand-white tracking-wider">
              ΦΟΜΟ
            </h1>
            
            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center text-sand-white/80 text-sm mt-2 tracking-widest uppercase"
            >
              Cyprus Events
            </motion.p>
          </motion.div>

          {/* Wave Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute bottom-0 left-0 right-0 overflow-hidden h-32"
          >
            <div className="wave-container">
              <svg 
                viewBox="0 0 1200 120" 
                preserveAspectRatio="none"
                className="w-full h-full animate-wave-flow"
              >
                <path 
                  d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z" 
                  fill="hsl(174 62% 56% / 0.3)"
                />
              </svg>
            </div>
            <div className="wave-container absolute inset-0" style={{ animationDelay: '-0.5s' }}>
              <svg 
                viewBox="0 0 1200 120" 
                preserveAspectRatio="none"
                className="w-full h-full animate-wave-flow"
                style={{ animationDelay: '-2s' }}
              >
                <path 
                  d="M0,80 C200,40 400,100 600,80 C800,40 1000,100 1200,80 L1200,120 L0,120 Z" 
                  fill="hsl(174 62% 56% / 0.2)"
                />
              </svg>
            </div>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="absolute bottom-20 flex gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-sand-white/60"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
