/**
 * PR (Promoter) Attribution Tracking — Client Side
 *
 * Όταν κάποιος επισκέπτεται event link με ?ref=tracking_code:
 * 1. Καταγράφεται click στη βάση (μέσω RPC `record_promoter_click`)
 * 2. Αποθηκεύεται tracking ref σε localStorage για 30 ημέρες
 * 3. Το checkout επισυνάπτει αυτό το ref ώστε να γίνει attribution της αγοράς
 *
 * Anti-fraud: Αν ο visitor είναι ο ίδιος ο PR (logged in), το click δεν μετράει.
 */
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "fomo_promoter_ref";
const SESSION_KEY = "fomo_promoter_session";
const ATTRIBUTION_DAYS = 30;

export interface PromoterRef {
  tracking_code: string;
  session_id: string;
  link_id: string;
  business_id: string;
  event_id: string | null;
  recorded_at: number;
  expires_at: number;
}

/** Stable session id (per-browser) */
function getOrCreateSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `s_${Date.now()}`;
  }
}

/** Get current active PR ref, if not expired. */
export function getActivePromoterRef(): PromoterRef | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PromoterRef;
    if (!parsed?.expires_at || Date.now() > parsed.expires_at) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Returns the persisted session_id (creating one if needed). */
export function getPromoterSessionId(): string {
  return getOrCreateSessionId();
}

/**
 * Records a click for the given tracking code. Safe to call multiple times.
 * Server-side handles deduplication & anti-fraud (self-clicks not counted).
 */
export async function trackPromoterClick(trackingCode: string): Promise<void> {
  if (!trackingCode || typeof trackingCode !== "string") return;

  try {
    const sessionId = getOrCreateSessionId();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;

    const { data, error } = await supabase.rpc("record_promoter_click", {
      _tracking_code: trackingCode,
      _session_id: sessionId,
      _user_id: userId,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });

    if (error) {
      console.warn("[promoterTracking] record_promoter_click failed:", error.message);
      return;
    }

    const result = data as {
      success: boolean;
      counted?: boolean;
      is_self_click?: boolean;
      link_id?: string;
      event_id?: string | null;
      business_id?: string;
      reason?: string;
    } | null;

    if (!result?.success || !result.link_id || !result.business_id) return;

    // Don't persist self-clicks for attribution
    if (result.is_self_click) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const now = Date.now();
    const ref: PromoterRef = {
      tracking_code: trackingCode,
      session_id: sessionId,
      link_id: result.link_id,
      business_id: result.business_id,
      event_id: result.event_id ?? null,
      recorded_at: now,
      expires_at: now + ATTRIBUTION_DAYS * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ref));
  } catch (err) {
    console.warn("[promoterTracking] tracking error:", err);
  }
}

/** Clear stored ref (e.g. after a confirmed purchase, optional). */
export function clearPromoterRef(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Helper: build the metadata payload to attach to a checkout session for a given business.
 * Returns null if no active ref or ref is for a different business.
 */
export function getPromoterCheckoutPayload(businessId: string): {
  promoter_session_id: string;
  promoter_tracking_code: string;
} | null {
  const ref = getActivePromoterRef();
  if (!ref) return null;
  if (ref.business_id !== businessId) return null;
  return {
    promoter_session_id: ref.session_id,
    promoter_tracking_code: ref.tracking_code,
  };
}
