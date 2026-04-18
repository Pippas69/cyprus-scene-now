/**
 * Canonical display order for seating types across the entire app.
 * Order: Bar → Table → Sofa → VIP. Custom/unknown types go last.
 */
export const SEATING_TYPE_ORDER = ["bar", "table", "sofa", "vip"] as const;

const normalize = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const s = String(raw).toLowerCase().trim();
  // Greek → canonical key
  if (s.includes("μπαρ") || s === "bar") return "bar";
  if (s.includes("τραπέζ") || s.includes("τραπεζ") || s === "table") return "table";
  if (s.includes("καναπ") || s === "sofa" || s === "couch") return "sofa";
  if (s.includes("vip") || s.includes("βιπ")) return "vip";
  return s;
};

export const getSeatingTypeRank = (raw: string | null | undefined): number => {
  const key = normalize(raw);
  const idx = (SEATING_TYPE_ORDER as readonly string[]).indexOf(key);
  return idx === -1 ? SEATING_TYPE_ORDER.length : idx;
};

export const sortSeatingTypes = <T,>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
): T[] => {
  return [...items].sort((a, b) => {
    const ra = getSeatingTypeRank(getKey(a));
    const rb = getSeatingTypeRank(getKey(b));
    if (ra !== rb) return ra - rb;
    // Stable fallback: by name
    const na = String(getKey(a) ?? "");
    const nb = String(getKey(b) ?? "");
    return na.localeCompare(nb);
  });
};
