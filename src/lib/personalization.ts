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
    student_discount_percent?: number | null;
    student_discount_mode?: "once" | "unlimited" | string | null;
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
  // Boost tier scores (for paid event/offer boosts)
  TIER_PREMIUM: 50,      // Premium tier base score
  TIER_STANDARD: 25,     // Standard tier base score
  
  // Subscription plan scores (for business profile visibility)
  // Using large gaps to ensure plan hierarchy NEVER breaks
  PLAN_ELITE: 10000,     // Elite plan - Always first
  PLAN_PRO: 5000,        // Pro plan - Always after Elite
  PLAN_BASIC: 1000,      // Basic plan - Always after Pro
  PLAN_FREE: 0,          // Free plan - Always last
  
  // Personalization bonuses (used ONLY within same plan tier)
  SAME_CITY: 30,         // User in same city
  CATEGORY_MATCH: 25,    // Per category match with user interests
  RSVP_CATEGORY: 20,     // Category from past RSVPs
  FAVORITE_CATEGORY: 15, // Category from favorited events
  TIME_PREFERENCE: 10,   // Time of day preference match
};

const DISPLAY_CAPS = {
  PROFILES: 10,
  EVENTS: 8,
  OFFERS: 8,
};

// Plan slug type for subscription hierarchy
export type PlanSlug = 'free' | 'basic' | 'pro' | 'elite';

// Plan tier order (index = priority, lower = higher priority)
export const PLAN_TIER_ORDER: PlanSlug[] = ['elite', 'pro', 'basic', 'free'];

/**
 * Get the tier index for a plan (0 = Elite, 1 = Pro, 2 = Basic, 3 = Free)
 * Lower index = higher priority
 */
export const getPlanTierIndex = (plan: PlanSlug | string | null): number => {
  switch (plan) {
    case 'elite':
    case 'professional':
      return 0; // Elite - highest priority
    case 'pro':
    case 'growth':
      return 1; // Pro
    case 'basic':
    case 'starter':
      return 2; // Basic
    default:
      return 3; // Free - lowest priority
  }
};

/**
 * Get score based on subscription plan
 * Elite = First suggestion, Pro = High visibility, Basic = Normal visibility
 * NOTE: For strict hierarchy sorting, use getPlanTierIndex instead
 */
export const getPlanScore = (plan: PlanSlug | string | null): number => {
  switch (plan) {
    case 'elite':
    case 'professional':
      return SCORE.PLAN_ELITE;
    case 'pro':
    case 'growth':
      return SCORE.PLAN_PRO;
    case 'basic':
    case 'starter':
      return SCORE.PLAN_BASIC;
    default:
      return SCORE.PLAN_FREE;
  }
};

