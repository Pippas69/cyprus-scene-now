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
 * MANUAL ELITE SORT ORDER (temporary)
 * Maps business ID → display position for Elite tier.
 * Elite businesses not in this map go after the listed ones.
 */
export const ELITE_MANUAL_ORDER: Record<string, number> = {
  'f39d1fff-32bb-40d0-b00f-8194178bab97': 1,  // Kaliva on the Beach
  '3db13910-c0e0-443e-96fc-81d9bc9b94ad': 2,  // Blue Martini
  'eca5ab71-77af-498f-a06e-3be2b6903c44': 3,  // Σουαρέ
  '8924d110-fb6a-4ad5-8c20-ca5d74d75161': 4,  // Hot Spot
  '006dbb2a-cc39-4910-95a3-dddcc13013af': 5,  // Mythos Nights
  'e9aace3e-3b79-4700-8643-6be9084b59ee': 6,  // Amnesia
  'ffb0b280-5402-45e2-aad7-a3b6dd239e06': 7,  // Lost + Found
  '6c947179-9873-4008-bfd3-d77f0541fbe1': 8,  // Sugar Wave
  'bca2cb97-1723-4358-87b1-130d279e60a6': 9,  // Asmation Experience
  '3f45ba54-3e15-443c-8d29-152a1fcdebd1': 10, // Element X
  'df24815c-a8bb-46c8-bf7b-bbb10565f51c': 11, // 24seven
  'e8d549c0-0180-43e3-8e1f-ac86e9c62a82': 12, // Dirty Island
  '5aa0ec88-645a-40c0-9bd1-7beb1dd0ca19': 13, // PEAK
  '42e51a41-38bf-464b-9eae-f6cddaba36cf': 14, // Crosta Nostra
  '8cd6732f-1bc5-4ce9-94d4-cc21863c3377': 15, // La Fiesta
  'b846e46c-5318-4059-b390-94ef6a4783df': 16, // Mr. Mellow
  'af2abac6-c5de-4b48-8f2c-893e7dac68b5': 17, // Legacy
  '4c7e388f-343c-45ee-861b-390f4c058d28': 18, // Notes and Spirits
  'cacc28f8-918f-49ab-8b81-9fac86739981': 19, // Eterna
  'c1685cb9-9d7e-4353-af35-e9d479269d33': 19, // Test Account
};

/**
 * Sort businesses by STRICT plan hierarchy + manual Elite order
 * 
 * DISPLAY ORDER:
 * 1. ALL Elite businesses (sorted by MANUAL ORDER above)
 * 2. ALL Pro businesses (sorted by proximity within tier)
 * 3. ALL Basic businesses (sorted by proximity within tier)
 * 4. ALL Free businesses (sorted by proximity within tier)
 * 
 * NO ROTATION. NO RANDOMNESS. PLAN HIERARCHY NEVER BREAKS.
 */
export const sortBusinessesByPlanAndProximity = <T extends { id?: string; planTierIndex: number; city: string }>(
  businesses: T[],
  userCity: string | null | undefined
): T[] => {
  return [...businesses].sort((a, b) => {
    // PRIMARY: Plan tier (Elite=0, Pro=1, Basic=2, Free=3)
    if (a.planTierIndex !== b.planTierIndex) {
      return a.planTierIndex - b.planTierIndex;
    }
    
    // SECONDARY for Elite: Manual order
    if (a.planTierIndex === 0) {
      const aId = (a as any).id || '';
      const bId = (b as any).id || '';
      const orderA = ELITE_MANUAL_ORDER[aId] ?? 999;
      const orderB = ELITE_MANUAL_ORDER[bId] ?? 999;
      if (orderA !== orderB) return orderA - orderB;
    }
    
    // TERTIARY: Geographic proximity (within same plan tier)
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
    bg: 'hsl(200, 90%, 48%)',
    text: 'hsl(0, 0%, 100%)',
    border: 'hsl(200, 90%, 38%)',
  },
  pro: {
    // Purple/Violet - matches subscription UI  
    bg: 'hsl(280, 70%, 58%)',
    text: 'hsl(0, 0%, 100%)',
    border: 'hsl(280, 70%, 48%)',
  },
  elite: {
    // Gold - premium tier
    bg: 'hsl(45, 95%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    border: 'hsl(45, 95%, 45%)',
  },
};
