import { Tag, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { translateCity } from '@/lib/cityTranslations';

interface OfferResult {
  id: string;
  title?: string;
  cover_image_url?: string;
  city?: string;
  start_at?: string; // Actually end_at for offers (expiry date)
  business_name?: string;
  category?: string[];
}

interface OfferResultItemProps {
  result: OfferResult;
  language: 'el' | 'en';
  onClick: () => void;
}

export function OfferResultItem({ result, language, onClick }: OfferResultItemProps) {
  const dateLocale = language === 'el' ? el : enUS;
  const expiryText = result.start_at
    ? format(new Date(result.start_at), 'd MMMM • HH:mm', { locale: dateLocale })
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
          <Tag className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
        </AvatarFallback>
      </Avatar>
      
      {/* Content - compact layout */}
      <div className="flex-1 min-w-0">
        {/* First line: Title + Location */}
        <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm min-w-0 whitespace-nowrap">
          <span className="font-medium truncate text-foreground">{result.title}</span>
          {result.city && (
            <span className="flex items-center gap-0.5 shrink-0 min-w-0">
              <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{translateCity(result.city, language)}</span>
            </span>
          )}
        </div>

        {/* Second line: Day + Time (expiry) */}
        <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] lg:text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
          {result.business_name && <span className="truncate">{result.business_name}</span>}
          {expiryText && (
            <span className="flex items-center gap-0.5 shrink-0">
              <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
              <span className="truncate">{expiryText}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
