import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  actions?: FABAction[];
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  size?: "default" | "large";
  variant?: "primary" | "secondary" | "accent";
  pulse?: boolean;
  className?: string;
}

const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  (
    {
      icon,
      onClick,
      actions,
      position = "bottom-right",
      size = "default",
      variant = "primary",
      pulse = false,
      className,
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    
    const prefersReducedMotion = React.useMemo(() => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }, []);

    const positionClasses = {
      "bottom-right": "right-4 bottom-20 md:bottom-6",
      "bottom-left": "left-4 bottom-20 md:bottom-6",
      "bottom-center": "left-1/2 -translate-x-1/2 bottom-20 md:bottom-6",
    };

    const sizeClasses = {
      default: "h-14 w-14",
      large: "h-16 w-16",
    };

    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
      accent: "bg-accent text-accent-foreground hover:bg-accent/90",
    };

    const handleMainClick = () => {
      triggerHaptic("light");
      if (actions && actions.length > 0) {
        setIsExpanded(!isExpanded);
      } else {
        onClick?.();
      }
    };

    const handleActionClick = (action: FABAction) => {
      triggerHaptic("medium");
      action.onClick();
      setIsExpanded(false);
    };

    return (
      <div className={cn("fixed z-50", positionClasses[position], className)}>
        {/* Action menu */}
        <AnimatePresence>
          {isExpanded && actions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="absolute bottom-full mb-3 flex flex-col gap-2"
            >
              {actions.map((action, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.15,
                    delay: prefersReducedMotion ? 0 : index * 0.05,
                  }}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    "flex items-center gap-3 rounded-full bg-card px-4 py-2 shadow-lg",
                    "border border-border/50 hover:bg-muted transition-colors",
                    "text-sm font-medium text-foreground whitespace-nowrap"
                  )}
                >
                  <span className="h-5 w-5 flex items-center justify-center">
                    {action.icon}
                  </span>
                  {action.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          ref={ref}
          initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
          }}
          onClick={handleMainClick}
          className={cn(
            "rounded-full flex items-center justify-center",
            "transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            sizeClasses[size],
            variantClasses[variant],
            pulse && !prefersReducedMotion && "animate-pulse"
          )}
        >
          <motion.span
            animate={isExpanded ? { rotate: 45 } : { rotate: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="h-6 w-6 flex items-center justify-center"
          >
            {icon}
          </motion.span>
        </motion.button>

        {/* Backdrop when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="fixed inset-0 -z-10"
              onClick={() => setIsExpanded(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FloatingActionButton.displayName = "FloatingActionButton";

export { FloatingActionButton };
export type { FABAction };
