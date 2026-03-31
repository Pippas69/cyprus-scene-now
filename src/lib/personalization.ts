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
  const ELITE_MANUAL_ORDER: Record<string, number> = {
    'f39d1fff-32bb-40d0-b00f-8194178bab97': 1,
    '3db13910-c0e0-443e-96fc-81d9bc9b94ad': 2,
    'eca5ab71-77af-498f-a06e-3be2b6903c44': 3,
    '8924d110-fb6a-4ad5-8c20-ca5d74d75161': 4,
    'e9aace3e-3b79-4700-8643-6be9084b59ee': 5,
    'ffb0b280-5402-45e2-aad7-a3b6dd239e06': 6,
    '6c947179-9873-4008-bfd3-d77f0541fbe1': 7,
    'bca2cb97-1723-4358-87b1-130d279e60a6': 8,
    '3f45ba54-3e15-443c-8d29-152a1fcdebd1': 9,
    'df24815c-a8bb-46c8-bf7b-bbb10565f51c': 10,
    'e8d549c0-0180-43e3-8e1f-ac86e9c62a82': 11,
    '5aa0ec88-645a-40c0-9bd1-7beb1dd0ca19': 12,
    '42e51a41-38bf-464b-9eae-f6cddaba36cf': 13,
    '8cd6732f-1bc5-4ce9-94d4-cc21863c3377': 14,
    'b846e46c-5318-4059-b390-94ef6a4783df': 15,
    'af2abac6-c5de-4b48-8f2c-893e7dac68b5': 16,
    '4c7e388f-343c-45ee-861b-390f4c058d28': 17,
    'cacc28f8-918f-49ab-8b81-9fac86739981': 18,
    'c1685cb9-9d7e-4353-af35-e9d479269d33': 19,
  };

  return [...businesses].sort((a, b) => {
    if (a.planTierIndex !== b.planTierIndex) {
      return a.planTierIndex - b.planTierIndex;
    }
    
    if (a.planTierIndex === 0) {
      const orderA = ELITE_MANUAL_ORDER[a.id] ?? 999;
      const orderB = ELITE_MANUAL_ORDER[b.id] ?? 999;
      if (orderA !== orderB) return orderA - orderB;
    }
    
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
