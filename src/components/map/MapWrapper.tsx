import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import RealMap from './RealMap';
import { useLanguage } from '@/hooks/useLanguage';

interface MapWrapperProps {
  city: string;
  neighborhood: string;
  selectedCategories: string[];
  focusBusinessId?: string | null;
}

export default function MapWrapper({ city, neighborhood, selectedCategories, focusBusinessId }: MapWrapperProps) {
  const { language } = useLanguage();
  
  const translations = {
    el: { loading: 'Φόρτωση χάρτη...' },
    en: { loading: 'Loading map...' }
  };
  
  const t = translations[language];
  
  return (
    <Suspense
      fallback={
        <div className="h-[50vh] md:h-[60vh] lg:h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl animate-pulse">
          <div className="text-center space-y-3">
            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      }
    >
      <RealMap 
        city={city} 
        neighborhood={neighborhood} 
        selectedCategories={selectedCategories}
        focusBusinessId={focusBusinessId}
      />
    </Suspense>
  );
}
