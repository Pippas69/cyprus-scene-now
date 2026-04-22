import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { securityHeaders } from "../_shared/security-headers.ts";
import {
  wrapPremiumEmail,
  qrCodeSection,
  infoCard,
  detailRow,
  successBadge,
  noteBox,
} from "../_shared/email-templates.ts";

const LATIN = /^[a-zA-Z\s\-\.']+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...securityHeaders, "Content-Type": "application/json" },
  });

const makeQrUrl = (token: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&data=${encodeURIComponent(token)}&bgcolor=ffffff&color=000000`;

const log = (s: string, d?: unknown) =>
  console.log(`[ADD-COMP-GUESTS] ${s}`, d !== undefined ? JSON.stringify(d) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) return json({ error: "User not authenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const reservationId: string | undefined = body.reservation_id;
    const extraCount: number = parseInt(String(body.extra_guests ?? 0), 10);
    const rawNames: unknown[] = Array.isArray(body.guest_names) ? body.guest_names : [];
    const rawAges: unknown[] = Array.isArray(body.guest_ages) ? body.guest_ages : [];
    const recipientEmail: string = String(body.email ?? "").trim();

    if (!reservationId || !extraCount || extraCount < 1) {
      return json({ error: "Invalid request" }, 400);
    }
    if (rawNames.length !== extraCount) {
      return json({ error: "Guest names count mismatch" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return json({ error: "Invalid recipient email" }, 400);
    }

    const cleanedNames = rawNames.map((n) => String(n).trim()).filter(Boolean);
    if (cleanedNames.length !== extraCount) {
      return json({ error: "All guest names are required" }, 400);
    }
    for (const n of cleanedNames) {
      if (!LATIN.test(n)) {
        return json({ error: "Names must be in Latin characters only" }, 400);
      }
    }

    const cleanedAges: number[] = rawAges.map((a) => parseInt(String(a), 10));
    if (cleanedAges.some((a) => isNaN(a) || a < 0 || a > 120)) {
      return json({ error: "Invalid age value" }, 400);
    }
    if (cleanedAges.length !== extraCount) {
      return json({ error: "Guest ages count mismatch" }, 400);
    }

    // Load parent reservation and verify business ownership
    const { data: parent, error: parentErr } = await supabase
      .from("reservations")
      .select(`
        id, business_id, event_id, party_size, status, reservation_name,
        seating_type_id, prepaid_min_charge_cents, min_age,
        events ( id, title, start_at, event_type, minimum_age, location, venue_name, businesses ( id, name, user_id ) )
      `)
      .eq("id", reservationId)
      .single();

    if (parentErr || !parent) return json({ error: "Reservation not found" }, 404);
    if ((parent as any).is_comp || (parent as any).parent_reservation_id) {
      return json({ error: "Cannot add comps to a comp reservation" }, 400);
    }

    const event = (parent as any).events;
    const business = event?.businesses;
    if (!business) return json({ error: "Business not found" }, 404);
    if (business.user_id !== user.id) return json({ error: "Not authorized" }, 403);

    if (parent.status === "cancelled" || parent.status === "declined") {
      return json({ error: "Cannot add comps to a cancelled reservation" }, 400);
    }

    // Age check (mirror normal reservation flow)
    const minAge = (event?.minimum_age as number | null) ?? (parent as any).min_age ?? 0;
    if (minAge && minAge > 0) {
      const tooYoung = cleanedAges.some((a) => a < minAge);
      if (tooYoung) {
        return json({ error: `Minimum age is ${minAge}` }, 400);
      }
    }

    const newPartySize = (parent.party_size || 0) + extraCount;

    // Create comp reservation rows (one per guest) — owner-overrides capacity
    const compRows = cleanedNames.map((name, i) => ({
      business_id: parent.business_id,
      event_id: parent.event_id,
      user_id: user.id, // owner is the actor; comps don't belong to a real customer
      reservation_name: name,
      party_size: 1,
      status: "accepted" as const,
      preferred_time: null,
      special_requests: null,
      qr_code_token: crypto.randomUUID(),
      confirmation_code: null,
      seating_type_id: parent.seating_type_id,
      prepaid_min_charge_cents: 0,
      parent_reservation_id: parent.id,
      is_comp: true,
      min_age: cleanedAges[i] || null,
      email: recipientEmail,
      source: "comp_invitation",
      auto_created_from_tickets: false,
    }));

    const { data: insertedComps, error: insertErr } = await supabase
      .from("reservations")
      .insert(compRows as any)
      .select("id, qr_code_token, reservation_name");

    if (insertErr || !insertedComps) {
      log("Insert comps failed", { err: insertErr });
      return json({ error: "Failed to create comp guests" }, 500);
    }

    // Update parent party_size to reflect total (paid + comp)
    const { error: updErr } = await supabase
      .from("reservations")
      .update({ party_size: newPartySize, updated_at: new Date().toISOString() } as any)
      .eq("id", parent.id);

    if (updErr) {
      log("Parent party_size update failed (non-fatal)", { err: updErr });
    }

    // Build single email with all QR codes
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (RESEND_KEY) {
      const resend = new Resend(RESEND_KEY);

      const eventDate = (() => {
        try {
          const d = new Date(event.start_at);
          return d.toLocaleString("el-GR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Nicosia",
          });
        } catch {
          return event.start_at;
        }
      })();

      const venueName = event.venue_name || event.location || business.name;

      const qrContent = insertedComps.map((c) => {
        const qrUrl = makeQrUrl(c.qr_code_token);
        return `
          <div style="text-align: center; margin-bottom: 28px;">
            <p style="font-size: 14px; color: #0D3B66; margin: 0 0 6px 0; font-weight: 600;">${c.reservation_name}</p>
            <p style="font-size: 11px; color: #16a34a; margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Δωρεάν είσοδος</p>
            ${qrCodeSection(qrUrl, undefined, "Δείξε στην είσοδο")}
          </div>
        `;
      }).join("");

      const detailRows = [
        detailRow("Ημερομηνία", eventDate),
        detailRow("Τοποθεσία", venueName),
        detailRow("Άτομα", `${insertedComps.length}`),
      ].join("");

      const guestCount = insertedComps.length;
      const heroLabel = guestCount === 1
        ? "Είστε Καλεσμένος!"
        : `Έχετε ${guestCount} Προσκλήσεις!`;
      const introLine = guestCount === 1
        ? `Το <strong>${business.name}</strong> σας προσκαλεί στην εκδήλωση:`
        : `Το <strong>${business.name}</strong> σας προσκαλεί με <strong>${guestCount} άτομα</strong> στην εκδήλωση:`;
      const qrIntro = guestCount === 1
        ? "Δείξτε αυτό το QR code στην είσοδο:"
        : `Δείξτε τα παρακάτω ${guestCount} QR codes στην είσοδο — ένα για κάθε άτομο:`;

      const emailHtml = wrapPremiumEmail(`
        ${successBadge(heroLabel)}

        <p style="font-size: 15px; color: #334155; margin: 0 0 4px 0; text-align: center;">
          ${introLine}
        </p>
        <h2 style="font-size: 22px; color: #0D3B66; margin: 8px 0 20px 0; text-align: center; font-weight: 700;">${event.title}</h2>

        ${infoCard("Λεπτομέρειες", detailRows)}

        <div style="padding: 16px 0; text-align: center;">
          <p style="font-size: 14px; color: #64748b; margin: 0 0 16px 0;">
            ${qrIntro}
          </p>
          ${qrContent}
        </div>

        ${noteBox("Κάθε QR code μπορεί να χρησιμοποιηθεί μόνο μία φορά. Δωρεάν είσοδος — προσφορά της επιχείρησης.", "warning")}
      `);

      try {
        const subject = guestCount === 1
          ? `Πρόσκληση: ${event.title} — ${business.name}`
          : `${guestCount} Προσκλήσεις: ${event.title} — ${business.name}`;

        await resend.emails.send({
          from: "ΦΟΜΟ <support@fomo.com.cy>",
          to: [recipientEmail],
          subject,
          html: emailHtml,
        });
        emailSent = true;
        log("Email sent", { to: recipientEmail, guestCount });
      } catch (e) {
        log("Email send failed (non-fatal)", { err: String(e) });
      }
    } else {
      log("RESEND_API_KEY not configured, skipping email");
    }

    return json({
      success: true,
      comps_created: insertedComps.length,
      email_sent: emailSent,
      new_party_size: newPartySize,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return json({ error: msg }, 500);
  }
});
