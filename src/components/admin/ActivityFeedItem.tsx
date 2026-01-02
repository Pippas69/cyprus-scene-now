import { formatDistanceToNow } from 'date-fns';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityFeedItemProps {
  icon: LucideIcon;
  message: string;
  timestamp: string;
  iconColor?: 'primary' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

const iconColorClasses = {
  primary: 'bg-primary/10 text-primary',
  green: 'bg-green-500/10 text-green-600',
  blue: 'bg-blue-500/10 text-blue-600',
  purple: 'bg-purple-500/10 text-purple-600',
  orange: 'bg-orange-500/10 text-orange-600',
  red: 'bg-red-500/10 text-red-600',
};

export const ActivityFeedItem = ({ 
  icon: Icon, 
  message, 
  timestamp,
  iconColor = 'primary',
  badge,
}: ActivityFeedItemProps) => {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColorClasses[iconColor]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2">{message}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
          </p>
          {badge && (
            <Badge variant={badge.variant} className="text-[10px] h-4 px-1.5">
              {badge.text}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