// City proximity map for Cyprus (distances in km)
export const CITY_DISTANCES: Record<string, Record<string, number>> = {
  "Λευκωσία": { "Λευκωσία": 0, "Λάρνακα": 50, "Λεμεσός": 85, "Πάφος": 150, "Αμμόχωστος": 70, "Παραλίμνι": 60, "Αγία Νάπα": 75 },
  "Λάρνακα": { "Λευκωσία": 50, "Λάρνακα": 0, "Λεμεσός": 70, "Πάφος": 130, "Αμμόχωστος": 45, "Παραλίμνι": 35, "Αγία Νάπα": 40 },
  "Λεμεσός": { "Λευκωσία": 85, "Λάρνακα": 70, "Λεμεσός": 0, "Πάφος": 70, "Αμμόχωστος": 110, "Παραλίμνι": 100, "Αγία Νάπα": 110 },
  "Πάφος": { "Λευκωσία": 150, "Λάρνακα": 130, "Λεμεσός": 70, "Πάφος": 0, "Αμμόχωστος": 180, "Παραλίμνι": 170, "Αγία Νάπα": 175 },
  "Αμμόχωστος": { "Λευκωσία": 70, "Λάρνακα": 45, "Λεμεσός": 110, "Πάφος": 180, "Αμμόχωστος": 0, "Παραλίμνι": 10, "Αγία Νάπα": 15 },
  "Παραλίμνι": { "Λευκωσία": 60, "Λάρνακα": 35, "Λεμεσός": 100, "Πάφος": 170, "Αμμόχωστος": 10, "Παραλίμνι": 0, "Αγία Νάπα": 10 },
  "Αγία Νάπα": { "Λευκωσία": 75, "Λάρνακα": 40, "Λεμεσός": 110, "Πάφος": 175, "Αμμόχωστος": 15, "Παραλίμνι": 10, "Αγία Νάπα": 0 },
  // English variants
  "Nicosia": { "Nicosia": 0, "Larnaca": 50, "Limassol": 85, "Paphos": 150, "Famagusta": 70, "Paralimni": 60, "Ayia Napa": 75, "Λευκωσία": 0, "Λάρνακα": 50, "Λεμεσός": 85, "Πάφος": 150, "Αμμόχωστος": 70, "Παραλίμνι": 60, "Αγία Νάπα": 75 },
  "Larnaca": { "Nicosia": 50, "Larnaca": 0, "Limassol": 70, "Paphos": 130, "Famagusta": 45, "Paralimni": 35, "Ayia Napa": 40, "Λευκωσία": 50, "Λάρνακα": 0, "Λεμεσός": 70, "Πάφος": 130, "Αμμόχωστος": 45, "Παραλίμνι": 35, "Αγία Νάπα": 40 },
  "Limassol": { "Nicosia": 85, "Larnaca": 70, "Limassol": 0, "Paphos": 70, "Famagusta": 110, "Paralimni": 100, "Ayia Napa": 110, "Λευκωσία": 85, "Λάρνακα": 70, "Λεμεσός": 0, "Πάφος": 70, "Αμμόχωστος": 110, "Παραλίμνι": 100, "Αγία Νάπα": 110 },
  "Paphos": { "Nicosia": 150, "Larnaca": 130, "Limassol": 70, "Paphos": 0, "Famagusta": 180, "Paralimni": 170, "Ayia Napa": 175, "Λευκωσία": 150, "Λάρνακα": 130, "Λεμεσός": 70, "Πάφος": 0, "Αμμόχωστος": 180, "Παραλίμνι": 170, "Αγία Νάπα": 175 },
};

/**
 * Get distance between two cities (in km)
 * Returns 1000 for unknown cities (max distance)
 */
export const getCityDistance = (cityA: string | null | undefined, cityB: string | null | undefined): number => {
  if (!cityA || !cityB) return 1000; // Unknown = max distance
  const normalizedA = cityA.trim();
  const normalizedB = cityB.trim();
  
  // Direct lookup
  if (CITY_DISTANCES[normalizedA]?.[normalizedB] !== undefined) {
    return CITY_DISTANCES[normalizedA][normalizedB];
  }
  
  // Same city = 0, different = 100
  return normalizedA === normalizedB ? 0 : 100;
};

/**
 * Sort businesses by strict plan hierarchy + geographic proximity
 * 1. First: ALL Elite businesses (sorted by proximity)
 * 2. Then: ALL Pro businesses (sorted by proximity)
 * 3. Then: ALL Basic businesses (sorted by proximity)
 * 4. Last: ALL Free businesses (sorted by proximity)
 * 
 * NO ROTATION. NO RANDOMNESS. Plan hierarchy NEVER breaks.
 */
export const sortBusinessesByPlanAndProximity = <T extends { id: string; city: string; planTierIndex: number }>(
  businesses: T[],
  userCity: string | null
): T[] => {
  return [...businesses].sort((a, b) => {
    // PRIMARY: Plan tier (Elite=0, Pro=1, Basic=2, Free=3)
    // Lower index = higher priority
    if (a.planTierIndex !== b.planTierIndex) {
      return a.planTierIndex - b.planTierIndex;
    }
    
    // SECONDARY: Geographic proximity (within same plan tier)
    const distanceA = getCityDistance(userCity, a.city);
    const distanceB = getCityDistance(userCity, b.city);
    return distanceA - distanceB;
  });
};

/**
 * @deprecated For business sorting, use sortBusinessesByPlanAndProximity instead.
 * This is kept for backwards compatibility with boost scoring.
 */
function getRotationFactor(rotationSeed: number, itemId: string): number {
  const itemSeed = itemId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ((rotationSeed + itemSeed) % 21); // 0-20 range
}

/**
 * @deprecated For business sorting, use sortBusinessesByPlanAndProximity instead.
 * This is kept for backwards compatibility with boost scoring.
 */
export function getRotationSeed(userId?: string | null): number {
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  const userSeed = userId 
    ? userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Math.floor(Math.random() * 1000);
  return (currentHour * 31 + userSeed) % 1000;
}

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
