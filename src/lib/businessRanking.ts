/**
 * BUSINESS RANKING SYSTEM - FOMO
 * 
 * STRICT HIERARCHY: Elite > Pro > Basic > Free
 * NO ROTATION. NO RANDOMNESS. PLAN HIERARCHY NEVER BREAKS.
 * 
 * This is the SINGLE SOURCE OF TRUTH for business ranking.
 * Used by: Feed, Map, Category sections, Search results
 */

export type PlanSlug = 'free' | 'basic' | 'pro' | 'elite';

/**
 * Plan tier index - LOWER = HIGHER PRIORITY
 * Elite = 0 (first), Pro = 1, Basic = 2, Free = 3 (last)
 */
export const getPlanTierIndex = (plan: PlanSlug | string | null | undefined): number => {
  if (!plan) return 3; // No plan = Free = lowest priority
  
  const normalized = plan.toLowerCase().trim();
  
  switch (normalized) {
    case 'elite':
    case 'professional':
    case 'premium':
      return 0; // Elite - HIGHEST priority (appears FIRST)
    case 'pro':
    case 'growth':
      return 1; // Pro - second priority
    case 'basic':
    case 'starter':
      return 2; // Basic - third priority
    default:
      return 3; // Free - LOWEST priority (appears LAST)
  }
};

/**
 * Map database subscription to standardized plan slug
 */
export const mapToPlanSlug = (planId: string | null, slug: string | null): PlanSlug => {
  if (!planId || !slug) return 'free';
  
  const normalized = slug.toLowerCase().trim();
  
  if (normalized.includes('elite') || normalized.includes('premium') || normalized.includes('professional')) {
    return 'elite';
  }
  if (normalized.includes('pro') || normalized.includes('growth')) {
    return 'pro';
  }
  if (normalized.includes('basic') || normalized.includes('starter')) {
    return 'basic';
  }
  return 'free';
};

/**
 * City proximity map for Cyprus (distances in km)
 */
export const CITY_DISTANCES: Record<string, Record<string, number>> = {
  // Greek city names
  "Λευκωσία": { "Λευκωσία": 0, "Λάρνακα": 50, "Λεμεσός": 85, "Πάφος": 150, "Αμμόχωστος": 70, "Παραλίμνι": 60, "Αγία Νάπα": 75, "Nicosia": 0, "Larnaca": 50, "Limassol": 85, "Paphos": 150, "Famagusta": 70, "Paralimni": 60, "Ayia Napa": 75 },
  "Λάρνακα": { "Λευκωσία": 50, "Λάρνακα": 0, "Λεμεσός": 70, "Πάφος": 130, "Αμμόχωστος": 45, "Παραλίμνι": 35, "Αγία Νάπα": 40, "Nicosia": 50, "Larnaca": 0, "Limassol": 70, "Paphos": 130, "Famagusta": 45, "Paralimni": 35, "Ayia Napa": 40 },
  "Λεμεσός": { "Λευκωσία": 85, "Λάρνακα": 70, "Λεμεσός": 0, "Πάφος": 70, "Αμμόχωστος": 110, "Παραλίμνι": 100, "Αγία Νάπα": 110, "Nicosia": 85, "Larnaca": 70, "Limassol": 0, "Paphos": 70, "Famagusta": 110, "Paralimni": 100, "Ayia Napa": 110 },
  "Πάφος": { "Λευκωσία": 150, "Λάρνακα": 130, "Λεμεσός": 70, "Πάφος": 0, "Αμμόχωστος": 180, "Παραλίμνι": 170, "Αγία Νάπα": 175, "Nicosia": 150, "Larnaca": 130, "Limassol": 70, "Paphos": 0, "Famagusta": 180, "Paralimni": 170, "Ayia Napa": 175 },
  "Αμμόχωστος": { "Λευκωσία": 70, "Λάρνακα": 45, "Λεμεσός": 110, "Πάφος": 180, "Αμμόχωστος": 0, "Παραλίμνι": 10, "Αγία Νάπα": 15, "Nicosia": 70, "Larnaca": 45, "Limassol": 110, "Paphos": 180, "Famagusta": 0, "Paralimni": 10, "Ayia Napa": 15 },
  "Παραλίμνι": { "Λευκωσία": 60, "Λάρνακα": 35, "Λεμεσός": 100, "Πάφος": 170, "Αμμόχωστος": 10, "Παραλίμνι": 0, "Αγία Νάπα": 10, "Nicosia": 60, "Larnaca": 35, "Limassol": 100, "Paphos": 170, "Famagusta": 10, "Paralimni": 0, "Ayia Napa": 10 },
  "Αγία Νάπα": { "Λευκωσία": 75, "Λάρνακα": 40, "Λεμεσός": 110, "Πάφος": 175, "Αμμόχωστος": 15, "Παραλίμνι": 10, "Αγία Νάπα": 0, "Nicosia": 75, "Larnaca": 40, "Limassol": 110, "Paphos": 175, "Famagusta": 15, "Paralimni": 10, "Ayia Napa": 0 },
  // English city names
  "Nicosia": { "Nicosia": 0, "Larnaca": 50, "Limassol": 85, "Paphos": 150, "Famagusta": 70, "Paralimni": 60, "Ayia Napa": 75, "Λευκωσία": 0, "Λάρνακα": 50, "Λεμεσός": 85, "Πάφος": 150, "Αμμόχωστος": 70, "Παραλίμνι": 60, "Αγία Νάπα": 75 },
  "Larnaca": { "Nicosia": 50, "Larnaca": 0, "Limassol": 70, "Paphos": 130, "Famagusta": 45, "Paralimni": 35, "Ayia Napa": 40, "Λευκωσία": 50, "Λάρνακα": 0, "Λεμεσός": 70, "Πάφος": 130, "Αμμόχωστος": 45, "Παραλίμνι": 35, "Αγία Νάπα": 40 },
  "Limassol": { "Nicosia": 85, "Larnaca": 70, "Limassol": 0, "Paphos": 70, "Famagusta": 110, "Paralimni": 100, "Ayia Napa": 110, "Λευκωσία": 85, "Λάρνακα": 70, "Λεμεσός": 0, "Πάφος": 70, "Αμμόχωστος": 110, "Παραλίμνι": 100, "Αγία Νάπα": 110 },
  "Paphos": { "Nicosia": 150, "Larnaca": 130, "Limassol": 70, "Paphos": 0, "Famagusta": 180, "Paralimni": 170, "Ayia Napa": 175, "Λευκωσία": 150, "Λάρνακα": 130, "Λεμεσός": 70, "Πάφος": 0, "Αμμόχωστος": 180, "Παραλίμνι": 170, "Αγία Νάπα": 175 },
  "Famagusta": { "Nicosia": 70, "Larnaca": 45, "Limassol": 110, "Paphos": 180, "Famagusta": 0, "Paralimni": 10, "Ayia Napa": 15, "Λευκωσία": 70, "Λάρνακα": 45, "Λεμεσός": 110, "Πάφος": 180, "Αμμόχωστος": 0, "Παραλίμνι": 10, "Αγία Νάπα": 15 },
  "Paralimni": { "Nicosia": 60, "Larnaca": 35, "Limassol": 100, "Paphos": 170, "Famagusta": 10, "Paralimni": 0, "Ayia Napa": 10, "Λευκωσία": 60, "Λάρνακα": 35, "Λεμεσός": 100, "Πάφος": 170, "Αμμόχωστος": 10, "Παραλίμνι": 0, "Αγία Νάπα": 10 },
  "Ayia Napa": { "Nicosia": 75, "Larnaca": 40, "Limassol": 110, "Paphos": 175, "Famagusta": 15, "Paralimni": 10, "Ayia Napa": 0, "Λευκωσία": 75, "Λάρνακα": 40, "Λεμεσός": 110, "Πάφος": 175, "Αμμόχωστος": 15, "Παραλίμνι": 10, "Αγία Νάπα": 0 },
};

