import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { locations } from '@/data/locations';
import { sampleEvents } from '@/components/map/EventMarker';
import { format } from 'date-fns';

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

      // Filter out specific POI types
      map.current.on('load', () => {
        if (!map.current) return;

        const classesToHide = [
          "church",
          "cemetery",
          "grave_yard",
          "bank",
          "school",
          "college",
          "kindergarten",
          "university",
          "store",
          "grocery",
          "supermarket",
          "gift_shop",
          "department_store",
          "police",
          "hospital"
        ];

        const poiLayers = ["poi-label", "poi-label-s", "poi-label-md", "poi-label-lg"];

        poiLayers.forEach(layerId => {
          if (map.current?.getLayer(layerId)) {
            map.current.setFilter(layerId,
              ["none",
                ...classesToHide.map(cls => ["==", ["get", "class"], cls])
              ]
            );
          }
        });
      });
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

  // Add event markers
  useEffect(() => {
    if (!map.current) return;

    const addMarkers = () => {
      if (!map.current) return;

      // Add markers for each event
      sampleEvents.forEach((event) => {
        if (!map.current) return;

        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.style.width = '32px';
        markerEl.style.height = '32px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = 'hsl(var(--primary))';
        markerEl.style.border = '3px solid white';
        markerEl.style.cursor = 'pointer';
        markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        markerEl.style.transition = 'transform 0.2s';
        
        markerEl.addEventListener('mouseenter', () => {
          markerEl.style.transform = 'scale(1.2)';
        });
        
        markerEl.addEventListener('mouseleave', () => {
          markerEl.style.transform = 'scale(1)';
        });

        // Format date and time
        const eventDate = new Date(event.start_at);
        const formattedDate = format(eventDate, 'MMM dd, yyyy');
        const formattedTime = format(eventDate, 'HH:mm');

        // Create popup content
        const popupContent = `
          <div class="event-popup" style="min-width: 280px;">
            ${event.cover_image_url ? `
              <img 
                src="${event.cover_image_url}" 
                alt="${event.title}"
                style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0; margin: -12px -12px 12px -12px;"
              />
            ` : ''}
            <h3 style="font-weight: 600; font-size: 16px; margin: 0 0 8px 0; color: hsl(var(--foreground));">
              ${event.title}
            </h3>
            <p style="font-size: 13px; color: hsl(var(--foreground) / 0.7); margin: 0 0 12px 0; line-height: 1.4;">
              ${event.description}
            </p>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: hsl(var(--foreground) / 0.6);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${formattedDate} at ${formattedTime}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${event.location}</span>
              </div>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                ${event.category.map(cat => `
                  <span style="background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                    ${cat}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px',
          className: 'event-popup-container'
        }).setHTML(popupContent);

        // Create and add marker
        new mapboxgl.Marker(markerEl)
          .setLngLat(event.coordinates)
          .setPopup(popup)
          .addTo(map.current);
      });
    };

    // Check if map is already loaded
    if (map.current.isStyleLoaded()) {
      addMarkers();
    } else {
      // Wait for map to load
      map.current.on('load', addMarkers);
    }

    return () => {
      // Cleanup: remove event listener
      map.current?.off('load', addMarkers);
    };
  }, []);

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
