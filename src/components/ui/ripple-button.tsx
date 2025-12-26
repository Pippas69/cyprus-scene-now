import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./button";

interface RippleProps {
  x: number;
  y: number;
  id: number;
}

interface RippleButtonProps extends ButtonProps {
  rippleColor?: string;
  rippleDuration?: number;
}

const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ className, children, rippleColor, rippleDuration = 600, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<RippleProps[]>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    
    // Check for reduced motion preference
    const prefersReducedMotion = React.useMemo(() => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }, []);

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (prefersReducedMotion) {
          onClick?.(event);
          return;
        }

        const button = buttonRef.current || (ref as React.RefObject<HTMLButtonElement>)?.current;
        if (!button) {
          onClick?.(event);
          return;
        }

        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
        }, rippleDuration);

        onClick?.(event);
      },
      [onClick, rippleDuration, prefersReducedMotion, ref]
    );

    const combinedRef = React.useCallback(
      (node: HTMLButtonElement) => {
        (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }
      },
      [ref]
    );

    return (
      <Button
        ref={combinedRef}
        className={cn("relative overflow-hidden", className)}
        onClick={handleClick}
        {...props}
      >
        {children}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: rippleDuration / 1000, ease: "easeOut" }}
              className={cn(
                "absolute rounded-full pointer-events-none",
                rippleColor || "bg-foreground/20"
              )}
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 100,
                height: 100,
                marginLeft: -50,
                marginTop: -50,
                willChange: "transform, opacity",
              }}
            />
          ))}
        </AnimatePresence>
      </Button>
    );
  }
);

RippleButton.displayName = "RippleButton";

export { RippleButton };
