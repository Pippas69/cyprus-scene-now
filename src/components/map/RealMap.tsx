import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ReactDOM from 'react-dom/client';
import Supercluster from 'supercluster';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { useMapBusinesses, type BusinessLocation } from '@/hooks/useMapBusinesses';
import { BusinessMarker } from './BusinessMarker';
import { ClusterMarker } from './ClusterMarker';
import { BusinessPopup } from './BusinessPopup';
import { MapSearch } from './MapSearch';
import { MapControls } from './MapControls';
import { Loader2, Building2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface RealMapProps {
  city: string;
  neighborhood: string;
  selectedCategories: string[];
}

// Dynamic ocean theme application - styles ALL road layers by matching keywords
const applyOceanMapTheme = (mapInstance: mapboxgl.Map) => {
  const style = mapInstance.getStyle();
  if (!style?.layers) return;

  const roadKeywords = ['road', 'street', 'highway', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'link', 'path', 'bridge', 'tunnel'];
  const majorRoadKeywords = ['motorway', 'trunk', 'primary', 'highway'];
  const secondaryRoadKeywords = ['secondary', 'tertiary'];

  let styledCount = 0;

  style.layers.forEach((layer) => {
    const layerId = layer.id.toLowerCase();

    // Style road lines
    if (layer.type === 'line') {
      const isRoad = roadKeywords.some(kw => layerId.includes(kw));
      if (isRoad) {
        try {
          const isMajor = majorRoadKeywords.some(kw => layerId.includes(kw));
          const isSecondary = secondaryRoadKeywords.some(kw => layerId.includes(kw));

          if (isMajor) {
            mapInstance.setPaintProperty(layer.id, 'line-color', '#0D3B66');
            mapInstance.setPaintProperty(layer.id, 'line-opacity', 0.95);
          } else if (isSecondary) {
            mapInstance.setPaintProperty(layer.id, 'line-color', '#1F5A8A');
            mapInstance.setPaintProperty(layer.id, 'line-opacity', 0.9);
          } else {
            mapInstance.setPaintProperty(layer.id, 'line-color', '#3D6B99');
            mapInstance.setPaintProperty(layer.id, 'line-opacity', 0.85);
          }
          styledCount++;
        } catch (e) {
          // Some layers may not support these properties
        }
      }
    }

    // Style water
    if (layer.type === 'fill' && (layerId.includes('water') || layerId.includes('ocean') || layerId.includes('sea'))) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', '#1a5f7a');
      } catch (e) {}
    }

    // Style land/background
    if (layer.type === 'fill' && (layerId.includes('land') || layerId.includes('background'))) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', '#fef7ed');
      } catch (e) {}
    }

    // Style buildings
    if (layer.type === 'fill' && layerId.includes('building')) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', '#e0f4f1');
      } catch (e) {}
    }

    // Style parks
    if (layer.type === 'fill' && (layerId.includes('park') || layerId.includes('green'))) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', '#88D8B0');
      } catch (e) {}
    }

    // Style road labels for visibility
    if (layer.type === 'symbol' && layerId.includes('road') && layerId.includes('label')) {
      try {
        mapInstance.setPaintProperty(layer.id, 'text-color', '#0D3B66');
        mapInstance.setPaintProperty(layer.id, 'text-halo-color', '#FDF6E3');
        mapInstance.setPaintProperty(layer.id, 'text-halo-width', 1.5);
      } catch (e) {}
    }
  });

  console.log(`Ocean theme applied: ${styledCount} road layers styled`);
};

// Minimum zoom levels for each plan to appear
// Free businesses only visible at close zoom
const MIN_ZOOM_FOR_PLAN: Record<'free' | 'basic' | 'pro' | 'elite', number> = {
  free: 13,   // Only visible at close zoom
  basic: 11,  // Visible at medium zoom
  pro: 9,     // Visible early
  elite: 7,   // Always visible
};

