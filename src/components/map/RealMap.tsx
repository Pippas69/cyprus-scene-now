import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ReactDOM from 'react-dom/client';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { useMapBusinesses } from '@/hooks/useMapBusinesses';
import { BusinessMarker } from './BusinessMarker';
import { BusinessPopup } from './BusinessPopup';
import { MapSearch } from './MapSearch';
import { BusinessListSheet } from './BusinessListSheet';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { trackEngagement } from '@/lib/analyticsTracking';
import { Button } from '@/components/ui/button';
import { getDirectionsUrl } from '@/lib/mapUtils';

interface RealMapProps {
  city: string;
  neighborhood: string;
  selectedCategories: string[];
  focusBusinessId?: string | null;
}

// Dynamic ocean theme application - styles ALL road layers by matching keywords
const applyOceanMapTheme = (mapInstance: mapboxgl.Map) => {
  const style = mapInstance.getStyle();
  if (!style?.layers) return;

  // Convert CSS variable to proper HSL format for Mapbox (requires commas)
  const cssVarToHsl = (varName: string, fallback: string) => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (!raw) return fallback;
    // Ensure proper HSL format with commas: "207 72% 22%" -> "hsl(207, 72%, 22%)"
    const parts = raw.split(/\s+/);
    if (parts.length === 3) {
      return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }
    return `hsl(${raw})`;
  };

  const COLORS = {
    aegean: cssVarToHsl('--aegean', 'hsl(207, 72%, 22%)'),
    ocean: cssVarToHsl('--ocean', 'hsl(207, 72%, 35%)'),
    sand: cssVarToHsl('--sand-white', 'hsl(45, 60%, 95%)'),
    seafoam: cssVarToHsl('--seafoam', 'hsl(174, 62%, 56%)'),
    accent: cssVarToHsl('--accent', 'hsl(207, 40%, 40%)'),
  };

  const roadKeywords = ['road', 'street', 'highway', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'link', 'path', 'bridge', 'tunnel'];
  const majorRoadKeywords = ['motorway', 'trunk', 'primary', 'highway'];
  const secondaryRoadKeywords = ['secondary', 'tertiary'];

  style.layers.forEach((layer) => {
    const layerId = layer.id.toLowerCase();

    // Style road lines
    if (layer.type === 'line') {
      const isRoad = roadKeywords.some((kw) => layerId.includes(kw));
      if (isRoad) {
        try {
          const isMajor = majorRoadKeywords.some((kw) => layerId.includes(kw));
          const isSecondary = secondaryRoadKeywords.some((kw) => layerId.includes(kw));

          if (isMajor) {
            mapInstance.setPaintProperty(layer.id, 'line-color', COLORS.aegean);
            mapInstance.setPaintProperty(layer.id, 'line-opacity', 0.95);
          } else if (isSecondary) {
            mapInstance.setPaintProperty(layer.id, 'line-color', COLORS.ocean);
            mapInstance.setPaintProperty(layer.id, 'line-opacity', 0.9);
          } else {
            mapInstance.setPaintProperty(layer.id, 'line-color', COLORS.ocean);
            mapInstance.setPaintProperty(layer.id, 'line-opacity', 0.75);
          }
        } catch {
          // ignore unsupported layers
        }
      }
    }

    // Style water
    if (layer.type === 'fill' && (layerId.includes('water') || layerId.includes('ocean') || layerId.includes('sea'))) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', COLORS.aegean);
        mapInstance.setPaintProperty(layer.id, 'fill-opacity', 0.35);
      } catch {
        // ignore
      }
    }

    // Style land/background
    if (layer.type === 'fill' && (layerId.includes('land') || layerId.includes('background'))) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', COLORS.sand);
      } catch {
        // ignore
      }
    }

    // Style buildings
    if (layer.type === 'fill' && layerId.includes('building')) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', COLORS.accent);
        mapInstance.setPaintProperty(layer.id, 'fill-opacity', 0.08);
      } catch {
        // ignore
      }
    }

    // Style parks
    if (layer.type === 'fill' && (layerId.includes('park') || layerId.includes('green'))) {
      try {
        mapInstance.setPaintProperty(layer.id, 'fill-color', COLORS.seafoam);
        mapInstance.setPaintProperty(layer.id, 'fill-opacity', 0.18);
      } catch {
        // ignore
      }
    }

    // Style road labels for visibility - using proper HSL format for Mapbox
    if (layer.type === 'symbol' && layerId.includes('road') && layerId.includes('label')) {
      try {
        mapInstance.setPaintProperty(layer.id, 'text-color', COLORS.aegean);
        mapInstance.setPaintProperty(layer.id, 'text-halo-color', COLORS.sand);
        mapInstance.setPaintProperty(layer.id, 'text-halo-width', 1.5);
      } catch {
        // ignore
      }
    }
  });
};

