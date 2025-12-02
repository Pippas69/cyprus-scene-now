import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessCheckmarkProps {
  isVisible: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SuccessCheckmark({ isVisible, size = 'md', className }: SuccessCheckmarkProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          className={cn(
            'flex items-center justify-center rounded-full bg-accent',
            sizeClasses[size],
            className
          )}
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Check 
              size={iconSizes[size]} 
              className="text-accent-foreground stroke-[3]" 
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CountUpProps {
  value: number;
  className?: string;
  duration?: number;
}

export function CountUp({ value, className, duration = 0.5 }: CountUpProps) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration, ease: 'easeOut' }}
      className={cn('inline-block', className)}
    >
      {value}
    </motion.span>
  );
}

interface HeartPopProps {
  isActive: boolean;
  className?: string;
}

export function HeartPop({ isActive, className }: HeartPopProps) {
  return (
    <motion.div
      animate={isActive ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className={className}
    />
  );
}
