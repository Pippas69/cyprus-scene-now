import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ReactDOM from 'react-dom/client';
import Supercluster from 'supercluster';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { useMapEvents, type EventLocation } from '@/hooks/useMapEvents';
import { isEventHappeningNow } from '@/lib/mapUtils';
import { CustomMarker } from './CustomMarker';
import { ClusterMarker } from './ClusterMarker';
import { EventPopup } from './EventPopup';
import { MapSearch } from './MapSearch';
import { MapControls } from './MapControls';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface RealMapProps {
  city: string;
  neighborhood: string;
  selectedCategories: string[];
  eventCounts: Record<string, number>;
  timeAccessFilters?: string[];
}

const RealMap = ({ city, neighborhood, selectedCategories, timeAccessFilters = [] }: RealMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const { language } = useLanguage();

  const { events, loading } = useMapEvents(selectedCategories, timeAccessFilters);

  const MAPBOX_TOKEN = MAPBOX_CONFIG.publicToken;

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your-mapbox-token')) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Mapbox token not configured</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_CONFIG.mapStyle,
      center: MAPBOX_CONFIG.defaultCenter,
      zoom: MAPBOX_CONFIG.defaultZoom,
      pitch: MAPBOX_CONFIG.defaultPitch,
      maxBounds: MAPBOX_CONFIG.maxBounds,
      minZoom: MAPBOX_CONFIG.minZoom,
    });
    
    // Apply Mediterranean styling on style load
    map.current.on('style.load', () => {
      // Apply fog/atmosphere
      map.current?.setFog({
        color: MAPBOX_CONFIG.fog.color,
        'high-color': MAPBOX_CONFIG.fog.highColor,
        'horizon-blend': MAPBOX_CONFIG.fog.horizonBlend,
        'space-color': MAPBOX_CONFIG.fog.spaceColor,
        'star-intensity': MAPBOX_CONFIG.fog.starIntensity,
      });
      
      // Apply ocean colors to map layers
      if (map.current) {
        // Water - Deep aegean blue
        map.current.setPaintProperty('water', 'fill-color', '#1a5f7a');
        
        // Land background - Sandy cream
        try {
          map.current.setPaintProperty('background', 'background-color', '#fef7ed');
        } catch (e) {
          // Background layer might not exist in all styles
        }
        
        // Major roads - Aegean deep blue (high visibility)
        try {
          map.current.setPaintProperty('road-primary', 'line-color', '#0D3B66');
          map.current.setPaintProperty('road-secondary-tertiary', 'line-color', '#3D6B99');
        } catch (e) {}
        
        // Minor roads - Softer ocean blues
        try {
          map.current.setPaintProperty('road-street', 'line-color', '#5A8F9E');
          map.current.setPaintProperty('road-minor', 'line-color', '#7BAAB8');
        } catch (e) {}
        
        // Buildings - Light aegean tint
        try {
          map.current.setPaintProperty('building', 'fill-color', '#e0f4f1');
        } catch (e) {}
        
        // Parks - Ocean-tinted green
        try {
          map.current.setPaintProperty('landuse-park', 'fill-color', '#88D8B0');
          map.current.setPaintProperty('park', 'fill-color', '#88D8B0');
        } catch (e) {}
      }
    });
    
    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left');
    map.current.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-left');
    return () => { map.current?.remove(); };
  }, [MAPBOX_TOKEN]);

  useEffect(() => {
    if (!map.current || !events.length) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const cluster = new Supercluster({ radius: MAPBOX_CONFIG.clusterRadius, maxZoom: MAPBOX_CONFIG.clusterMaxZoom });
    cluster.load(events.map(e => ({ type: 'Feature' as const, properties: { event: e }, geometry: { type: 'Point' as const, coordinates: e.coordinates } })));
    
    const updateMarkers = () => {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      const bounds = map.current.getBounds();
      const clusters = cluster.getClusters([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], Math.floor(zoom));
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      
      clusters.forEach(c => {
        const [lng, lat] = c.geometry.coordinates;
        const div = document.createElement('div');
        const root = ReactDOM.createRoot(div);
        
        if (c.properties.cluster) {
          root.render(<ClusterMarker count={c.properties.point_count} onClick={() => map.current?.easeTo({ center: [lng, lat], zoom: zoom + 2, duration: 500 })} />);
        } else {
          const event = c.properties.event as EventLocation;
          root.render(<CustomMarker category={event.category} isHappeningNow={isEventHappeningNow(event.start_at)} onClick={() => {
            if (popupRef.current) popupRef.current.remove();
            const popupDiv = document.createElement('div');
            const popupRoot = ReactDOM.createRoot(popupDiv);
            popupRoot.render(<EventPopup event={event} onClose={() => popupRef.current?.remove()} language={language} />);
            popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, maxWidth: 'none', offset: 25 }).setLngLat([lng, lat]).setDOMContent(popupDiv).addTo(map.current!);
          }} />);
        }
        markersRef.current.push(new mapboxgl.Marker({ element: div }).setLngLat([lng, lat]).addTo(map.current!));
      });
    };
    
    map.current.on('moveend', updateMarkers);
    map.current.on('zoomend', updateMarkers);
    updateMarkers();
    return () => { map.current?.off('moveend', updateMarkers); map.current?.off('zoomend', updateMarkers); };
  }, [events]);

  useEffect(() => {
    if (!map.current || !city) return;
    const coords: Record<string, [number, number]> = { 
      'Λευκωσία': [33.3823, 35.1856], 'Λεμεσός': [33.0333, 34.6667], 'Λάρνακα': [33.6333, 34.9167], 'Πάφος': [32.4250, 34.7667], 'Παραλίμνι': [35.0381, 33.9833], 'Αγία Νάπα': [34.9833, 34.0],
      'Nicosia': [33.3823, 35.1856], 'Limassol': [33.0333, 34.6667], 'Larnaca': [33.6333, 34.9167], 'Paphos': [32.4250, 34.7667], 'Paralimni': [35.0381, 33.9833], 'Ayia Napa': [34.9833, 34.0]
    };
    if (coords[city]) map.current.flyTo({ center: coords[city], zoom: neighborhood ? 13 : 11, duration: 1000 });
  }, [city, neighborhood]);

  const handleSearchResultClick = (coords: [number, number], id: string) => {
    map.current?.flyTo({ center: coords, zoom: 15, duration: 1000 });
  };

  return (
    <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden shadow-xl ring-1 ring-aegean/20">
      <div className="absolute top-4 left-4 z-10 w-80 max-w-[calc(100%-2rem)]">
        <MapSearch onResultClick={handleSearchResultClick} language={language} />
      </div>
      
      <MapControls 
        onResetView={() => map.current?.flyTo({ center: MAPBOX_CONFIG.defaultCenter, zoom: MAPBOX_CONFIG.defaultZoom, duration: 1000 })} 
        onToggleView={() => {}} 
        onLocate={() => navigator.geolocation?.getCurrentPosition(p => map.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 13, duration: 1000 }))} 
        isListView={false} 
      />
      
      {loading && (
        <div className="absolute inset-0 z-20 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background px-4 py-3 rounded-lg shadow-lg">
            <Loader2 className="animate-spin h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{language === 'el' ? 'Φόρτωση εκδηλώσεων...' : 'Loading events...'}</span>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Ocean gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-aegean/5 via-transparent to-seafoam/5 rounded-2xl" />
      
      {!loading && events.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-gradient-to-r from-aegean to-seafoam text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">
            {events.length} {language === 'el' ? (events.length === 1 ? 'εκδήλωση' : 'εκδηλώσεις') : (events.length === 1 ? 'event' : 'events')}
          </p>
        </div>
      )}
    </div>
  );
};

export default RealMap;
