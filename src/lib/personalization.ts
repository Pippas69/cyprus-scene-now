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

export interface ActiveBoost {
  event_id: string;
  targeting_quality: number;
  boost_tier: string;
}

export interface OfferBoost {
  discount_id: string;
  targeting_quality: number;
  boost_tier?: string;
}

export interface ProfileBoostData {
  id: string;
  business_id: string;
  boost_tier: string;
  targeting_quality: number | null;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string;
    category: string[];
    verified: boolean | null;
  };
}

interface Offer {
  id: string;
  business_id: string;
  businesses?: {
    city?: string;
    category?: string[];
  };
}

// Constants for scoring
const SCORE = {
  TIER_PREMIUM: 50,      // Premium tier base score
  TIER_STANDARD: 25,     // Standard tier base score
  SAME_CITY: 30,         // User in same city
  CATEGORY_MATCH: 25,    // Per category match with user interests
  RSVP_CATEGORY: 20,     // Category from past RSVPs
  FAVORITE_CATEGORY: 15, // Category from favorited events
  TIME_PREFERENCE: 10,   // Time of day preference match
  ROTATION_MAX: 20,      // Max random rotation points
};

const DISPLAY_CAPS = {
  PROFILES: 10,
  EVENTS: 8,
  OFFERS: 8,
};

/**
 * Generate a rotation seed that changes hourly and varies by user
 * This ensures fair distribution - different users see different orderings
 * Same user sees consistent order within the hour for good UX
 */
export const getRotationSeed = (userId?: string | null): number => {
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  const userSeed = userId 
    ? userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Math.floor(Math.random() * 1000);
  
  // Simple hash combination
  return (currentHour * 31 + userSeed) % 1000;
};

/**
 * Get a random rotation factor (0 to ROTATION_MAX) based on seed and item index
 */
const getRotationFactor = (rotationSeed: number, itemId: string): number => {
  const itemSeed = itemId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ((rotationSeed + itemSeed) % (SCORE.ROTATION_MAX + 1));
};

/**
 * Get tier base score from targeting_quality or boost_tier
 */
const getTierScore = (targetingQuality: number | null, boostTier?: string): number => {
  // If targeting_quality is available, use it (5 = premium, 4 = standard)
  if (targetingQuality !== null) {
    return targetingQuality >= 5 ? SCORE.TIER_PREMIUM : SCORE.TIER_STANDARD;
  }
  // Fallback to boost_tier string
  return boostTier === 'premium' ? SCORE.TIER_PREMIUM : SCORE.TIER_STANDARD;
};

/**
 * Calculate personalized score for an offer
 */
export const getOfferBoostScore = (
  offer: Offer,
  userProfile: UserProfile | null,
  offerBoosts: OfferBoost[],
  rotationSeed: number
): number => {
  let score = 0;
  
  // Find boost for this offer
  const boost = offerBoosts.find(b => b.discount_id === offer.id);
  if (boost) {
    // Add tier base score
    score += getTierScore(boost.targeting_quality, boost.boost_tier);
  }
  
  // Add rotation factor for fair distribution
  score += getRotationFactor(rotationSeed, offer.id);
  
  // Personalization only if user profile exists
  if (userProfile) {
    // Same city bonus
    if (userProfile.city && offer.businesses?.city === userProfile.city) {
      score += SCORE.SAME_CITY;
    }
    
    // Category match bonus
    if (userProfile.interests && offer.businesses?.category) {
      offer.businesses.category.forEach(cat => {
        if (userProfile.interests?.includes(cat)) {
          score += SCORE.CATEGORY_MATCH;
        }
      });
    }
  }
  
  return score;
};

/**
 * Calculate personalized score for a profile boost
 */
