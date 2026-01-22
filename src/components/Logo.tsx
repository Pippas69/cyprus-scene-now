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

export const Logo = ({ size = "md", className }: LogoProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-ocean font-cinzel font-black tracking-tight text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02]",
        sizeClasses[size],
        className
      )}
    >
      <span className="leading-none lg:translate-y-[9px]">ΦΟΜΟ</span>
    </div>
  );
};

export default Logo;
