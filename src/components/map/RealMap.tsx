import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { locations } from '@/data/locations';

interface RealMapProps {
  city: string;
  neighborhood: string;
}

export default function RealMap({ city, neighborhood }: RealMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapContainer.current) return;

    // Check if token is configured
    if (!MAPBOX_CONFIG.publicToken || MAPBOX_CONFIG.publicToken === 'PASTE_YOUR_MAPBOX_PUBLIC_TOKEN_HERE') {
      setError('Please add your Mapbox token to src/config/mapbox.ts');
      return;
    }

    try {
      // Initialize map centered on Cyprus
      mapboxgl.accessToken = MAPBOX_CONFIG.publicToken;
    
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_CONFIG.mapStyle,
        center: MAPBOX_CONFIG.defaultCenter,
        zoom: MAPBOX_CONFIG.defaultZoom,
        pitch: MAPBOX_CONFIG.defaultPitch,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      );
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map. Please check your token.');
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [isClient]);

  // Auto-zoom to selected city/neighborhood
  useEffect(() => {
    if (!map.current || !city) return;

    const cityData = locations[city];
    if (!cityData) return;

    // If neighborhood is selected
    if (neighborhood && cityData.neighborhoods?.[neighborhood]) {
      map.current.flyTo({
        center: cityData.neighborhoods[neighborhood],
        zoom: 15,
        essential: true,
        duration: 1500
      });
      return;
    }

    // If only city selected
    map.current.flyTo({
      center: cityData.center,
      zoom: cityData.zoom,
      essential: true,
      duration: 1500
    });
  }, [city, neighborhood]);

  if (!isClient) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // Show error if token is not configured
  if (error) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl">
        <div className="text-center p-6 max-w-md">
          <p className="text-foreground/80 font-medium mb-2">Map Configuration Required</p>
          <p className="text-sm text-foreground/60 mb-4">{error}</p>
          <p className="text-xs text-foreground/40">
            Get your free token at: <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[70vh]">
      <div ref={mapContainer} className="absolute inset-0 rounded-2xl shadow-lg" />
    </div>
  );
}
