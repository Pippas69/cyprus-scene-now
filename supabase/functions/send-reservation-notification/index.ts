import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";
import { buildNotificationKey, markAsSent, wasAlreadySent } from "../_shared/notification-idempotency.ts";
import { getEmailForUserId } from "../_shared/user-email.ts";
import {
  wrapPremiumEmail,
  wrapBusinessEmail,
  emailGreeting,
  infoCard,
  detailRow,
  qrCodeSection,
  ctaButton,
  successBadge,
  noteBox,
} from "../_shared/email-templates.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  reservationId: string;
  type: 'new' | 'status_change' | 'cancellation';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-reservation-notification invoked with method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    
    const resend = new Resend(resendApiKey);
    
    const { reservationId, type }: NotificationRequest = await req.json();
    console.log(`Processing ${type} notification for reservation ${reservationId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch reservation with event AND/OR business details
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        events (
          id,
          title,
          start_at,
          location,
          businesses (
            id,
            name,
            user_id,
            address
          )
        ),
        businesses (
          id,
          name,
          user_id,
          address
        )
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      console.error('Error fetching reservation:', reservationError);
      throw new Error('Reservation not found');
    }

    // Fetch user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', reservation.user_id)
      .single();

    // Determine if this is an event or direct reservation
    const isDirectReservation = !reservation.event_id && reservation.business_id;
    console.log(`Reservation type: ${isDirectReservation ? 'Direct' : 'Event-based'}`);

    // Get business info from either source
    let businessData: { id: string; name: string; user_id: string; address?: string } | null = null;
    let reservationContext: string;
    let reservationDateTime: string;
    let locationInfo: string | null;

    if (isDirectReservation) {
      businessData = reservation.businesses;
      reservationContext = 'Κράτηση Τραπεζιού';
      reservationDateTime = reservation.preferred_time || reservation.reservation_date;
      locationInfo = businessData?.address || null;
    } else {
      const event = reservation.events;
      if (!event) {
        throw new Error('Event not found for event-based reservation');
      }
      businessData = event.businesses;
      reservationContext = event.title;
      reservationDateTime = event.start_at;
      locationInfo = event.location;
    }

    if (!businessData) {
      throw new Error('Business data not found');
    }

    const businessName = businessData.name;

    // Format the date/time for display - ALWAYS use Cyprus timezone
    const formattedDate = reservationDateTime ? new Date(reservationDateTime).toLocaleDateString('el-GR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Nicosia'
    }) : '';
    
    const formattedTime = reservationDateTime ? new Date(reservationDateTime).toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Nicosia'
    }) : '';

    // Generate QR code URL
    const qrCodeToken = reservation.qr_code_token || reservation.confirmation_code;
    const qrCodeUrl = qrCodeToken 
      ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=M&data=${encodeURIComponent(qrCodeToken)}&bgcolor=ffffff&color=000000`
      : null;

    let userSubject = '';
    let userHtml = '';
    let businessSubject = '';
    let businessHtml = '';
    let inAppNotification: { title: string; message: string; event_type: string; deep_link: string } | null = null;

    const reservationTypeLabel = isDirectReservation ? 'Κράτηση' : 'Εκδήλωση';
    const userName = userProfile?.name || reservation.reservation_name || 'φίλε';

    // Build common info rows
    const buildInfoRows = () => {
      let rows = detailRow('Ημερομηνία', formattedDate);
      rows += detailRow('Ώρα', formattedTime);
      rows += detailRow('Άτομα', `${reservation.party_size}`);
      if (reservation.seating_preference) {
        rows += detailRow('Θέση', reservation.seating_preference);
      }
      return rows;
    };

    if (type === 'new') {
      const isAutoAccepted = reservation.status === 'accepted';
      
      if (isAutoAccepted && qrCodeUrl) {
        // Auto-accepted reservation with QR code
        userSubject = `✓ Κράτηση επιβεβαιώθηκε - ${reservationContext}`;
        inAppNotification = {
          title: '✅ Κράτηση επιβεβαιώθηκε!',
          message: `${reservationContext} · ${formattedDate} ${formattedTime}`,
          event_type: 'reservation_confirmed',
          deep_link: `/dashboard-user?tab=reservations`
        };
        
        const content = `
          ${successBadge('Κράτηση Επιβεβαιώθηκε')}
          ${emailGreeting(userName)}
          
          <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
            Η κράτησή σου στο <strong>${businessName}</strong> είναι επιβεβαιωμένη.
          </p>

          ${isDirectReservation ? '' : `
            <p style="color: #0d3b66; font-size: 16px; font-weight: 600; text-align: center; margin: 0 0 16px 0;">
              ${reservationContext}
            </p>
          `}

          ${infoCard(reservationTypeLabel, buildInfoRows())}

          ${qrCodeSection(qrCodeUrl, reservation.confirmation_code, 'Δείξε στην είσοδο')}

          ${ctaButton('Οι κρατήσεις μου', 'https://fomo.com.cy/dashboard-user?tab=reservations')}
        `;
        
        userHtml = wrapPremiumEmail(content, '✓ Επιβεβαιώθηκε');
      } else {
        // Pending reservation
        userSubject = `Κράτηση καταχωρήθηκε - ${reservationContext}`;
        inAppNotification = {
          title: '📋 Κράτηση καταχωρήθηκε',
          message: `${reservationContext} - αναμονή έγκρισης`,
          event_type: 'reservation_pending',
          deep_link: `/dashboard-user?tab=reservations`
        };
        
        const content = `
          ${emailGreeting(userName)}
          
          <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
            Η κράτησή σου στο <strong>${businessName}</strong> καταχωρήθηκε και περιμένει έγκριση.
          </p>

          ${isDirectReservation ? '' : `
            <p style="color: #0d3b66; font-size: 16px; font-weight: 600; text-align: center; margin: 0 0 16px 0;">
              ${reservationContext}
            </p>
          `}

          ${infoCard(reservationTypeLabel, buildInfoRows() + detailRow('Κωδικός', reservation.confirmation_code, true))}

          ${noteBox('Θα ενημερωθείς όταν η επιχείρηση εγκρίνει την κράτησή σου.', 'info')}

          ${ctaButton('Οι κρατήσεις μου', 'https://fomo.com.cy/dashboard-user?tab=reservations')}
        `;
        
        userHtml = wrapPremiumEmail(content, '⏳ Εκκρεμεί');
      }

      // Business notification for new reservation
      businessSubject = `Νέα κράτηση - ${reservation.reservation_name}`;
      const bizContent = `
        ${successBadge('Νέα Κράτηση')}
        
        <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
          Νέα κράτηση για το <strong>${businessName}</strong>.
        </p>

        ${infoCard('Λεπτομέρειες', 
          detailRow('Πελάτης', reservation.reservation_name) +
          detailRow('Ημερομηνία', formattedDate) +
          detailRow('Ώρα', formattedTime) +
          detailRow('Άτομα', `${reservation.party_size}`) +
          (reservation.special_requests ? detailRow('Σημειώσεις', reservation.special_requests) : '') +
          detailRow('Κωδικός', reservation.confirmation_code, true)
        )}

        ${ctaButton('Διαχείριση', 'https://fomo.com.cy/dashboard-business/reservations')}
      `;
      businessHtml = wrapBusinessEmail(bizContent, '📋 Νέα Κράτηση');
      
    } else if (type === 'status_change') {
      const isAccepted = reservation.status === 'accepted';
      
      if (isAccepted) {
        userSubject = `✓ Κράτηση εγκρίθηκε - ${reservationContext}`;
        inAppNotification = {
          title: '✅ Κράτηση εγκρίθηκε!',
          message: `${reservationContext} · ${formattedDate} ${formattedTime}`,
          event_type: 'reservation_confirmed',
          deep_link: `/dashboard-user?tab=reservations`
        };
        
        const content = `
          ${successBadge('Κράτηση Εγκρίθηκε')}
          ${emailGreeting(userName)}
          
          <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
            Η κράτησή σου στο <strong>${businessName}</strong> εγκρίθηκε!
          </p>

          ${infoCard(reservationTypeLabel, buildInfoRows())}

          ${qrCodeUrl ? qrCodeSection(qrCodeUrl, reservation.confirmation_code, 'Δείξε στην είσοδο') : `
            <p style="color: #0d3b66; font-size: 18px; font-weight: 700; text-align: center; letter-spacing: 2px; margin: 20px 0;">
              ${reservation.confirmation_code}
            </p>
          `}

          ${ctaButton('Οι κρατήσεις μου', 'https://fomo.com.cy/dashboard-user?tab=reservations')}
        `;
        
        userHtml = wrapPremiumEmail(content, '✓ Εγκρίθηκε');
      } else {
        // Declined
        userSubject = `Κράτηση απορρίφθηκε - ${reservationContext}`;
        inAppNotification = {
          title: '❌ Κράτηση απορρίφθηκε',
          message: `${reservationContext} - ${businessName}`,
          event_type: 'reservation_declined',
          deep_link: `/dashboard-user?tab=reservations`
        };
        
        const content = `
          ${emailGreeting(userName)}
          
          <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
            Δυστυχώς η κράτησή σου στο <strong>${businessName}</strong> δεν μπορεί να γίνει αποδεκτή.
          </p>

          ${infoCard(reservationTypeLabel, buildInfoRows())}

          <p style="color: #64748b; font-size: 13px; text-align: center; margin: 16px 0;">
            Ελπίζουμε να σας εξυπηρετήσουμε σύντομα!
          </p>

          ${ctaButton('Δες άλλες επιλογές', 'https://fomo.com.cy/feed')}
        `;
        
        userHtml = wrapPremiumEmail(content, '❌ Απορρίφθηκε');
      }
      
    } else if (type === 'cancellation') {
      userSubject = `Ακύρωση κράτησης - ${reservationContext}`;
      inAppNotification = {
        title: '🚫 Κράτηση ακυρώθηκε',
        message: `${reservationContext} - ${businessName}`,
        event_type: 'reservation_cancelled',
        deep_link: `/dashboard-user?tab=reservations`
      };
      
      const content = `
        ${emailGreeting(userName)}
        
        <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
          Η κράτησή σου στο <strong>${businessName}</strong> ακυρώθηκε.
        </p>

        ${infoCard(reservationTypeLabel, 
          detailRow('Κωδικός', reservation.confirmation_code) +
          detailRow('Ημερομηνία', formattedDate) +
          detailRow('Ώρα', formattedTime)
        )}

        <p style="color: #64748b; font-size: 13px; text-align: center; margin: 16px 0;">
          Ελπίζουμε να σας δούμε σύντομα!
        </p>
      `;
      
      userHtml = wrapPremiumEmail(content, '🚫 Ακυρώθηκε');

      // Business notification for cancellation
      businessSubject = `Ακύρωση - ${reservation.reservation_name}`;
      const bizContent = `
        <p style="color: #334155; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
          Μια κράτηση ακυρώθηκε.
        </p>

        ${infoCard('Λεπτομέρειες', 
          detailRow('Πελάτης', reservation.reservation_name) +
          detailRow('Ημερομηνία', formattedDate) +
          detailRow('Ώρα', formattedTime) +
          detailRow('Άτομα', `${reservation.party_size}`)
        )}
      `;
      businessHtml = wrapBusinessEmail(bizContent, '🚫 Ακύρωση');
    }

    // Send emails with idempotency
    const userEmailAddr = await getEmailForUserId(supabase, reservation.user_id);
    const bizEmailAddr = businessData?.user_id ? await getEmailForUserId(supabase, businessData.user_id) : null;

    const userEmailKey = buildNotificationKey({
      channel: "email",
      eventType: type === 'new' ? 'reservation_new' : type === 'status_change' ? 'reservation_status' : 'reservation_cancelled',
      recipientUserId: reservation.user_id,
      entityType: "reservation",
      entityId: reservationId,
    });

    const bizEmailKey = businessData?.user_id
      ? buildNotificationKey({
          channel: "email",
          eventType: type === 'new' ? 'reservation_new' : type === 'status_change' ? 'reservation_status' : 'reservation_cancelled',
          recipientUserId: businessData.user_id,
          entityType: "reservation",
          entityId: reservationId,
        })
      : null;

    // Send to user
    if (userEmailAddr && userHtml && !(await wasAlreadySent(supabase, reservation.user_id, userEmailKey))) {
      try {
        await resend.emails.send({
          from: "ΦΟΜΟ <support@fomo.com.cy>",
          to: [userEmailAddr],
          subject: userSubject,
          html: userHtml,
        });
        await markAsSent(supabase, reservation.user_id, userEmailKey, "reservation", reservationId);
        console.log('User email sent');
      } catch (emailErr) {
        console.log('User email error (non-fatal)', emailErr);
      }
    }

    // Send to business
    if (businessData?.user_id && bizEmailAddr && businessHtml && bizEmailKey && !(await wasAlreadySent(supabase, businessData.user_id, bizEmailKey))) {
      try {
        await resend.emails.send({
          from: "ΦΟΜΟ <support@fomo.com.cy>",
          to: [bizEmailAddr],
          subject: businessSubject,
          html: businessHtml,
        });
        await markAsSent(supabase, businessData.user_id, bizEmailKey, "reservation", reservationId);
        console.log('Business email sent');
      } catch (emailErr) {
        console.log('Business email error (non-fatal)', emailErr);
      }
    }

    // Business push notification for new reservations and cancellations
    if (businessData?.user_id && (type === 'new' || type === 'cancellation')) {
      try {
        const businessPushTitle = type === 'new' ? '📋 Νέα Κράτηση' : '🚫 Ακύρωση';
        const businessPushBody = `${reservation.reservation_name} · ${formattedDate} ${formattedTime}`;
        
        await supabase.from('notifications').insert({
          user_id: businessData.user_id,
          title: businessPushTitle,
          message: businessPushBody,
          type: 'business',
          event_type: type === 'new' ? 'new_reservation' : 'reservation_cancelled',
          entity_type: 'reservation',
          entity_id: reservationId,
          deep_link: '/dashboard-business/reservations',
          delivered_at: new Date().toISOString(),
        });
        
        await sendPushIfEnabled(businessData.user_id, {
          title: businessPushTitle,
          body: businessPushBody,
          tag: `reservation-business-${reservationId}`,
          data: {
            url: '/dashboard-business/reservations',
            type: type === 'new' ? 'new_reservation' : 'reservation_cancelled',
            entityType: 'reservation',
            entityId: reservationId,
          },
        }, supabase);
      } catch (pushError) {
        console.log('Business push error (non-fatal)', pushError);
      }
    }

    // User in-app notification and push
    if (inAppNotification) {
      try {
        await supabase.from('notifications').insert({
          user_id: reservation.user_id,
          title: inAppNotification.title,
          message: inAppNotification.message,
          type: 'reservation',
          event_type: inAppNotification.event_type,
          entity_type: 'reservation',
          entity_id: reservationId,
          deep_link: inAppNotification.deep_link,
          delivered_at: new Date().toISOString(),
        });
        
        await sendPushIfEnabled(reservation.user_id, {
          title: inAppNotification.title,
          body: inAppNotification.message,
          tag: `reservation-${reservationId}`,
          data: {
            url: inAppNotification.deep_link,
            type: inAppNotification.event_type,
            entityType: 'reservation',
            entityId: reservationId,
          },
        }, supabase);
      } catch (notifError) {
        console.log('User notification error (non-fatal)', notifError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-reservation-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
