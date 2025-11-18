import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
      "px-4 py-2 rounded-full bg-destructive text-destructive-foreground",
      "flex items-center gap-2 shadow-lg",
      "animate-fade-in"
    )}>
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">You're offline</span>
    </div>
  );
};
