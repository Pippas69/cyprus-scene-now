import { Building2, MapPin } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getCategoryLabel } from '@/lib/categoryTranslations';
import { translateCity } from '@/lib/cityTranslations';

interface BusinessResult {
  id: string;
  name?: string;
  logo_url?: string;
  city?: string;
  category?: string[];
  verified?: boolean;
}

interface BusinessResultItemProps {
  result: BusinessResult;
  language: 'el' | 'en';
  onClick: () => void;
}

export function BusinessResultItem({ result, language, onClick }: BusinessResultItemProps) {
  // Format categories with translation
  const formattedCategories = result.category
    ?.slice(0, 2)
    .map(cat => getCategoryLabel(cat, language))
    .join(' & ') || '';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 md:gap-3 p-1.5 md:p-2 hover:bg-accent/50 rounded-lg transition-colors text-left"
    >
      {/* Compact circular avatar */}
      <Avatar className="h-8 w-8 md:h-10 md:w-10 shrink-0 border border-border/50">
        <AvatarImage src={result.logo_url || ''} alt={result.name} className="object-cover" />
        <AvatarFallback className="bg-muted">
          <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
      {/* Content - compact layout */}
      <div className="flex-1 min-w-0">
        {/* First line: Name + Location */}
        <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm">
          <span className="font-medium truncate text-foreground">{result.name}</span>
          {result.city && (
            <>
              <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">{translateCity(result.city, language)}</span>
            </>
          )}
        </div>
        
        {/* Second line: Categories */}
        {formattedCategories && (
          <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5">
            {formattedCategories}
          </p>
        )}
      </div>
    </button>
  );
}
