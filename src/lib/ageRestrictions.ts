export const DEFAULT_MIN_AGE = 16;

/**
 * Get minimum age for an event.
 * If the event has a custom minimum_age set, use that.
 * Otherwise fall back to the platform default (16).
 */
export const getMinAgeForEvent = (eventMinimumAge: number | null | undefined): number => {
  if (eventMinimumAge && eventMinimumAge >= DEFAULT_MIN_AGE) {
    return eventMinimumAge;
  }
  return DEFAULT_MIN_AGE;
};

// Legacy support - keep for backwards compatibility during transition
export const EVENT_MIN_AGE: Record<string, number> = {};

export const getMinAge = (eventId: string, eventMinimumAge?: number | null): number => {
  if (eventMinimumAge && eventMinimumAge >= DEFAULT_MIN_AGE) {
    return eventMinimumAge;
  }
  return DEFAULT_MIN_AGE;
};
