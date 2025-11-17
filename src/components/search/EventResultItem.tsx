import { Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface EventResult {
  id: string;
  title?: string;
  cover_image_url?: string;
  location?: string;
  start_at?: string;
  business_name?: string;
}

interface EventResultItemProps {
  result: EventResult;
  language: 'el' | 'en';
  onClick: () => void;
}

export function EventResultItem({ result, onClick }: EventResultItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 hover:bg-accent rounded-lg transition-colors text-left flex items-center gap-3"
    >
      <Avatar className="h-12 w-12 rounded-md border">
        <AvatarImage src={result.cover_image_url || ''} alt={result.title} />
        <AvatarFallback className="bg-primary/10 rounded-md">
          <Calendar className="h-5 w-5 text-primary" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate">{result.title}</h4>
        
        <div className="flex flex-col gap-1 mt-1">
          {result.business_name && (
            <span className="text-xs text-muted-foreground truncate">
              {result.business_name}
            </span>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {result.start_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(result.start_at), 'MMM d, HH:mm')}
              </span>
            )}
            {result.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {result.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
