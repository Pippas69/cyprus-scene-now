// Mapbox configuration
// This is a PUBLIC token and safe to commit to version control
// Get your token from: https://account.mapbox.com/access-tokens/

export const MAPBOX_CONFIG = {
  // Replace this with your actual Mapbox public token
  publicToken: 'PASTE_YOUR_MAPBOX_PUBLIC_TOKEN_HERE',
  
  // Default map settings for Cyprus
  defaultCenter: [33.4299, 35.1264] as [number, number],
  defaultZoom: 9,
  defaultPitch: 45,
  mapStyle: 'mapbox://styles/mapbox/streets-v12',
};
