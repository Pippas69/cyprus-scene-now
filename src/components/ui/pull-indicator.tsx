import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullIndicatorProps {
  progress: number;
  isRefreshing?: boolean;
}

export const PullIndicator = ({ progress, isRefreshing }: PullIndicatorProps) => {
  const rotation = Math.min(progress * 3.6, 360); // 0-100 maps to 0-360 degrees
  const opacity = Math.min(progress / 100, 1);

  return (
    <div 
      className="flex items-center justify-center py-4 transition-opacity duration-200"
      style={{ opacity }}
    >
      <div className="relative">
        <RefreshCw 
          className={cn(
            'h-6 w-6 text-primary transition-transform duration-200',
            isRefreshing && 'animate-spin'
          )}
          style={{ 
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)` 
          }}
        />
      </div>
    </div>
  );
};