// Minimum zoom levels for each plan to appear
const MIN_ZOOM_FOR_PLAN: Record<'free' | 'basic' | 'pro' | 'elite', number> = {
  free: 7,
  basic: 7,
  pro: 7,
  elite: 7,
};

const RealMap = ({ city, neighborhood, selectedCategories, focusBusinessId }: RealMapProps) => {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const directionsMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const viewedPinsRef = useRef<Set<string>>(new Set());
  const lastFocusedRef = useRef<string | null>(null);
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const { businesses, loading } = useMapBusinesses(selectedCategories, city || null);

  const MAPBOX_TOKEN = MAPBOX_CONFIG.publicToken;
  const isTokenMissing = !MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your-mapbox-token');

  const getCyprusFitPadding = () => {
    // On mobile/tablet we want a MORE zoomed-out first impression so the whole island is always visible.
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    if (w < 768) {
      return { top: 18, bottom: 18, left: 18, right: 18 };
    }
    if (w < 1024) {
      return { top: 18, bottom: 18, left: 18, right: 18 };
    }
    return { top: 20, bottom: 20, left: 10, right: 10 };
  };

  useEffect(() => {
    if (!mapContainer.current || map.current || isTokenMissing) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_CONFIG.mapStyle,
      // Center adjusted to show ALL of Cyprus (center of island)
      center: [33.4, 35.1] as [number, number],
      // Zoom level to show entire island from Paphos to Karpasia
      zoom: 7,
      pitch: 0,
      maxBounds: MAPBOX_CONFIG.maxBounds,
      minZoom: MAPBOX_CONFIG.minZoom,
    });
    
    // On load, fit bounds to show ALL of Cyprus with comfortable sea margins
    map.current.on('load', () => {
      map.current?.resize();
      // Use configured max bounds (slightly larger than the island) so mobile/tablet always sees the whole island.
      map.current?.fitBounds(
        MAPBOX_CONFIG.maxBounds,
        { padding: getCyprusFitPadding(), duration: 0 }
      );
    });
    
    map.current.on('style.load', () => {
      map.current?.setFog({
        color: MAPBOX_CONFIG.fog.color,
        'high-color': MAPBOX_CONFIG.fog.highColor,
        'horizon-blend': MAPBOX_CONFIG.fog.horizonBlend,
        'space-color': MAPBOX_CONFIG.fog.spaceColor,
        'star-intensity': MAPBOX_CONFIG.fog.starIntensity,
      });
      
      if (map.current) {
        applyOceanMapTheme(map.current);
      }
    });
    
    // Add navigation control with smaller buttons on mobile
    const navControl = new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false });
    map.current.addControl(navControl, 'bottom-right');
    
    // Apply smaller styling to zoom controls on mobile/tablet
    const applyZoomControlStyles = () => {
      const controls = mapContainer.current?.querySelectorAll('.mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out');
      if (controls) {
        const isMobile = window.innerWidth < 768;
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        controls.forEach((btn) => {
          const el = btn as HTMLElement;
          if (isMobile) {
            el.style.width = '26px';
            el.style.height = '26px';
          } else if (isTablet) {
            el.style.width = '28px';
            el.style.height = '28px';
          } else {
            el.style.width = '29px';
            el.style.height = '29px';
          }
        });
      }
    };
    
    // Apply on load and resize
    setTimeout(applyZoomControlStyles, 100);
    window.addEventListener('resize', applyZoomControlStyles);
    
    return () => { 
      window.removeEventListener('resize', applyZoomControlStyles);
      map.current?.remove(); 
    };
  }, [MAPBOX_TOKEN]);

  // Show directions icon below the business pin - icon only, responsive size
  const showDirectionsIcon = (business: any) => {
    if (!map.current) return;

    const getPlanColorVar = (planSlug: any): string => {
      switch (planSlug) {
        case 'elite':
          return '--plan-elite';
        case 'pro':
          return '--plan-pro';
        case 'basic':
          return '--plan-basic';
        default:
          return '--ocean';
      }
    };
    
    // Remove existing directions marker
    if (directionsMarkerRef.current) {
      directionsMarkerRef.current.remove();
      directionsMarkerRef.current = null;
    }

    const [lng, lat] = business.coordinates;
    const planVar = getPlanColorVar(business.planSlug);
    
    // Create directions pill element (must sit directly under the pin)
    const div = document.createElement('div');
    div.className = 'directions-marker';
    const root = ReactDOM.createRoot(div);
    root.render(
      <button
        type="button"
        className={
          "inline-flex items-center justify-center whitespace-nowrap rounded-full border bg-background/90 px-2 " +
          "text-[9px] font-medium leading-none backdrop-blur-sm transition-transform hover:scale-[1.02] " +
          // Hard height cap so it never gets tall
          "h-4"
        }
        style={{
          borderColor: `hsl(var(${planVar}))`,
          boxShadow: `0 10px 20px -16px hsl(var(${planVar}) / 0.65)`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Use business address for directions, fallback to coordinates
          window.open(getDirectionsUrl(business.address, lat, lng), "_blank", "noopener,noreferrer");
        }}
        aria-label={language === 'el' ? 'Οδηγίες' : 'Directions'}
      >
        {language === 'el' ? 'Οδηγίες' : 'Directions'}
      </button>
    );

    // Position the pill directly under the pin (centered, barely touching)
    directionsMarkerRef.current = new mapboxgl.Marker({ 
      element: div,
      anchor: 'top',
      offset: [0, 22]
    })
      .setLngLat([lng, lat])
      .addTo(map.current);
  };

  const openBusinessPopup = (business: any) => {
    if (!map.current) return;
    const [lng, lat] = business.coordinates;

    const handlePopupProfileClick = (b: any) => {
      // Close popup immediately to avoid overlays persisting over the routed page
      popupRef.current?.remove();
      if (directionsMarkerRef.current) {
        directionsMarkerRef.current.remove();
        directionsMarkerRef.current = null;
      }

      const src = new URLSearchParams(window.location.search).get('src');
      if (src !== 'dashboard_user') {
        trackEngagement(b.id, 'profile_click', 'business', b.id, { source: 'map_popup_photo' });
      }

      navigate(`/business/${b.id}`, {
        state: {
          analyticsTracked: true,
          analyticsSource: 'map',
          from: `${window.location.pathname}${window.location.search}`,
        },
      });
    };

    if (popupRef.current) popupRef.current.remove();
    const popupDiv = document.createElement('div');
    const popupRoot = ReactDOM.createRoot(popupDiv);
    popupRoot.render(
      <BusinessPopup
        business={business}
        onClose={() => {
          popupRef.current?.remove();
          if (directionsMarkerRef.current) {
            directionsMarkerRef.current.remove();
            directionsMarkerRef.current = null;
          }
        }}
        language={language}
        onProfileClick={handlePopupProfileClick}
      />
    );
    // Pin label must sit just above the pin - very close spacing
    // Offset popup down so the circular image covers the pin underneath
    const isMobileOrTablet = window.innerWidth < 1024;
    const popupOffset: [number, number] = isMobileOrTablet ? [0, 20] : [0, 12];
    
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: 'none',
      anchor: 'bottom',
      offset: popupOffset,
      className: 'fomo-pin-label',
    })
      .setLngLat([lng, lat])
      .setDOMContent(popupDiv)
      .addTo(map.current);

    // Ensure it never renders behind map controls/overlays.
    try {
      const el = popupRef.current.getElement();
      el.style.zIndex = '60';
      // Remove default tip spacing that can cause awkward gaps.
      el.style.pointerEvents = 'auto';

      // Absolute fallback: remove the tip node if Mapbox injects it (prevents the tiny white triangle)
      const tip = el.querySelector('.mapboxgl-popup-tip');
      if (tip && tip.parentElement) {
        tip.parentElement.removeChild(tip);
      }
    } catch {
      // ignore
    }
    // Directions badge lives as a separate marker so it can sit BELOW the pin
    showDirectionsIcon(business);
  };

  // Update markers when businesses change or map moves
  useEffect(() => {
    if (!map.current || !businesses.length) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const doInitialCamera = () => {
      if (!map.current) return;

      // If focusing on a specific business (from URL param), zoom to it
      if (focusBusinessId) {
        const target = businesses.find((b) => b.id === focusBusinessId);
        if (target && lastFocusedRef.current !== focusBusinessId) {
          lastFocusedRef.current = focusBusinessId;
          const [lng, lat] = target.coordinates;
          // Check source - offer_location clicks should NOT be tracked
          const src = new URLSearchParams(window.location.search).get('src');
          if (src !== 'offer_location' && src !== 'dashboard_user') {
            // URL navigation to specific business = profile INTERACTION (user clicked a link)
            trackEngagement(target.id, 'profile_click', 'business', target.id, { source: 'url_navigation' });
          }
          map.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800, essential: true });
          setTimeout(() => openBusinessPopup(target), 500);
          return;
        }
      }

      // DEFAULT: Always show ALL of Cyprus (don't auto-zoom to businesses)
      // Users choose when to zoom.
      map.current.fitBounds(
        MAPBOX_CONFIG.maxBounds,
        { padding: getCyprusFitPadding(), duration: 0 }
      );
    };

    doInitialCamera();

    const updateMarkers = () => {
      if (!map.current) return;
      const zoom = map.current.getZoom();

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const visibleBusinesses = businesses
        .filter((business) => {
          const minZoom = MIN_ZOOM_FOR_PLAN[business.planSlug];
          return zoom >= minZoom;
        })
        .sort((a, b) => b.planTierIndex - a.planTierIndex);

      visibleBusinesses.forEach((business) => {
        const [lng, lat] = business.coordinates;

        const div = document.createElement('div');
        const root = ReactDOM.createRoot(div);

        root.render(
          <BusinessMarker
            planSlug={business.planSlug}
            markerId={business.id}
            name={business.name}
            zoom={zoom}
            onClick={() => {
              // PROFILE VIEW = user clicks on pin to see business info
              // This counts as a VIEW because user is actively seeking to see the profile
              const src = new URLSearchParams(window.location.search).get('src');
              if (src !== 'dashboard_user') {
                trackEngagement(business.id, 'profile_view', 'business', business.id, { source: 'map_pin_click' });
              }

              map.current?.flyTo({
                center: [lng, lat],
                zoom: 15,
                duration: 800,
                essential: true,
              });

              setTimeout(() => {
                openBusinessPopup(business);
              }, 500);
            }}
          />
        );

        markersRef.current.push(new mapboxgl.Marker({ element: div }).setLngLat([lng, lat]).addTo(map.current!));
      });
    };
    
    map.current.on('moveend', updateMarkers);
    map.current.on('zoomend', updateMarkers);
    updateMarkers();
    
    return () => { 
      map.current?.off('moveend', updateMarkers); 
      map.current?.off('zoomend', updateMarkers); 
    };
  }, [businesses, language, focusBusinessId]);

  useEffect(() => {
    if (!map.current || !city) return;
    const coords: Record<string, [number, number]> = { 
      'Λευκωσία': [33.3823, 35.1856], 'Λεμεσός': [33.0333, 34.6667], 'Λάρνακα': [33.6333, 34.9167], 'Πάφος': [32.4250, 34.7667], 'Παραλίμνι': [35.0381, 33.9833], 'Αγία Νάπα': [33.9833, 34.0],
      'Nicosia': [33.3823, 35.1856], 'Limassol': [33.0333, 34.6667], 'Larnaca': [33.6333, 34.9167], 'Paphos': [32.4250, 34.7667], 'Paralimni': [35.0381, 33.9833], 'Ayia Napa': [33.9833, 34.0]
    };
    if (coords[city]) map.current.flyTo({ center: coords[city], zoom: neighborhood ? 13 : 11, duration: 1000 });
  }, [city, neighborhood]);

  const handleSearchResultClick = (coords: [number, number], businessId: string) => {
    if (!map.current) return;
    
    // Find the business
    const business = businesses.find(b => b.id === businessId);
    
    map.current.flyTo({ center: coords, zoom: 15, duration: 1000 });
    
    // Show popup after zoom
    if (business) {
      setTimeout(() => openBusinessPopup(business), 800);
    }
  };

  const handleBusinessListClick = (business: any) => {
    if (!map.current) return;
    const [lng, lat] = business.coordinates;
    // PROFILE INTERACTION = user clicks on "Profile" badge in business list
    // This is an INTERACTION because user is actively engaging (clicking) to navigate
    trackEngagement(business.id, 'profile_interaction', 'business', business.id, { source: 'map_list_badge' });
    map.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800, essential: true });
    setTimeout(() => openBusinessPopup(business), 500);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Trigger map resize after state change
    setTimeout(() => {
      map.current?.resize();
    }, 100);
  };

  if (isTokenMissing) {
    return (
      <div className="h-[50vh] md:h-[60vh] lg:h-[70vh] w-full flex items-center justify-center bg-muted/30 rounded-2xl">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Mapbox token not configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden shadow-xl ring-1 ring-aegean/20 transition-all duration-300 ${
      isExpanded ? 'h-[85vh] md:h-[90vh]' : 'h-full min-h-[50vh]'
    }`}>
      {/* Search bar - top left corner, compact */}
      <div className="absolute top-2 left-2 z-10">
        <MapSearch onResultClick={handleSearchResultClick} language={language} />
      </div>

      {/* Expand/Collapse button - top right corner */}
      <Button
        size="icon"
        variant="outline"
        className="absolute top-2 right-2 z-10 h-8 w-8 md:h-9 md:w-9 bg-background/95 backdrop-blur-sm shadow-lg"
        onClick={toggleExpand}
      >
        {isExpanded ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
      
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
      
      {/* Business count indicator - bottom left corner, compact & clickable */}
      {!loading && businesses.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10">
          <BusinessListSheet
            businesses={businesses}
            language={language}
            onBusinessClick={handleBusinessListClick}
          />
        </div>
      )}
    </div>
  );
};

export default RealMap;