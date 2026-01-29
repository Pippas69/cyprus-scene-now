import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BusinessResultItem } from './BusinessResultItem';
import { EventResultItem } from './EventResultItem';
import { OfferResultItem } from './OfferResultItem';

interface SearchResult {
  result_type: 'business' | 'event' | 'offer';
  id: string;
  name?: string;
  title?: string;
  logo_url?: string;
  cover_image_url?: string;
  city?: string;
  location?: string;
  start_at?: string;
  category?: string[];
  business_name?: string;
  verified?: boolean;
  relevance_score: number;
  business_id?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  language: 'el' | 'en';
  onResultClick: (result: SearchResult) => void;
  noResultsText: string;
}

export function SearchResults({
  results,
  isLoading,
  language,
  onResultClick,
  noResultsText,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <Card className="p-2 md:p-3 space-y-1 bg-background border shadow-lg">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 md:h-4 w-3/4" />
              <Skeleton className="h-2 md:h-3 w-1/2" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-4 md:p-6 bg-background border shadow-lg text-center">
        <p className="text-xs md:text-sm text-muted-foreground">{noResultsText}</p>
      </Card>
    );
  }

  return (
    <Card className="p-1 md:p-1.5 bg-background border shadow-lg max-h-[400px] md:max-h-[500px] overflow-y-auto">
      <div className="space-y-0.5">
        {results.map((result) => {
          if (result.result_type === 'business') {
            return (
              <BusinessResultItem
                key={`business-${result.id}`}
                result={result}
                language={language}
                onClick={() => onResultClick(result)}
              />
            );
          } else if (result.result_type === 'event') {
            return (
              <EventResultItem
                key={`event-${result.id}`}
                result={result}
                language={language}
                onClick={() => onResultClick(result)}
              />
            );
          } else if (result.result_type === 'offer') {
            return (
              <OfferResultItem
                key={`offer-${result.id}`}
                result={result}
                language={language}
                onClick={() => onResultClick(result)}
              />
            );
          }
          return null;
        })}
      </div>
    </Card>
  );
}
