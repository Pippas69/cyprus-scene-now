import { cn } from "@/lib/utils";

interface WaveUnderlineProps {
  className?: string;
  color?: "primary" | "accent" | "secondary" | "ocean";
}

export const WaveUnderline = ({ className, color = "ocean" }: WaveUnderlineProps) => {
  const colorClasses = {
    primary: "text-primary",
    accent: "text-accent",
    secondary: "text-secondary",
    ocean: "text-ocean",
  };

  return (
    <svg
      className={cn("w-full h-2", colorClasses[color], className)}
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
    >
      <path
        d="M0 4 Q 12.5 0, 25 4 T 50 4 T 75 4 T 100 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-wave"
      />
    </svg>
  );
};

interface DecorativeDotProps {
  className?: string;
}

export const DecorativeDots = ({ className }: DecorativeDotProps) => {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-accent/50"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  align?: "left" | "center";
}

export const SectionHeader = ({ 
  title, 
  subtitle, 
  className,
  align = "left" 
}: SectionHeaderProps) => {
  return (
    <div className={cn(
      "space-y-2 mb-6",
      align === "center" && "text-center",
      className
    )}>
      <div className={cn("inline-flex flex-col", align === "center" && "items-center")}>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          {title}
        </h2>
        <WaveUnderline className="w-16 mt-1" />
      </div>
      {subtitle && (
        <p className="text-muted-foreground text-sm">
          {subtitle}
        </p>
      )}
    </div>
  );
};
