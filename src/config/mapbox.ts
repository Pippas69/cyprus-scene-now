// Mapbox configuration
// This is a PUBLIC token and safe to commit to version control
// Get your token from: https://account.mapbox.com/access-tokens/

export const MAPBOX_CONFIG = {
  // Replace this with your actual Mapbox public token
  publicToken: "pk.eyJ1IjoicGlwcGFzNjkiLCJhIjoiY21oeHRoYjV6MDBmeTJtczRuNm03dWRnNyJ9.ws_aDgURsUhQ2LcoQ3EEjw",

  // Default map settings for Cyprus - showing ENTIRE island (Paphos to Karpasia)
  defaultCenter: [33.4, 35.1] as [number, number],
  defaultZoom: 7,
  defaultPitch: 45,
  mapStyle: "mapbox://styles/mapbox/light-v11",
  
  // Mediterranean atmosphere/fog colors
  fog: {
    color: 'rgb(254, 250, 246)',           // Sand white for horizon
    highColor: 'rgb(78, 205, 196)',        // Seafoam teal for upper sky
    horizonBlend: 0.08,                    // Subtle blend
    spaceColor: 'rgb(13, 59, 102)',        // Aegean deep blue for space
    starIntensity: 0.15,                   // Subtle stars when tilted
  },
  
  // Cyprus bounding box - restricts map view to Cyprus only
  // Southwest [lng, lat] to Northeast [lng, lat]
  maxBounds: [
    [31.8, 34.3],  // Southwest (west of Paphos, south of coast)
    [34.9, 35.9]   // Northeast (east of Karpasia, north of coast)
  ] as [[number, number], [number, number]],
  
  // Minimum zoom level to prevent zooming out too far
  minZoom: 7,
  
  // Clustering configuration
  clusterRadius: 50,
  clusterMaxZoom: 13,
  minZoomForMarkers: 10,
};
