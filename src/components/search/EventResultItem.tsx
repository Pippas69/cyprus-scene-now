import { Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
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

export function EventResultItem({ result, language, onClick }: EventResultItemProps) {
  const dateLocale = language === 'el' ? el : enUS;
  const dateText = result.start_at
    ? format(new Date(result.start_at), 'EEEE, d MMMM • HH:mm', { locale: dateLocale })
    : '';
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 md:gap-3 p-1.5 md:p-2 hover:bg-accent/50 rounded-lg transition-colors text-left"
    >
      {/* Compact circular avatar */}
      <Avatar className="h-8 w-8 md:h-10 md:w-10 shrink-0 border border-border/50">
        <AvatarImage src={result.cover_image_url || ''} alt={result.title} className="object-cover" />
        <AvatarFallback className="bg-primary/10">
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
        </AvatarFallback>
      </Avatar>
      
      {/* Content - compact layout */}
      <div className="flex-1 min-w-0">
        {/* First line: Title + Location */}
        <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm min-w-0 whitespace-nowrap">
          <span className="font-medium truncate text-foreground">{result.title}</span>
          {result.location && (
            <span className="flex items-center gap-0.5 shrink-0 min-w-0">
              <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{result.location}</span>
            </span>
          )}
        </div>

        {/* Second line: Day + Time (as in card) */}
        {dateText && (
          <div className="flex items-center gap-0.5 text-[9px] md:text-[10px] lg:text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
            <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
            <span className="truncate">{dateText}</span>
          </div>
        )}
      </div>
    </button>
  );
}
