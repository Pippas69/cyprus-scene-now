import { formatDistanceToNow } from 'date-fns';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityFeedItemProps {
  icon: LucideIcon;
  message: string;
  timestamp: string;
  iconColor?: 'primary' | 'aegean' | 'seafoam' | 'ocean' | 'softAegean' | 'teal';
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

const iconColorClasses = {
  primary: 'bg-primary/10 text-primary',
  aegean: 'bg-[#0D3B66]/10 text-[#0D3B66] dark:text-[#7BAAB8]',
  seafoam: 'bg-[#4ECDC4]/10 text-[#4ECDC4]',
  ocean: 'bg-[#3D6B99]/10 text-[#3D6B99] dark:text-[#5BA3B5]',
  softAegean: 'bg-[#7BAAB8]/10 text-[#7BAAB8]',
  teal: 'bg-[#1a5f7a]/10 text-[#1a5f7a] dark:text-[#4ECDC4]',
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
