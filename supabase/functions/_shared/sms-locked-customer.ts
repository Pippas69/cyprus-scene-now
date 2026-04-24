// Shared helper: when a checkout request includes a pending_booking_token
// (meaning the customer arrived through an SMS booking link), the customer
// name and phone MUST come from the database — never from the client payload.
// This prevents a tampered browser from submitting a different name/phone
// than the one the business owner originally sent the SMS to.
//
// Usage:
//   const locked = await loadSmsLockedCustomer(supabaseService, token);
//   if (locked) {
//     reservation_name = locked.customerName ?? reservation_name;
//     phone_number = locked.customerPhone;
//   }
//
// Returns null when no token is provided OR the token is invalid/expired —
// callers should handle that case based on their own business rules.

// deno-lint-ignore no-explicit-any
type SupabaseLikeClient = any;

export type SmsLockedCustomer = {
  pendingBookingId: string;
  bookingType: "reservation" | "ticket" | "walk_in";
  customerName: string | null;
  customerPhone: string;
  partySize: number | null;
  seatingPreference: string | null;
};

/**
 * Loads the locked customer fields for an SMS-link booking, straight from
 * the database via the public RPC (bypasses RLS via SECURITY DEFINER).
 * Only returns data when the pending_booking is still 'pending' and not expired.
 */
export async function loadSmsLockedCustomer(
  supabaseService: SupabaseLikeClient,
  token: string | null | undefined,
): Promise<SmsLockedCustomer | null> {
  if (!token || typeof token !== "string") return null;
  try {
    const { data, error } = await supabaseService.rpc(
      "get_pending_booking_by_token",
      { _token: token },
    );
    if (error) {
      console.warn("[sms-locked-customer] RPC error", error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    return {
      pendingBookingId: row.id,
      bookingType: row.booking_type,
      customerName: row.customer_name ?? null,
      customerPhone: row.customer_phone,
      partySize: row.party_size ?? null,
      seatingPreference: row.seating_preference ?? null,
    };
  } catch (e) {
    console.warn("[sms-locked-customer] failed to load locked booking", e);
    return null;
  }
}