/**
 * Get distance between two cities (in km)
 * Returns 1000 for unknown cities (max distance)
 */
export const getCityDistance = (cityA: string | null | undefined, cityB: string | null | undefined): number => {
  if (!cityA || !cityB) return 1000;
  const normalizedA = cityA.trim();
  const normalizedB = cityB.trim();
  
  if (CITY_DISTANCES[normalizedA]?.[normalizedB] !== undefined) {
    return CITY_DISTANCES[normalizedA][normalizedB];
  }
  
  // Same city = 0, different = 100
  return normalizedA.toLowerCase() === normalizedB.toLowerCase() ? 0 : 100;
};

/**
 * Sort businesses by STRICT plan hierarchy + geographic proximity
 * 
 * DISPLAY ORDER:
 * 1. ALL Elite businesses (sorted by proximity within tier)
 * 2. ALL Pro businesses (sorted by proximity within tier)
 * 3. ALL Basic businesses (sorted by proximity within tier)
 * 4. ALL Free businesses (sorted by proximity within tier)
 * 
 * NO ROTATION. NO RANDOMNESS. PLAN HIERARCHY NEVER BREAKS.
 */
export const sortBusinessesByPlanAndProximity = <T extends { planTierIndex: number; city: string }>(
  businesses: T[],
  userCity: string | null | undefined
): T[] => {
  return [...businesses].sort((a, b) => {
    // PRIMARY: Plan tier (Elite=0, Pro=1, Basic=2, Free=3)
    // LOWER index = HIGHER priority = appears FIRST
    if (a.planTierIndex !== b.planTierIndex) {
      return a.planTierIndex - b.planTierIndex;
    }
    
    // SECONDARY: Geographic proximity (within same plan tier)
    // LOWER distance = CLOSER = appears first within tier
    const distanceA = getCityDistance(userCity, a.city);
    const distanceB = getCityDistance(userCity, b.city);
    return distanceA - distanceB;
  });
};

/**
 * Plan display colors - MUST match SubscriptionPlans.tsx
 * These are used for map pins and badges
 */
export const PLAN_COLORS = {
  free: {
    bg: 'hsl(var(--muted))',
    text: 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))',
  },
  basic: {
    // Cyan/Blue - matches subscription UI
    bg: 'hsl(195, 100%, 50%)', // Cyan
    text: 'hsl(0, 0%, 100%)',
    border: 'hsl(195, 100%, 40%)',
  },
  pro: {
    // Coral/Orange - matches subscription UI  
    bg: 'hsl(0, 100%, 70%)', // Sunset Coral
    text: 'hsl(0, 0%, 100%)',
    border: 'hsl(0, 100%, 60%)',
  },
  elite: {
    // Purple/Gold - premium tier
    bg: 'hsl(270, 60%, 55%)', // Royal Purple
    text: 'hsl(0, 0%, 100%)',
    border: 'hsl(270, 60%, 45%)',
  },
};
