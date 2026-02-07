import { supabase } from "@/integrations/supabase/client";
import { computeBoostWindow, isTimestampWithinWindow } from "./boostWindow";

export interface EventBoostRecord {
  event_id: string;
  start_date: string;
  end_date: string;
  created_at?: string | null;
  duration_mode?: string | null;
  duration_hours?: number | null;
  status?: string;
}

export interface OfferBoostRecord {
  discount_id: string;
  start_date: string;
  end_date: string;
  created_at?: string | null;
  duration_mode?: string | null;
  duration_hours?: number | null;
  status?: string;
}

/**
 * Checks if a boost is currently active based on its window (supports hourly boosts).
 */
export const isBoostCurrentlyActive = (
  boost: EventBoostRecord | OfferBoostRecord,
  now: string = new Date().toISOString()
): boolean => {
  const window = computeBoostWindow({
    start_date: boost.start_date,
    end_date: boost.end_date,
    created_at: boost.created_at,
    duration_mode: boost.duration_mode,
    duration_hours: boost.duration_hours,
  });
  if (!window) return false;
  return isTimestampWithinWindow(now, window);
};

/**
 * Fetches event boost records and returns a Set of event IDs that are currently boosted.
 */
export const fetchCurrentlyBoostedEventIds = async (
  eventIds: string[]
): Promise<Set<string>> => {
  if (eventIds.length === 0) return new Set();

  const { data: boosts } = await supabase
    .from("event_boosts")
    .select("event_id, start_date, end_date, created_at, duration_mode, duration_hours")
    .in("event_id", eventIds)
    .eq("status", "active");

  const now = new Date().toISOString();
  const boostedIds = new Set<string>();

  (boosts || []).forEach((boost) => {
    if (isBoostCurrentlyActive(boost as EventBoostRecord, now)) {
      boostedIds.add(boost.event_id);
    }
  });

  return boostedIds;
};

/**
 * Fetches offer boost records and returns a Set of discount IDs that are currently boosted.
 */
export const fetchCurrentlyBoostedOfferIds = async (
  offerIds: string[]
): Promise<Set<string>> => {
  if (offerIds.length === 0) return new Set();

  const { data: boosts } = await supabase
    .from("offer_boosts")
    .select("discount_id, start_date, end_date, created_at, duration_mode, duration_hours")
    .in("discount_id", offerIds)
    .eq("status", "active");

  const now = new Date().toISOString();
  const boostedIds = new Set<string>();

  (boosts || []).forEach((boost) => {
    if (isBoostCurrentlyActive(boost as OfferBoostRecord, now)) {
      boostedIds.add(boost.discount_id);
    }
  });

  return boostedIds;
};
