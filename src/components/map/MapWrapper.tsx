import RealMap from './RealMap';

interface MapWrapperProps {
  city: string;
  neighborhood: string;
  selectedCategories: string[];
  focusBusinessId?: string | null;
}

export default function MapWrapper({ city, neighborhood, selectedCategories, focusBusinessId }: MapWrapperProps) {
  return (
    <RealMap
      city={city}
      neighborhood={neighborhood}
      selectedCategories={selectedCategories}
      focusBusinessId={focusBusinessId}
    />
  );
}
