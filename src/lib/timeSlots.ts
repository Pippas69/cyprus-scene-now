export const normalizeTime = (time: string | null | undefined): string => {
  if (!time) return "00:00";
  return time.substring(0, 5);
};

export const timeToMinutes = (time: string): number => {
  const t = normalizeTime(time);
  const h = parseInt(t.substring(0, 2), 10) || 0;
  const m = parseInt(t.substring(3, 5), 10) || 0;
  return h * 60 + m;
};

export const minutesToTime = (mins: number): string => {
  const m = ((mins % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
};

/**
 * Expands a [from,to) range into times every stepMinutes.
 * Handles midnight (e.g. 09:00 -> 00:00) and overnight ranges (e.g. 22:00 -> 04:00).
 */
export const expandTimeRange = (timeFrom: string, timeTo: string, stepMinutes = 30): string[] => {
  const start = timeToMinutes(timeFrom);
  let end = timeToMinutes(timeTo);

  // Treat "00:00" as end-of-day when start is not midnight, or handle overnight.
  if (end <= start) end += 1440;

  const out: string[] = [];
  for (let t = start; t < end; t += stepMinutes) {
    out.push(minutesToTime(t));
  }
  return out;
};

export type BusinessTimeSlot = {
  timeFrom: string;
  timeTo: string;
  days?: string[];
};

export const expandSlotsForDay = (
  slots: BusinessTimeSlot[] | null | undefined,
  dayName: string,
  stepMinutes = 30
): string[] => {
  if (!slots || slots.length === 0) return [];

  const all: string[] = [];
  for (const slot of slots) {
    if (slot.days?.length && !slot.days.includes(dayName)) continue;
    all.push(...expandTimeRange(slot.timeFrom, slot.timeTo, stepMinutes));
  }

  // De-dupe + sort by minutes
  const uniq = Array.from(new Set(all));
  uniq.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  return uniq;
};
