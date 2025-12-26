import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border text-card-foreground transition-all duration-300 ease-out will-change-transform",
  {
    variants: {
      variant: {
        default: [
          "bg-card shadow-sm",
          "hover:shadow-hover hover:scale-[1.02] hover:-translate-y-0.5",
          "active:scale-[0.98] active:translate-y-0",
        ],
        glass: [
          "bg-card/80 backdrop-blur-xl border-border/50",
          "shadow-lg shadow-background/10",
          "hover:bg-card/90 hover:shadow-xl hover:-translate-y-0.5",
          "active:scale-[0.99]",
        ],
        gradient: [
          "bg-card shadow-sm relative overflow-hidden",
          "before:absolute before:inset-0 before:rounded-lg before:p-[1px]",
          "before:bg-gradient-to-br before:from-primary/20 before:via-transparent before:to-accent/20",
          "before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
          "hover:shadow-hover hover:-translate-y-0.5",
          "active:scale-[0.98]",
        ],
        featured: [
          "bg-card shadow-glow border-primary/20",
          "hover:shadow-glow-lg hover:scale-[1.02] hover:-translate-y-1",
          "active:scale-[0.99]",
        ],
        flat: [
          "bg-card border-transparent shadow-none",
          "hover:bg-muted/50",
        ],
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  }
);

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  shine?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, shine, ...props }, ref) => {
    const prefersReducedMotion = React.useMemo(() => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, interactive }),
          shine && !prefersReducedMotion && "group",
          className
        )}
        {...props}
      >
        {shine && !prefersReducedMotion && (
          <div
            className="absolute inset-0 -z-10 overflow-hidden rounded-lg pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute -inset-[100%] animate-[gradient-shift_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        {props.children}
      </div>
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
