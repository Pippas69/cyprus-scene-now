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
  
  // Clustering configuration
  clusterRadius: 50,
  clusterMaxZoom: 13,
  minZoomForMarkers: 10,
};