export const getProfileBoostScore = (
  profile: ProfileBoostData,
  userProfile: UserProfile | null,
  rotationSeed: number
): number => {
  let score = 0;
  
  // Add tier base score
  score += getTierScore(profile.targeting_quality, profile.boost_tier);
  
  // Add rotation factor for fair distribution
  score += getRotationFactor(rotationSeed, profile.id);
  
  // Personalization only if user profile exists
  if (userProfile) {
    // Same city bonus
    if (userProfile.city && profile.businesses.city === userProfile.city) {
      score += SCORE.SAME_CITY;
    }
    
    // Category match bonus
    if (userProfile.interests && profile.businesses.category) {
      profile.businesses.category.forEach(cat => {
        if (userProfile.interests?.includes(cat)) {
          score += SCORE.CATEGORY_MATCH;
        }
      });
    }
  }
  
  return score;
};

/**
 * Enhanced personalized score for events with boost support
 * Now includes rotation factor for fair distribution among boosted events
 */
export const getPersonalizedScore = (
  event: Event,
  userProfile: UserProfile | null,
  userRSVPs: UserRSVP[],
  userFavorites: UserFavorite[],
  activeBoosts?: ActiveBoost[],
  rotationSeed?: number
): number => {
  let score = 0;

  // Apply boost bonus first (affects all users, not just those with profiles)
  if (activeBoosts) {
    const boost = activeBoosts.find(b => b.event_id === event.id);
    if (boost) {
      // Add tier-based score instead of simple multiplication
      score += getTierScore(boost.targeting_quality, boost.boost_tier);
      
      // Add rotation factor for fair distribution among boosted events
      if (rotationSeed !== undefined) {
        score += getRotationFactor(rotationSeed, event.id);
      }
    }
  }

  if (!userProfile) return score;

  // Score based on past RSVP categories (+20 points per match)
  const rsvpCategories = userRSVPs
    .flatMap((rsvp) => rsvp.events?.category || [])
    .filter(Boolean);
  
  event.category.forEach((cat) => {
    if (rsvpCategories.includes(cat)) {
      score += SCORE.RSVP_CATEGORY;
    }
  });

  // Score based on favorited event categories (+15 points per match)
  const favoriteCategories = userFavorites
    .flatMap((fav) => fav.events?.category || [])
    .filter(Boolean);
  
  event.category.forEach((cat) => {
    if (favoriteCategories.includes(cat)) {
      score += SCORE.FAVORITE_CATEGORY;
    }
  });

  // Score based on user's city (+30 points for same city)
  if (userProfile.city && event.businesses?.city === userProfile.city) {
    score += SCORE.SAME_CITY;
  }

  // Score based on user's interests (+25 points per match)
  if (userProfile.interests) {
    event.category.forEach((cat) => {
      if (userProfile.interests?.includes(cat)) {
        score += SCORE.CATEGORY_MATCH;
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
      score += SCORE.TIME_PREFERENCE;
    }
  }

  return score;
};

/**
 * Sort and cap offers with boost personalization
 */
export const getPersonalizedOffers = <T extends Offer>(
  offers: T[],
  userProfile: UserProfile | null,
  offerBoosts: OfferBoost[],
  rotationSeed: number,
  displayCap: number = DISPLAY_CAPS.OFFERS
): (T & { boostScore: number })[] => {
  return offers
    .map(offer => ({
      ...offer,
      boostScore: getOfferBoostScore(offer, userProfile, offerBoosts, rotationSeed)
    }))
    .sort((a, b) => b.boostScore - a.boostScore)
    .slice(0, displayCap);
};

/**
 * Sort and cap profile boosts with personalization
 */
export const getPersonalizedProfileBoosts = (
  profiles: ProfileBoostData[],
  userProfile: UserProfile | null,
  rotationSeed: number,
  displayCap: number = DISPLAY_CAPS.PROFILES
): (ProfileBoostData & { boostScore: number })[] => {
  return profiles
    .map(profile => ({
      ...profile,
      boostScore: getProfileBoostScore(profile, userProfile, rotationSeed)
    }))
    .sort((a, b) => b.boostScore - a.boostScore)
    .slice(0, displayCap);
};

// Export display caps for use in components
export { DISPLAY_CAPS };
