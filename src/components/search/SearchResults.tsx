import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BusinessResultItem } from './BusinessResultItem';
import { EventResultItem } from './EventResultItem';

interface SearchResult {
  result_type: 'business' | 'event';
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
      <Card className="p-4 space-y-3 bg-background border shadow-lg">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-8 bg-background border shadow-lg text-center">
        <p className="text-muted-foreground">{noResultsText}</p>
      </Card>
    );
  }

  return (
    <Card className="p-2 bg-background border shadow-lg max-h-[500px] overflow-y-auto">
      <div className="space-y-1">
        {results.map((result) =>
          result.result_type === 'business' ? (
            <BusinessResultItem
              key={result.id}
              result={result}
              language={language}
              onClick={() => onResultClick(result)}
            />
          ) : (
            <EventResultItem
              key={result.id}
              result={result}
              language={language}
              onClick={() => onResultClick(result)}
            />
          )
        )}
      </div>
    </Card>
  );
}
