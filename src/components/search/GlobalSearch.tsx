import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchResults } from './SearchResults';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  trackSearchResultView, 
  trackSearchResultClick,
  trackEventView,
  trackDiscountView 
} from '@/lib/analyticsTracking';

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

interface GlobalSearchProps {
  language: 'el' | 'en';
  fullscreen?: boolean;
  resultTypes?: Array<'business' | 'event' | 'offer'>;
}

export function GlobalSearch({ language, fullscreen = false, resultTypes }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const translations = {
    el: {
      searchPlaceholder: 'Αναζήτηση επιχειρήσεων, εκδηλώσεων, προσφορών...',
      searching: 'Αναζήτηση...',
      noResults: 'Δεν βρέθηκαν αποτελέσματα',
    },
    en: {
      searchPlaceholder: 'Search businesses, events, offers...',
      searching: 'Searching...',
      noResults: 'No results found',
    },
  };

  const t = translations[language];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track views for business results when they appear
  // NOTE: For businesses - appearing in search = profile_view
  // For events and offers - ONLY click counts as view (not appearance)
  const trackedViewsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const searchContent = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsLoading(false);
        // Reset tracked views when search is cleared
        trackedViewsRef.current.clear();
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase.rpc('search_content', {
        search_query: query,
      });

      if (!error && data) {
        const typed = data as SearchResult[];
        const filtered = resultTypes?.length
          ? typed.filter((r) => resultTypes.includes(r.result_type))
          : typed;
        setResults(filtered);
        
        // Track profile views ONLY for businesses appearing in search results
        // Events and offers are NOT tracked on appearance - only on click
        filtered.forEach((result) => {
          if (result.result_type === 'business' && !trackedViewsRef.current.has(result.id)) {
            trackedViewsRef.current.add(result.id);
            trackSearchResultView(result.id, 'general');
          }
        });
      }

      setIsLoading(false);
    };

    const debounce = setTimeout(searchContent, 300);
    return () => clearTimeout(debounce);
  }, [query, resultTypes]);

  const handleResultClick = useCallback((result: SearchResult) => {
    setIsOpen(false);
    setQuery('');

    if (result.result_type === 'business') {
      // Track interaction when clicking on business in general search
      trackSearchResultClick(result.id, 'general');
      // IMPORTANT: Prevent BusinessProfile from also tracking this as direct_navigation
      // by providing a navigation state marker (same pattern as feed cards).
      navigate(`/business/${result.id}`, {
        state: {
          analyticsTracked: true,
          analyticsSource: 'search',
          from: `${location.pathname}${location.search}`,
        },
      });
    } else if (result.result_type === 'event') {
      // Track event view ONLY when user clicks on the event (not on appearance)
      // This counts as a view for analytics, not an interaction
      trackEventView(result.id, 'search');
      navigate(`/event/${result.id}`, {
        state: {
          analyticsTracked: true,
          analyticsSource: 'search',
          from: `${location.pathname}${location.search}`,
        },
      });
    } else if (result.result_type === 'offer') {
      // Track offer/discount view ONLY when user clicks on the offer (not on appearance)
      // This counts as a view for analytics, not an interaction
      trackDiscountView(result.id, 'search');
      // Navigate to business profile with offer context
      // The business_id is included in search results for offers
      if (result.business_id) {
        navigate(`/business/${result.business_id}`, {
          state: {
            analyticsTracked: true,
            analyticsSource: 'search',
            highlightOfferId: result.id,
            from: `${location.pathname}${location.search}`,
          },
        });
      }
    }
  }, [navigate, location.pathname, location.search]);

  if (fullscreen) {
    return (
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-5 sm:w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={t.searchPlaceholder}
            className="pl-8 pr-8 h-9 sm:h-12 text-sm sm:text-lg"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isOpen && query.length >= 2 && (
          <SearchResults
            results={results}
            isLoading={isLoading}
            language={language}
            onResultClick={handleResultClick}
            noResultsText={t.noResults}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          placeholder={t.searchPlaceholder}
          className="pl-10 pr-4"
        />
      </div>
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full z-50">
          <SearchResults
            results={results}
            isLoading={isLoading}
            language={language}
            onResultClick={handleResultClick}
            noResultsText={t.noResults}
          />
        </div>
      )}
    </div>
  );
}
