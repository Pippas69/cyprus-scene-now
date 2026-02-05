// Shared timezone helpers for Lovable Cloud functions
// Goal: treat user-selected times as Cyprus local time (Europe/Nicosia)
// and persist as an exact UTC instant.

export type CyprusLocalDate = `${number}-${number}-${number}`; // YYYY-MM-DD
export type CyprusLocalTime = `${number}:${number}`; // HH:mm

const getParts = (date: Date, timeZone: string) => {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value;

  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
    second: Number(pick('second')),
  };
};

const toMinutes = (h: number, m: number) => h * 60 + m;

/**
 * Converts a local date+time in a specific IANA timeZone to a UTC ISO string.
 * This avoids environment-dependent parsing (Deno often runs in UTC).
 */
export const localToUtcISOString = (
  localDate: string,
  localTime: string,
  timeZone: string = 'Europe/Nicosia'
): string => {
  // Initial guess: treat desired local as if it's UTC.
  let guessMs = Date.parse(`${localDate}T${localTime}:00Z`);

  // Two passes are enough to converge for DST transitions.
  for (let i = 0; i < 2; i++) {
    const got = getParts(new Date(guessMs), timeZone);

    const [y, mo, d] = localDate.split('-').map(Number);
    const [hh, mm] = localTime.split(':').map(Number);

    // Difference in minutes between what we WANT (local) and what we GOT from the guess.
    const wantDayKey = y * 10000 + mo * 100 + d;
    const gotDayKey = got.year * 10000 + got.month * 100 + got.day;

    const wantTotal = toMinutes(hh, mm);
    const gotTotal = toMinutes(got.hour, got.minute);

    const dayDiff = wantDayKey - gotDayKey;
    const minuteDiff = dayDiff * 24 * 60 + (wantTotal - gotTotal);

    if (minuteDiff === 0) break;
    guessMs += minuteDiff * 60 * 1000;
  }

  return new Date(guessMs).toISOString();
};
