import { formatDistanceToNow } from 'date-fns';
import { LucideIcon } from 'lucide-react';

interface ActivityFeedItemProps {
  icon: LucideIcon;
  message: string;
  timestamp: string;
}

export const ActivityFeedItem = ({ icon: Icon, message, timestamp }: ActivityFeedItemProps) => {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};
