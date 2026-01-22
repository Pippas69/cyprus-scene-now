import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 px-3 text-lg",
  md: "h-10 px-4 text-xl md:h-12 md:px-5 md:text-2xl",
  lg: "h-14 px-6 text-3xl",
};

const textOffsetClasses = {
  // Mobile is already visually correct.
  sm: "",
  // On tablet/desktop, Cinzel's metrics render a touch high; nudge down slightly.
  md: "translate-y-[2px]",
  lg: "translate-y-[3px]",
} as const;

export const Logo = ({ size = "md", className }: LogoProps) => {
  return (
    <div
      className={cn(
        "inline-grid place-items-center rounded-xl bg-gradient-ocean font-cinzel font-black tracking-tight text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02]",
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("leading-none", textOffsetClasses[size])}>ΦΟΜΟ</span>
    </div>
  );
};

export default Logo;
