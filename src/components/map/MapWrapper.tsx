import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import RealMap from './RealMap';

interface MapWrapperProps {
  city: string;
  neighborhood: string;
  selectedCategories: string[];
  eventCounts: Record<string, number>;
}

export default function MapWrapper({ city, neighborhood, selectedCategories, eventCounts }: MapWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl animate-pulse">
          <div className="text-center space-y-3">
            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Φόρτωση χάρτη...</p>
          </div>
        </div>
      }
    >
      <RealMap 
        city={city} 
        neighborhood={neighborhood} 
        selectedCategories={selectedCategories}
        eventCounts={eventCounts}
      />
    </Suspense>
  );
}
