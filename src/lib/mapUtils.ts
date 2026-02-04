// Map utility functions

// Calculate distance between two coordinates in km
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if event is happening now (within 1 hour)
export const isEventHappeningNow = (startAt: string): boolean => {
  const now = new Date();
  const eventStart = new Date(startAt);
  const diffMs = eventStart.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours <= 1;
};

// Get category color
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    nightlife: "#9D4EDD",
    clubs: "#E040FB",
    dining: "#FF6B35",
    'beach-summer': "#4CC9F0",
    // Legacy mapping
    cafe: "#FF6B35",
    restaurant: "#FF6B35",
    art: "#F72585",
    fitness: "#06FFA5",
    family: "#4CC9F0",
    business: "#3A86FF",
    lifestyle: "#FFB703",
    travel: "#FB5607",
  };
  return colors[category] || "#6366f1";
};

// Format event time
export const formatEventTime = (startAt: string, endAt: string, language: "el" | "en" = "el"): string => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const today = new Date();
  
  const isToday = start.toDateString() === today.toDateString();
  
  const locale = language === "el" ? "el-GR" : "en-US";
  const todayText = language === "el" ? "Σήμερα" : "Today";
  
  const dateStr = isToday ? todayText : start.toLocaleDateString(locale, { 
    day: "numeric", 
    month: "short" 
  });
  
  const timeStr = `${start.toLocaleTimeString(locale, { 
    hour: "2-digit", 
    minute: "2-digit" 
  })} - ${end.toLocaleTimeString(locale, { 
    hour: "2-digit", 
    minute: "2-digit" 
  })}`;
  
  return `${dateStr} • ${timeStr}`;
};

// Get directions URL - use address if available, fallback to coordinates
export const getDirectionsUrl = (address: string | null, lat?: number, lng?: number): string => {
  // If address is available, use it for more accurate directions
  if (address && address.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
  }
  // Fallback to coordinates if no address
  if (lat !== undefined && lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  // Last resort: just open Google Maps
  return 'https://www.google.com/maps';
};

// Share event
export const shareEvent = async (eventId: string, title: string): Promise<boolean> => {
  const url = `${window.location.origin}/xartis?event=${eventId}`;
  
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return true;
    } catch (err) {
      // User cancelled or error
    }
  }
  
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    return false;
  }
};
