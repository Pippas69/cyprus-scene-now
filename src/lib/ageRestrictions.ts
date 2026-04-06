// Event-specific age restrictions (hardcoded per business request)
export const EVENT_MIN_AGE: Record<string, number> = {
  'ae2f9eaa-574b-400e-be37-b2cef98d4907': 21, // DSTRKT X SOUARE
};

export const DEFAULT_MIN_AGE = 16;

export const getMinAge = (eventId: string): number => {
  return EVENT_MIN_AGE[eventId] || DEFAULT_MIN_AGE;
};
