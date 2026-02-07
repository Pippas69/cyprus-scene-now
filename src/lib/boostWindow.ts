export type BoostWindowInput = {
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  duration_mode?: string | null;
  duration_hours?: number | null;
};

export type BoostWindow = {
  start: string; // ISO
  end: string; // ISO
};

const hasTimeComponent = (value: string) => value.includes("T");

// If a timestamp string includes a time but no timezone, JS Date() interprets it as local time.
// Our boosts are stored/treated as UTC across analytics, so we normalize these strings to UTC.
const hasTimezone = (value: string) => /Z$|[+-]\d{2}:?\d{2}$/.test(value);
const normalizeToUtcIfNoTz = (value: string) => {
  if (!hasTimeComponent(value)) return value;
  if (hasTimezone(value)) return value;
  return `${value}Z`;
};

const startOfDayISO = (dateOnly: string) => new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
const endOfDayISO = (dateOnly: string) => new Date(`${dateOnly}T23:59:59.999Z`).toISOString();

const addHoursISO = (iso: string, hours: number) => {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
};

/**
 * Normalizes a boost record to an exact [start, end] timestamp window.
 *
 * Rules:
 * - daily boosts: start at 00:00 of start_date, end at 23:59:59.999 of end_date
 * - hourly boosts: start at created_at, end at created_at + duration_hours
 */
export const computeBoostWindow = (input: BoostWindowInput): BoostWindow | null => {
  const durationMode = input.duration_mode || "daily";

  // Hourly boosts start exactly when purchased/created.
  if (durationMode === "hourly" && input.created_at) {
    const start = new Date(normalizeToUtcIfNoTz(input.created_at)).toISOString();
    const end = input.duration_hours ? addHoursISO(start, input.duration_hours) : start;
    return { start, end };
  }

  // Daily (default)
  let start: string | null = null;
  if (input.start_date) {
    start = hasTimeComponent(input.start_date)
      ? new Date(normalizeToUtcIfNoTz(input.start_date)).toISOString()
      : startOfDayISO(input.start_date);
  } else if (input.created_at) {
    start = new Date(normalizeToUtcIfNoTz(input.created_at)).toISOString();
  }

  let end: string | null = null;
  if (input.end_date) {
    end = hasTimeComponent(input.end_date)
      ? new Date(normalizeToUtcIfNoTz(input.end_date)).toISOString()
      : endOfDayISO(input.end_date);
  } else if (input.created_at && input.duration_hours) {
    end = addHoursISO(
      new Date(normalizeToUtcIfNoTz(input.created_at)).toISOString(),
      input.duration_hours
    );
  } else if (input.created_at) {
    end = new Date(normalizeToUtcIfNoTz(input.created_at)).toISOString();
  }

  if (!start || !end) return null;
  if (new Date(start) > new Date(end)) return null;
  return { start, end };
};

export const isTimestampWithinWindow = (timestamp: string, window: BoostWindow) => {
  const t = new Date(timestamp);
  return t >= new Date(window.start) && t <= new Date(window.end);
};
