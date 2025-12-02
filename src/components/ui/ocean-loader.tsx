import { cn } from '@/lib/utils';

interface OceanLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OceanLoader({ size = 'md', className }: OceanLoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div 
      className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      {/* Animated waves */}
      <div className="absolute inset-0 animate-ocean-wave">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="25 75"
            className="origin-center"
          />
        </svg>
      </div>
      <div className="absolute inset-0 animate-ocean-wave-reverse">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <circle
            cx="20"
            cy="20"
            r="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="15 45"
            className="origin-center"
          />
        </svg>
      </div>
      {/* Center dot */}
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse-subtle" />
    </div>
  );
}

// Full page loader variant
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <OceanLoader size="lg" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

// Inline loader for buttons/cards
export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current animate-ocean-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
