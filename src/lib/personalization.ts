interface UserProfile {
  city?: string;
  interests?: string[];
}

interface Event {
  id: string;
  category: string[];
  businesses?: {
    city?: string;
  };
  start_at: string;
}

interface UserRSVP {
  event_id: string;
  events?: {
    category: string[];
    start_at: string;
  };
}

interface UserFavorite {
  event_id: string;
  events?: {
    category: string[];
  };
}

export const getPersonalizedScore = (
  event: Event,
  userProfile: UserProfile | null,
  userRSVPs: UserRSVP[],
  userFavorites: UserFavorite[]
): number => {
  let score = 0;

  if (!userProfile) return score;

  // Score based on past RSVP categories (+20 points per match)
  const rsvpCategories = userRSVPs
    .flatMap((rsvp) => rsvp.events?.category || [])
    .filter(Boolean);
  
  event.category.forEach((cat) => {
    if (rsvpCategories.includes(cat)) {
      score += 20;
    }
  });

  // Score based on favorited event categories (+15 points per match)
  const favoriteCategories = userFavorites
    .flatMap((fav) => fav.events?.category || [])
    .filter(Boolean);
  
  event.category.forEach((cat) => {
    if (favoriteCategories.includes(cat)) {
      score += 15;
    }
  });

  // Score based on user's city (+30 points for same city)
  if (userProfile.city && event.businesses?.city === userProfile.city) {
    score += 30;
  }

  // Score based on user's interests (+25 points per match)
  if (userProfile.interests) {
    event.category.forEach((cat) => {
      if (userProfile.interests?.includes(cat)) {
        score += 25;
      }
    });
  }

  // Time of day preference based on past RSVPs
  const eventHour = new Date(event.start_at).getHours();
  const rsvpHours = userRSVPs
    .map((rsvp) => rsvp.events?.start_at ? new Date(rsvp.events.start_at).getHours() : null)
    .filter((h): h is number => h !== null);

  if (rsvpHours.length > 0) {
    const avgHour = rsvpHours.reduce((a, b) => a + b, 0) / rsvpHours.length;
    const hourDiff = Math.abs(eventHour - avgHour);
    
    // +10 points if within 2 hours of typical time
    if (hourDiff <= 2) {
      score += 10;
    }
  }

  return score;
};
