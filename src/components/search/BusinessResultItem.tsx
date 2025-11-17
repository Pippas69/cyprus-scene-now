import { Building2, MapPin, CheckCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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

export function BusinessResultItem({ result, onClick }: BusinessResultItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 hover:bg-accent rounded-lg transition-colors text-left flex items-center gap-3"
    >
      <Avatar className="h-12 w-12 border">
        <AvatarImage src={result.logo_url || ''} alt={result.name} />
        <AvatarFallback className="bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm truncate">{result.name}</h4>
          {result.verified && (
            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          {result.city && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {result.city}
            </span>
          )}
          {result.category && result.category.length > 0 && (
            <div className="flex gap-1">
              {result.category.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
