export const PAUSED_SENTINEL_YEAR = 1970;

export type PauseAwareEvent = {
  appearance_start_at?: string | null;
  appearance_end_at?: string | null;
};

export function isEventPaused(event: PauseAwareEvent | null | undefined): boolean {
  if (!event?.appearance_start_at) return false;
  const year = new Date(event.appearance_start_at).getFullYear();
  return year === PAUSED_SENTINEL_YEAR;
}