const RealMap = ({ city, neighborhood, selectedCategories }: RealMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const { language } = useLanguage();

  // Use the new businesses hook instead of events
  const { businesses, loading } = useMapBusinesses(selectedCategories, city || null);

  const MAPBOX_TOKEN = MAPBOX_CONFIG.publicToken;
  const isTokenMissing = !MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your-mapbox-token');

  useEffect(() => {
    if (!mapContainer.current || map.current || isTokenMissing) return;
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
      
      // Apply ocean theme to all map layers dynamically
      if (map.current) {
        applyOceanMapTheme(map.current);
      }
    });
    
    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left');
    map.current.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-left');
    return () => { map.current?.remove(); };
  }, [MAPBOX_TOKEN]);

  useEffect(() => {
    if (!map.current || !businesses.length) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    // Cluster only for performance, not for visual hierarchy
    const cluster = new Supercluster({ 
      radius: MAPBOX_CONFIG.clusterRadius, 
      maxZoom: MAPBOX_CONFIG.clusterMaxZoom 
    });
    
    cluster.load(businesses.map(b => ({ 
      type: 'Feature' as const, 
      properties: { business: b }, 
      geometry: { type: 'Point' as const, coordinates: b.coordinates } 
    })));
    
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
          // For clusters, show cluster marker
          root.render(
            <ClusterMarker 
              count={c.properties.point_count} 
              onClick={() => map.current?.easeTo({ center: [lng, lat], zoom: zoom + 2, duration: 500 })} 
            />
          );
          markersRef.current.push(new mapboxgl.Marker({ element: div }).setLngLat([lng, lat]).addTo(map.current!));
        } else {
          // Individual business marker
          const business = c.properties.business as BusinessLocation;
          
          // Check if business should be visible at current zoom based on plan
          const minZoomForPlan = MIN_ZOOM_FOR_PLAN[business.planSlug];
          if (zoom < minZoomForPlan) {
            return; // Don't show this business at current zoom level
          }
          
          root.render(
            <BusinessMarker 
              planSlug={business.planSlug}
              name={business.name}
              onClick={() => {
                if (popupRef.current) popupRef.current.remove();
                const popupDiv = document.createElement('div');
                const popupRoot = ReactDOM.createRoot(popupDiv);
                popupRoot.render(
                  <BusinessPopup 
                    business={business} 
                    onClose={() => popupRef.current?.remove()} 
                    language={language} 
                  />
                );
                popupRef.current = new mapboxgl.Popup({ 
                  closeButton: false, 
                  closeOnClick: false, 
                  maxWidth: 'none', 
                  offset: 25 
                })
                  .setLngLat([lng, lat])
                  .setDOMContent(popupDiv)
                  .addTo(map.current!);
              }} 
            />
          );
          markersRef.current.push(new mapboxgl.Marker({ element: div }).setLngLat([lng, lat]).addTo(map.current!));
        }
      });
    };
    
    map.current.on('moveend', updateMarkers);
    map.current.on('zoomend', updateMarkers);
    updateMarkers();
    return () => { 
      map.current?.off('moveend', updateMarkers); 
      map.current?.off('zoomend', updateMarkers); 
    };
  }, [businesses, language]);

  useEffect(() => {
    if (!map.current || !city) return;
    const coords: Record<string, [number, number]> = { 
      'Λευκωσία': [33.3823, 35.1856], 'Λεμεσός': [33.0333, 34.6667], 'Λάρνακα': [33.6333, 34.9167], 'Πάφος': [32.4250, 34.7667], 'Παραλίμνι': [35.0381, 33.9833], 'Αγία Νάπα': [33.9833, 34.0],
      'Nicosia': [33.3823, 35.1856], 'Limassol': [33.0333, 34.6667], 'Larnaca': [33.6333, 34.9167], 'Paphos': [32.4250, 34.7667], 'Paralimni': [35.0381, 33.9833], 'Ayia Napa': [33.9833, 34.0]
    };
    if (coords[city]) map.current.flyTo({ center: coords[city], zoom: neighborhood ? 13 : 11, duration: 1000 });
  }, [city, neighborhood]);

  const handleSearchResultClick = (coords: [number, number], id: string) => {
    map.current?.flyTo({ center: coords, zoom: 15, duration: 1000 });
  };

  if (isTokenMissing) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Mapbox token not configured</p>
        </div>
      </div>
    );
  }

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
            <span className="text-sm font-medium">{language === 'el' ? 'Φόρτωση επιχειρήσεων...' : 'Loading businesses...'}</span>
          </div>
        </div>
      )}
      
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Ocean gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-aegean/5 via-transparent to-seafoam/5 rounded-2xl" />
      
      {/* Business count indicator */}
      {!loading && businesses.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-gradient-to-r from-aegean to-seafoam text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <Building2 size={16} />
            <p className="text-sm font-medium">
              {businesses.length} {language === 'el' ? (businesses.length === 1 ? 'επιχείρηση' : 'επιχειρήσεις') : (businesses.length === 1 ? 'business' : 'businesses')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealMap;
