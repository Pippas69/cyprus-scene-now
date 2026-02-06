import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendEncryptedPush, PushPayload } from "../_shared/web-push-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-RESERVATION-EVENT-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_RESERVATION_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("ERROR: Missing signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    // IMPORTANT: In Deno, signature verification must be async (SubtleCrypto)
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Webhook event verified", { type: event.type });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logStep("ERROR: Webhook signature verification failed", { error: message });
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    // Only process reservation_event type payments
    if (metadata?.type !== "reservation_event") {
      logStep("Not a reservation event payment, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reservationId = metadata.reservation_id;
    const seatingTypeId = metadata.seating_type_id;

    if (!reservationId) {
      logStep("ERROR: No reservation_id in metadata");
      return new Response("Missing reservation_id", { status: 400 });
    }

    logStep("Processing reservation payment", { reservationId, seatingTypeId });

    try {
      // Update reservation to paid and accepted
      const { data: reservation, error: updateError } = await supabaseClient
        .from("reservations")
        .update({
          prepaid_charge_status: "paid",
          status: "accepted",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", reservationId)
        .select(`
          *,
          events (
            id,
            title,
            start_at,
            location,
            venue_name,
            business_id,
            businesses (
              id,
              name,
              phone,
              user_id
            )
          )
        `)
        .single();

      if (updateError) {
        logStep("ERROR: Updating reservation", { error: updateError });
        throw updateError;
      }

      logStep("Reservation updated to paid/accepted", { reservationId });

      // Decrement seating slots
      if (seatingTypeId) {
        const { error: decrementError } = await supabaseClient
          .rpc("decrement_seating_slots", { p_seating_type_id: seatingTypeId });

        if (decrementError) {
          logStep("ERROR: Decrementing seating slots", { error: decrementError });
        } else {
          logStep("Seating slots decremented", { seatingTypeId });
        }
      }

      // Get seating type info
      let seatingTypeName = "";
      let dressCode = "";
      if (seatingTypeId) {
        const { data: seatingType } = await supabaseClient
          .from("reservation_seating_types")
          .select("seating_type, dress_code, no_show_policy")
          .eq("id", seatingTypeId)
          .single();

        if (seatingType) {
          const seatingTypeLabels: Record<string, string> = {
            bar: "Bar",
            table: "Table",
            vip: "VIP",
            sofa: "Sofa",
          };
          seatingTypeName = seatingTypeLabels[seatingType.seating_type] || seatingType.seating_type;
          dressCode = seatingType.dress_code || "";
        }
      }

      // Get user profile
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, name")
        .eq("id", reservation.user_id)
        .single();

      const businessId = reservation.events?.businesses?.id;
      const businessUserId = reservation.events?.businesses?.user_id;
      const businessName = reservation.events?.businesses?.name || '';

      // Format date for notifications
      const formattedDate = new Date(reservation.events?.start_at).toLocaleDateString('el-GR', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens'
      });

      // ========== USER NOTIFICATIONS (in-app + push + email) ==========
      logStep("Sending user notifications", { userId: reservation.user_id });

      // 1. User in-app notification
      try {
        await supabaseClient.from('notifications').insert({
          user_id: reservation.user_id,
          title: '✅ Κράτηση επιβεβαιώθηκε!',
          message: `${reservation.events?.title || 'Εκδήλωση'} • ${formattedDate}`,
          type: 'reservation',
          event_type: 'reservation_confirmed',
          entity_type: 'reservation',
          entity_id: reservationId,
          deep_link: '/dashboard-user/reservations',
          delivered_at: new Date().toISOString(),
        });
        logStep("User in-app notification created");
      } catch (inAppError) {
        logStep("ERROR: User in-app notification", { error: String(inAppError) });
      }

      // 2. User push notification
      try {
        const userPushPayload: PushPayload = {
          title: '✅ Κράτηση επιβεβαιώθηκε!',
          body: `${reservation.events?.title || 'Εκδήλωση'} • ${formattedDate}`,
          icon: '/fomo-logo-new.png',
          badge: '/fomo-logo-new.png',
          tag: `reservation-confirmed-${reservationId}`,
          data: {
            url: '/dashboard-user/reservations',
            type: 'reservation_confirmed',
            entityType: 'reservation',
            entityId: reservationId,
          },
        };
        const userPushResult = await sendEncryptedPush(reservation.user_id, userPushPayload, supabaseClient);
        logStep("User push notification sent", userPushResult);
      } catch (pushError) {
        logStep("ERROR: User push notification", { error: String(pushError) });
      }

      // 3. User email
      if (profile?.email) {
        try {
          const qrCodeUrl = reservation.qr_code_token 
            ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reservation.qr_code_token)}&color=102b4a`
            : null;

          const userEmailHtml = `
            <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
              <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <div style="background:linear-gradient(180deg,#0d3b66 0%,#4ecdc4 100%);padding:48px 24px 36px;text-align:center;border-radius:12px 12px 0 0;">
                  <h1 style="color:#fff;margin:0;font-size:42px;font-weight:bold;letter-spacing:4px;">ΦΟΜΟ</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Cyprus Events</p>
                </div>
                <div style="padding:32px 24px;">
                  <h2 style="color:#0d3b66;margin:0 0 16px;font-size:24px;">Η Κράτησή σου Επιβεβαιώθηκε! ✅</h2>
                  <p style="color:#475569;margin:0 0 24px;line-height:1.6;">
                    Γεια σου <strong>${profile?.name || reservation.reservation_name}</strong>,<br><br>
                    Η πληρωμή σου ολοκληρώθηκε και η κράτησή σου επιβεβαιώθηκε!
                  </p>
                  <div style="background:linear-gradient(135deg,#f0fdfa 0%,#ecfdf5 100%);border-left:4px solid #4ecdc4;padding:20px;border-radius:8px;margin:24px 0;">
                    <p style="color:#0d3b66;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">ΚΡΑΤΗΣΗ ΕΚΔΗΛΩΣΗΣ</p>
                    <h3 style="color:#0d3b66;margin:0 0 16px;font-size:18px;">${reservation.events?.title || 'Εκδήλωση'}</h3>
                    <p style="color:#475569;margin:4px 0;">🏢 ${businessName}</p>
                    <p style="color:#475569;margin:4px 0;">📅 ${formattedDate}</p>
                    <p style="color:#475569;margin:4px 0;">📍 ${reservation.events?.location || reservation.events?.venue_name || ''}</p>
                    <p style="color:#475569;margin:12px 0 0;"><strong>Όνομα:</strong> ${reservation.reservation_name}</p>
                    <p style="color:#475569;margin:4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
                    ${seatingTypeName ? `<p style="color:#475569;margin:4px 0;"><strong>Τύπος Θέσης:</strong> ${seatingTypeName}</p>` : ''}
                    ${dressCode ? `<p style="color:#475569;margin:4px 0;"><strong>Dress Code:</strong> ${dressCode}</p>` : ''}
                    <p style="color:#475569;margin:12px 0 0;"><strong>Πληρωμένο ποσό:</strong> €${((reservation.prepaid_min_charge_cents || 0) / 100).toFixed(2)}</p>
                  </div>
                  ${qrCodeUrl ? `
                  <div style="text-align:center;margin:28px 0;">
                    <h3 style="color:#102b4a;margin:0 0 8px;font-size:18px;font-weight:bold;">Ο Κωδικός σου</h3>
                    <p style="color:#64748b;margin:0 0 20px;font-size:14px;">Παρουσίασε αυτόν τον κωδικό QR κατά την άφιξή σου</p>
                    <div style="background:#fff;border:3px solid #3ec3b7;border-radius:16px;padding:20px;display:inline-block;">
                      <img src="${qrCodeUrl}" alt="QR Code" style="width:180px;height:180px;display:block;"/>
                    </div>
                    <p style="color:#102b4a;font-size:24px;font-weight:bold;margin:16px 0 4px;letter-spacing:2px;">${reservation.confirmation_code}</p>
                    <p style="color:#94a3b8;font-size:12px;margin:0;">Κωδικός Επιβεβαίωσης</p>
                  </div>
                  ` : ''}
                  <p style="color:#059669;font-weight:600;text-align:center;font-size:16px;">🎉 Ανυπομονούμε να σας δούμε!</p>
                </div>
                <div style="background:#102b4a;padding:28px;text-align:center;border-radius:0 0 12px 12px;">
                  <p style="color:#3ec3b7;font-size:18px;font-weight:bold;letter-spacing:2px;margin:0 0 8px;">ΦΟΜΟ</p>
                  <p style="color:#94a3b8;font-size:12px;margin:0;">© 2025 ΦΟΜΟ. Discover events in Cyprus.</p>
                </div>
              </div>
            </body></html>
          `;

          await resend.emails.send({
            from: "ΦΟΜΟ <notifications@fomo.com.cy>",
            to: [profile.email],
            subject: `Επιβεβαίωση Κράτησης - ${reservation.events?.title || 'Εκδήλωση'}`,
            html: userEmailHtml,
          });
          logStep("User email sent", { email: profile.email });
        } catch (emailError) {
          logStep("ERROR: User email", { error: String(emailError) });
        }
      }

      // ========== BUSINESS NOTIFICATIONS (in-app + push + email) ==========
      if (businessId && businessUserId) {
        logStep("Sending business notifications", { businessUserId });

        // 1. Business in-app notification
        try {
          await supabaseClient.from('notifications').insert({
            user_id: businessUserId,
            title: '🎉 Νέα πληρωμένη κράτηση!',
            message: `${reservation.reservation_name} - ${reservation.party_size} άτομα • ${reservation.events?.title}`,
            type: 'business',
            event_type: 'new_reservation_event',
            entity_type: 'reservation',
            entity_id: reservationId,
            deep_link: '/dashboard-business/reservations',
            delivered_at: new Date().toISOString(),
          });
          logStep("Business in-app notification created");
        } catch (bizInAppError) {
          logStep("ERROR: Business in-app notification", { error: String(bizInAppError) });
        }

        // 2. Business push notification
        try {
          const bizPushPayload: PushPayload = {
            title: '🎉 Νέα πληρωμένη κράτηση!',
            body: `${reservation.reservation_name} - ${reservation.party_size} άτομα • ${reservation.events?.title}`,
            icon: '/fomo-logo-new.png',
            badge: '/fomo-logo-new.png',
            tag: `biz-reservation-${reservationId}`,
            data: {
              url: '/dashboard-business/reservations',
              type: 'new_reservation_event',
              entityType: 'reservation',
              entityId: reservationId,
            },
          };
          const bizPushResult = await sendEncryptedPush(businessUserId, bizPushPayload, supabaseClient);
          logStep("Business push notification sent", bizPushResult);
        } catch (bizPushError) {
          logStep("ERROR: Business push notification", { error: String(bizPushError) });
        }

        // 3. Business email
        try {
          const { data: bizProfile } = await supabaseClient
            .from("profiles")
            .select("email")
            .eq("id", businessUserId)
            .single();

          if (bizProfile?.email) {
            const bizEmailHtml = `
              <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
                <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                  <div style="background:linear-gradient(180deg,#0d3b66 0%,#4ecdc4 100%);padding:48px 24px 36px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:42px;font-weight:bold;letter-spacing:4px;">ΦΟΜΟ</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Business Dashboard</p>
                  </div>
                  <div style="padding:32px 24px;">
                    <h2 style="color:#0d3b66;margin:0 0 16px;font-size:24px;">🎉 Νέα Πληρωμένη Κράτηση!</h2>
                    <p style="color:#475569;margin:0 0 24px;line-height:1.6;">
                      Έχεις νέα κράτηση για <strong>${reservation.events?.title || 'Εκδήλωση'}</strong>:
                    </p>
                    <div style="background:#f8fafc;border-left:4px solid #4ecdc4;padding:20px;border-radius:8px;margin:24px 0;">
                      <p style="color:#475569;margin:4px 0;"><strong>Πελάτης:</strong> ${reservation.reservation_name}</p>
                      <p style="color:#475569;margin:4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
                      <p style="color:#475569;margin:4px 0;"><strong>Ημερομηνία:</strong> ${formattedDate}</p>
                      ${seatingTypeName ? `<p style="color:#475569;margin:4px 0;"><strong>Θέση:</strong> ${seatingTypeName}</p>` : ''}
                      ${reservation.phone_number ? `<p style="color:#475569;margin:4px 0;"><strong>Τηλέφωνο:</strong> ${reservation.phone_number}</p>` : ''}
                      ${reservation.special_requests ? `<p style="color:#475569;margin:4px 0;"><strong>Σημειώσεις:</strong> ${reservation.special_requests}</p>` : ''}
                      <p style="color:#059669;margin:12px 0 0;font-weight:600;">💳 Πληρωμένο: €${((reservation.prepaid_min_charge_cents || 0) / 100).toFixed(2)}</p>
                    </div>
                    <p style="color:#64748b;font-size:14px;text-align:center;">Κωδικός: <strong>${reservation.confirmation_code}</strong></p>
                  </div>
                  <div style="background:#102b4a;padding:28px;text-align:center;">
                    <p style="color:#3ec3b7;font-size:18px;font-weight:bold;letter-spacing:2px;margin:0 0 8px;">ΦΟΜΟ</p>
                    <p style="color:#94a3b8;font-size:12px;margin:0;">© 2025 ΦΟΜΟ. Business Partner Portal.</p>
                  </div>
                </div>
              </body></html>
            `;

            await resend.emails.send({
              from: "ΦΟΜΟ <notifications@fomo.com.cy>",
              to: [bizProfile.email],
              subject: `Νέα Κράτηση: ${reservation.reservation_name} - ${reservation.party_size} άτομα`,
              html: bizEmailHtml,
            });
            logStep("Business email sent", { email: bizProfile.email });
          }
        } catch (bizEmailError) {
          logStep("ERROR: Business email", { error: String(bizEmailError) });
        }
      }

      logStep("Reservation processing complete", { reservationId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logStep("ERROR: Processing reservation payment", { error: message });
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata;

    if (metadata?.type === "reservation_event" && metadata?.reservation_id) {
      // Update reservation status to indicate payment failed
      await supabaseClient
        .from("reservations")
        .update({
          prepaid_charge_status: "pending",
          status: "pending",
        })
        .eq("id", metadata.reservation_id);

      logStep("Reservation payment failed", { reservationId: metadata.reservation_id });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
