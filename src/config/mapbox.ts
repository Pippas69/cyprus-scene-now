// Mapbox configuration
// This is a PUBLIC token and safe to commit to version control
// Get your token from: https://account.mapbox.com/access-tokens/

export const MAPBOX_CONFIG = {
  // Replace this with your actual Mapbox public token
  publicToken: "pk.eyJ1IjoicGlwcGFzNjkiLCJhIjoiY21oeHRoYjV6MDBmeTJtczRuNm03dWRnNyJ9.ws_aDgURsUhQ2LcoQ3EEjw",

  // Default map settings for Cyprus
  defaultCenter: [33.4299, 35.1264] as [number, number],
  defaultZoom: 9,
  defaultPitch: 45,
  mapStyle: "mapbox://styles/mapbox/light-v11",
  
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
