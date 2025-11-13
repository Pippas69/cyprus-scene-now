export interface EventLocation {
  id: string;
  title: string;
  description: string;
  start_at: string;
  location: string;
  category: string[];
  cover_image_url?: string;
  coordinates: [number, number];
}

export const sampleEvents: EventLocation[] = [
  {
    id: "1",
    title: "Jazz Night at Saripolou Square",
    description: "Live jazz performance featuring local and international artists",
    start_at: "2025-11-15T20:00:00",
    location: "Saripolou Square, Limassol",
    category: ["nightlife", "art"],
    cover_image_url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae",
    coordinates: [33.0444, 34.6767]
  },
  {
    id: "2",
    title: "Morning Yoga at Finikoudes",
    description: "Start your day with a refreshing yoga session by the beach",
    start_at: "2025-11-14T07:00:00",
    location: "Finikoudes Beach, Larnaca",
    category: ["fitness", "lifestyle"],
    cover_image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
    coordinates: [33.6380, 34.9191]
  },
  {
    id: "3",
    title: "Craft Beer Festival",
    description: "Sample the finest local and imported craft beers",
    start_at: "2025-11-16T18:00:00",
    location: "Germasogeia, Limassol",
    category: ["nightlife", "lifestyle"],
    cover_image_url: "https://images.unsplash.com/photo-1535958636474-b021ee887b13",
    coordinates: [33.0765, 34.7023]
  },
  {
    id: "4",
    title: "Street Food Market",
    description: "Discover delicious street food from around the world",
    start_at: "2025-11-15T12:00:00",
    location: "Makarios Avenue, Nicosia",
    category: ["cafe", "family"],
    cover_image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1",
    coordinates: [33.3650, 35.1689]
  },
  {
    id: "5",
    title: "Art Gallery Opening",
    description: "Contemporary art exhibition featuring Cypriot artists",
    start_at: "2025-11-17T19:00:00",
    location: "Old Town, Paphos",
    category: ["art", "lifestyle"],
    cover_image_url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b",
    coordinates: [32.4276, 34.7686]
  },
  {
    id: "6",
    title: "Startup Networking Event",
    description: "Connect with entrepreneurs and investors",
    start_at: "2025-11-18T18:30:00",
    location: "Strovolos Business Center, Nicosia",
    category: ["business"],
    cover_image_url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622",
    coordinates: [33.3489, 35.1432]
  },
  {
    id: "7",
    title: "Beach Volleyball Tournament",
    description: "Join us for a day of sun, sand and sports",
    start_at: "2025-11-19T10:00:00",
    location: "Mackenzie Beach, Larnaca",
    category: ["fitness", "family"],
    cover_image_url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1",
    coordinates: [33.6104, 34.8816]
  },
  {
    id: "8",
    title: "Wine Tasting Evening",
    description: "Explore Cyprus's finest wines with expert sommeliers",
    start_at: "2025-11-20T19:00:00",
    location: "Kato Paphos",
    category: ["cafe", "lifestyle"],
    cover_image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3",
    coordinates: [32.4108, 34.7570]
  }
];
