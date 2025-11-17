import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchResults } from './SearchResults';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';

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

interface GlobalSearchProps {
  language: 'el' | 'en';
  fullscreen?: boolean;
}

export function GlobalSearch({ language, fullscreen = false }: GlobalSearchProps) {
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
      searchPlaceholder: 'Αναζήτηση εκδηλώσεων, επιχειρήσεων...',
      searching: 'Αναζήτηση...',
      noResults: 'Δεν βρέθηκαν αποτελέσματα',
    },
    en: {
      searchPlaceholder: 'Search events, businesses...',
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

  useEffect(() => {
    const searchContent = async () => {
      if (query.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase.rpc('search_content', {
        search_query: query,
      });

      if (!error && data) {
        setResults(data as SearchResult[]);
      }

      setIsLoading(false);
    };

    const debounce = setTimeout(searchContent, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');

    if (result.result_type === 'business') {
      navigate(`/business/${result.id}`);
    } else {
      navigate(`/event/${result.id}`);
    }
  };

  if (fullscreen) {
    return (
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={t.searchPlaceholder}
            className="pl-10 pr-10 h-12 text-lg"
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
