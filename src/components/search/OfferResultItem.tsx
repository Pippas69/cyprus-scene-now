import { Tag, MapPin, Building2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { translateCity } from '@/lib/cityTranslations';

interface OfferResult {
  id: string;
  title?: string;
  cover_image_url?: string;
  city?: string;
  business_name?: string;
}

interface OfferResultItemProps {
  result: OfferResult;
  language: 'el' | 'en';
  onClick: () => void;
}

export function OfferResultItem({ result, language, onClick }: OfferResultItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 md:gap-3 p-1.5 md:p-2 hover:bg-accent/50 rounded-lg transition-colors text-left"
    >
      {/* Compact circular avatar with offer image or fallback */}
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
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{translateCity(result.city, language)}</span>
            </span>
          )}
        </div>
        
        {/* Second line: Business name */}
        {result.business_name && (
          <div className="flex items-center gap-1 mt-0.5">
            <Building2 className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground" />
            <span className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground truncate whitespace-nowrap">
              {result.business_name}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
