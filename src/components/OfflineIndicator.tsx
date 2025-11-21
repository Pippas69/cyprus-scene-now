import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

export const OfflineIndicator = () => {
  const { isOffline } = useOfflineStatus();
  const { language } = useLanguage();

  const translations = {
    el: { offline: 'Είστε εκτός σύνδεσης' },
    en: { offline: "You're offline" }
  };

  const t = translations[language];

  if (!isOffline) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
      "px-4 py-2 rounded-full bg-destructive text-destructive-foreground",
      "flex items-center gap-2 shadow-lg",
      "animate-fade-in"
    )}>
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">{t.offline}</span>
    </div>
  );
};
