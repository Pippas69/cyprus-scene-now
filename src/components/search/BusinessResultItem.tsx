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
      className="w-full flex items-center gap-2.5 md:gap-3 p-2 md:p-2.5 hover:bg-accent/50 rounded-lg transition-colors text-left"
    >
      {/* Circular avatar - slightly larger for better visibility */}
      <Avatar className="h-10 w-10 md:h-11 md:w-11 shrink-0 border border-border/50">
        <AvatarImage src={result.logo_url || ''} alt={result.name} className="object-cover" />
        <AvatarFallback className="bg-muted">
          <Building2 className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
      {/* Content - compact layout */}
      <div className="flex-1 min-w-0">
        {/* First line: Name + Location - always single line */}
        <div className="flex items-center gap-1 text-sm md:text-base min-w-0 whitespace-nowrap">
          <span className="font-medium truncate text-foreground">{result.name}</span>
          {result.city && (
            <span className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
              <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>{translateCity(result.city, language)}</span>
            </span>
          )}
        </div>
        
        {/* Second line: Categories */}
        {formattedCategories && (
          <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5 whitespace-nowrap">
            {formattedCategories}
          </p>
        )}
      </div>
    </button>
  );
}
