import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import RealMap from './RealMap';

interface MapWrapperProps {
  city: string;
  neighborhood: string;
  selectedCategories: string[];
}

export default function MapWrapper({ city, neighborhood, selectedCategories }: MapWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      }
    >
      <RealMap city={city} neighborhood={neighborhood} selectedCategories={selectedCategories} />
    </Suspense>
  );
}
