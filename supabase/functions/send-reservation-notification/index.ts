import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Branded email template parts
const emailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
  </div>
`;

const emailFooter = `
  <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</p>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 ΦΟΜΟ. Discover events in Cyprus.</p>
  </div>
`;

const wrapEmailContent = (content: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap" rel="stylesheet">
  </head>
  <body style="margin: 0; padding: 20px; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      ${emailHeader}
      <div style="padding: 32px 24px;">
        ${content}
      </div>
      ${emailFooter}
    </div>
  </body>
  </html>
`;

interface NotificationRequest {
  reservationId: string;
  type: 'new' | 'status_change' | 'cancellation';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-reservation-notification invoked with method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Fetch user email
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', reservation.user_id)
      .single();

    if (userError || !userProfile?.email) {
      console.error('Error fetching user:', userError);
      throw new Error('User email not found');
    }

    // Determine if this is an event or direct reservation
    const isDirectReservation = !reservation.event_id && reservation.business_id;
    console.log(`Reservation type: ${isDirectReservation ? 'Direct' : 'Event-based'}`);

    // Get business info from either source
    let businessData: { id: string; name: string; user_id: string; address?: string } | null = null;
    let reservationContext: string; // Event title or "Table Reservation"
    let reservationDateTime: string;
    let locationInfo: string | null;

    if (isDirectReservation) {
      // Direct business reservation
      businessData = reservation.businesses;
      reservationContext = 'Κράτηση Τραπεζιού';
      reservationDateTime = reservation.preferred_time || reservation.reservation_date;
      locationInfo = businessData?.address || null;
      console.log('Direct reservation - preferred_time:', reservation.preferred_time);
    } else {
      // Event-based reservation
      const event = reservation.events;
      if (!event) {
        throw new Error('Event not found for event-based reservation');
      }
      businessData = event.businesses;
      reservationContext = event.title;
      reservationDateTime = event.start_at;
      locationInfo = event.location;
      console.log('Event reservation - start_at:', event.start_at);
    }
    
    console.log('Final reservationDateTime:', reservationDateTime);

    if (!businessData) {
      throw new Error('Business data not found');
    }

    // Fetch business owner's email
    const { data: businessProfile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', businessData.user_id)
      .single();

    const businessEmail = businessProfile?.email;
    const businessName = businessData.name;

    // Format the date/time for display - use Europe/Athens timezone
    const formattedDateTime = reservationDateTime ? new Date(reservationDateTime).toLocaleString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Athens'
    }) : 'Δεν καθορίστηκε';
    
    console.log('Formatted DateTime (Europe/Athens):', formattedDateTime);

    // Generate QR code URL using the qr_code_token
    const qrCodeToken = reservation.qr_code_token || reservation.confirmation_code;
    const qrCodeUrl = qrCodeToken 
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeToken)}&color=102b4a`
      : null;

    let userSubject = '';
    let userHtml = '';
    let businessSubject = '';
    let businessHtml = '';
    let inAppNotification: { title: string; message: string; event_type: string; deep_link: string } | null = null;

    const reservationTypeLabel = isDirectReservation ? 'Κράτηση Τραπεζιού' : 'Κράτηση Εκδήλωσης';
    const reservationTypeEmoji = isDirectReservation ? '🪑' : '🎉';

    if (type === 'new') {
      // Check if the reservation is already accepted (auto-approve case)
      const isAutoAccepted = reservation.status === 'accepted';
      
      if (isAutoAccepted && qrCodeUrl) {
        // Auto-accepted reservation - send confirmation with QR code
        userSubject = `Η Κράτησή σου Επιβεβαιώθηκε - ${reservationContext}`;
        inAppNotification = {
          title: '✅ Κράτηση επιβεβαιώθηκε!',
          message: `${reservationContext} στις ${formattedDateTime}`,
          event_type: 'reservation_confirmed',
          deep_link: `/dashboard-user/reservations`
        };
        userHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Η Κράτησή σου Επιβεβαιώθηκε! ✅</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
            Η κράτησή σου έχει επιβεβαιωθεί επιτυχώς!
          </p>
          
          <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
            <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px;">${reservationContext}</h3>
            <p style="color: #475569; margin: 4px 0;">🏢 ${businessName}</p>
            <p style="color: #475569; margin: 4px 0;">📅 ${formattedDateTime}</p>
            ${locationInfo ? `<p style="color: #475569; margin: 4px 0;">📍 ${locationInfo}</p>` : ''}
            <p style="color: #475569; margin: 12px 0 0px 0;"><strong>Όνομα:</strong> ${reservation.reservation_name}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
            ${reservation.seating_preference ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
            ${reservation.special_requests ? `<p style="color: #475569; margin: 4px 0;"><strong>Ειδικά Αιτήματα:</strong> ${reservation.special_requests}</p>` : ''}
          </div>
          
          <!-- QR Code Section -->
          <div style="text-align: center; margin: 28px 0;">
            <h3 style="color: #102b4a; margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">Ο Κωδικός σου</h3>
            <p style="color: #64748b; margin: 0 0 20px 0; font-size: 14px;">Παρουσίασε αυτόν τον κωδικό QR κατά την άφιξή σου</p>
            
            <div style="background: #ffffff; border: 3px solid #3ec3b7; border-radius: 16px; padding: 20px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 43, 74, 0.08);">
              <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px; display: block;" />
            </div>
            
            <p style="color: #102b4a; font-size: 24px; font-weight: bold; margin: 16px 0 4px 0; letter-spacing: 2px;">${reservation.confirmation_code}</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Κωδικός Επιβεβαίωσης</p>
          </div>
          
          <p style="color: #059669; font-weight: 600; text-align: center; font-size: 16px;">
            🎉 Ανυπομονούμε να σας δούμε!
          </p>
        `);
      } else {
        // Pending reservation - needs approval
        userSubject = `Επιβεβαίωση Κράτησης - ${reservationContext}`;
        inAppNotification = {
          title: '📋 Κράτηση καταχωρήθηκε',
          message: `${reservationContext} - αναμονή έγκρισης`,
          event_type: 'reservation_pending',
          deep_link: `/dashboard-user/reservations`
        };
        userHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Επιβεβαίωση Κράτησης ${reservationTypeEmoji}</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
            Η κράτησή σου έχει καταχωρηθεί επιτυχώς!
          </p>
          
          <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
            <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px;">${reservationContext}</h3>
            <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός Επιβεβαίωσης:</strong> <span style="font-size: 20px; color: #0d3b66; font-weight: bold;">${reservation.confirmation_code}</span></p>
            <p style="color: #475569; margin: 4px 0;">🏢 ${businessName}</p>
            <p style="color: #475569; margin: 4px 0;">📅 ${formattedDateTime}</p>
            ${locationInfo ? `<p style="color: #475569; margin: 4px 0;">📍 ${locationInfo}</p>` : ''}
            <p style="color: #475569; margin: 12px 0 0 0;"><strong>Όνομα:</strong> ${reservation.reservation_name}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
            ${reservation.seating_preference ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
            ${reservation.preferred_time && !isDirectReservation ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτιμώμενη Ώρα:</strong> ${reservation.preferred_time}</p>` : ''}
            ${reservation.special_requests ? `<p style="color: #475569; margin: 4px 0;"><strong>Ειδικά Αιτήματα:</strong> ${reservation.special_requests}</p>` : ''}
            <p style="color: #475569; margin: 12px 0 0 0;"><strong>Κατάσταση:</strong> <span style="color: #f59e0b;">Εκκρεμεί</span></p>
          </div>
          
          <p style="color: #f59e0b; font-style: italic; margin: 16px 0;">
            ⏳ Η κράτησή σου εκκρεμεί και περιμένει έγκριση από την επιχείρηση.
          </p>
          
          <p style="color: #64748b; font-size: 14px;">
            Θα λάβεις email όταν η κατάσταση της κράτησής σου αλλάξει.<br>
            Παρουσίασε τον κωδικό επιβεβαίωσης κατά την άφιξή σου.
          </p>
        `);
      }

      // Business notification email
      if (businessEmail) {
        businessSubject = `Νέα Κράτηση - ${reservationContext}`;
        businessHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Νέα Κράτηση! 📋</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Έχετε μια νέα κράτηση${isDirectReservation ? ' τραπεζιού' : ' για την εκδήλωσή σας'}.
          </p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
            <h3 style="color: #0d3b66; margin: 0 0 16px 0;">${reservationContext}</h3>
            <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Πελάτης:</strong> ${reservation.reservation_name}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Email:</strong> ${userProfile.email}</p>
            ${reservation.phone_number ? `<p style="color: #475569; margin: 4px 0;"><strong>Τηλέφωνο:</strong> ${reservation.phone_number}</p>` : ''}
            <p style="color: #475569; margin: 4px 0;"><strong>Ημ/νία:</strong> ${formattedDateTime}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
            ${reservation.seating_preference ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
            ${reservation.preferred_time && !isDirectReservation ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτιμώμενη Ώρα:</strong> ${reservation.preferred_time}</p>` : ''}
            ${reservation.special_requests ? `<p style="color: #475569; margin: 4px 0;"><strong>Ειδικές Απαιτήσεις:</strong> ${reservation.special_requests}</p>` : ''}
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            Συνδεθείτε στο dashboard σας για να διαχειριστείτε αυτή την κράτηση.
          </p>
        `);
      }
    } else if (type === 'status_change') {
      const isAccepted = reservation.status === 'accepted';
      const statusText = isAccepted ? 'Εγκρίθηκε' : 'Απορρίφθηκε';
      const statusEmoji = isAccepted ? '✅' : '❌';
      
      userSubject = `Ενημέρωση Κράτησης - ${statusText}`;
      
      if (isAccepted) {
        inAppNotification = {
          title: '✅ Κράτηση εγκρίθηκε!',
          message: `${reservationContext} στις ${formattedDateTime}`,
          event_type: 'reservation_confirmed',
          deep_link: `/dashboard-user/reservations`
        };
      } else {
        inAppNotification = {
          title: '❌ Κράτηση απορρίφθηκε',
          message: `${reservationContext} - ${businessName}`,
          event_type: 'reservation_declined',
          deep_link: `/dashboard-user/reservations`
        };
      }
      
      if (isAccepted && qrCodeUrl) {
        // Accepted reservation with QR code
        userHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Η Κράτησή σου Επιβεβαιώθηκε! ✅</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
            Υπέροχα νέα! Η κράτησή σου έχει εγκριθεί.
          </p>
          
          <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
            <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px;">${reservationContext}</h3>
            <p style="color: #475569; margin: 4px 0;">🏢 ${businessName}</p>
            <p style="color: #475569; margin: 4px 0;">📅 ${formattedDateTime}</p>
            ${locationInfo ? `<p style="color: #475569; margin: 4px 0;">📍 ${locationInfo}</p>` : ''}
            <p style="color: #475569; margin: 12px 0 4px 0;"><strong>Όνομα:</strong> ${reservation.reservation_name}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
            ${reservation.seating_preference ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
            ${reservation.special_requests ? `<p style="color: #475569; margin: 4px 0;"><strong>Ειδικά Αιτήματα:</strong> ${reservation.special_requests}</p>` : ''}
          </div>
          
          <!-- QR Code Section -->
          <div style="text-align: center; margin: 28px 0;">
            <h3 style="color: #102b4a; margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">Ο Κωδικός σου</h3>
            <p style="color: #64748b; margin: 0 0 20px 0; font-size: 14px;">Παρουσίασε αυτόν τον κωδικό QR κατά την άφιξή σου</p>
            
            <div style="background: #ffffff; border: 3px solid #3ec3b7; border-radius: 16px; padding: 20px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 43, 74, 0.08);">
              <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px; display: block;" />
            </div>
            
            <p style="color: #102b4a; font-size: 24px; font-weight: bold; margin: 16px 0 4px 0; letter-spacing: 2px;">${reservation.confirmation_code}</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Κωδικός Επιβεβαίωσης</p>
          </div>
          
          <p style="color: #059669; font-weight: 600; text-align: center; font-size: 16px;">
            🎉 Ανυπομονούμε να σας δούμε!
          </p>
          
          <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 24px;">
            Μπορείτε επίσης να δείτε την κράτησή σας στο <strong>ΦΟΜΟ dashboard</strong> σας.
          </p>
        `);
      } else if (isAccepted) {
        // Accepted but no QR code
        userHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Η Κράτησή σου Επιβεβαιώθηκε! ✅</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
            Υπέροχα νέα! Η κράτησή σου έχει εγκριθεί.
          </p>
          
          <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
            <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px;">${reservationContext}</h3>
            <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός Επιβεβαίωσης:</strong> <span style="font-size: 18px; color: #0d3b66; font-weight: bold;">${reservation.confirmation_code}</span></p>
            <p style="color: #475569; margin: 4px 0;">🏢 ${businessName}</p>
            <p style="color: #475569; margin: 4px 0;">📅 ${formattedDateTime}</p>
            ${locationInfo ? `<p style="color: #475569; margin: 4px 0;">📍 ${locationInfo}</p>` : ''}
            <p style="color: #475569; margin: 12px 0 4px 0;"><strong>Όνομα:</strong> ${reservation.reservation_name}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
            ${reservation.seating_preference ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
            ${reservation.special_requests ? `<p style="color: #475569; margin: 4px 0;"><strong>Ειδικά Αιτήματα:</strong> ${reservation.special_requests}</p>` : ''}
            <p style="color: #475569; margin: 12px 0 0 0;"><strong>Κατάσταση:</strong> <span style="color: #059669; font-weight: bold;">${statusText}</span></p>
          </div>
          
          <p style="color: #059669; font-weight: 600;">🎉 Ανυπομονούμε να σας δούμε! Παρουσιάστε τον κωδικό επιβεβαίωσης κατά την άφιξή σας.</p>
        `);
      } else {
        // Declined
        userHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Ενημέρωση Κράτησης ${statusEmoji}</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
            Η κατάσταση της κράτησής σου έχει ενημερωθεί.
          </p>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
            <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px;">${reservationContext}</h3>
            <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός Επιβεβαίωσης:</strong> ${reservation.confirmation_code}</p>
            <p style="color: #475569; margin: 4px 0;">🏢 ${businessName}</p>
            <p style="color: #475569; margin: 4px 0;">📅 ${formattedDateTime}</p>
            <p style="color: #475569; margin: 12px 0 0 0;"><strong>Κατάσταση:</strong> <span style="color: #dc2626; font-weight: bold;">${statusText}</span></p>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">Λυπούμαστε που δεν μπορούμε να σας εξυπηρετήσουμε αυτή τη φορά. Ελπίζουμε να σας δούμε σύντομα!</p>
        `);
      }
    } else if (type === 'cancellation') {
      userSubject = `Ακύρωση Κράτησης - ${reservationContext}`;
      inAppNotification = {
        title: '🚫 Κράτηση ακυρώθηκε',
        message: `${reservationContext} - ${businessName}`,
        event_type: 'reservation_cancelled',
        deep_link: `/dashboard-user/reservations`
      };
      userHtml = wrapEmailContent(`
        <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Κράτηση Ακυρώθηκε</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
          Η κράτησή σου έχει ακυρωθεί επιτυχώς.
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
          <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
          <p style="color: #475569; margin: 4px 0;"><strong>${isDirectReservation ? 'Επιχείρηση' : 'Εκδήλωση'}:</strong> ${reservationContext}</p>
          <p style="color: #475569; margin: 4px 0;">🏢 ${businessName}</p>
          <p style="color: #475569; margin: 4px 0;">📅 ${formattedDateTime}</p>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
          Ελπίζουμε να σας δούμε σύντομα${isDirectReservation ? '!' : ' σε μια άλλη εκδήλωση!'}
        </p>
      `);

      // Notify business about cancellation
      if (businessEmail) {
        businessSubject = `Ακύρωση Κράτησης - ${reservationContext}`;
        businessHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Ακύρωση Κράτησης</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Μια κράτηση ακυρώθηκε.
          </p>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #0d3b66; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${reservationTypeLabel}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>${isDirectReservation ? 'Επιχείρηση' : 'Εκδήλωση'}:</strong> ${reservationContext}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Πελάτης:</strong> ${reservation.reservation_name}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Ημ/νία:</strong> ${formattedDateTime}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
          </div>
        `);
      }
    }

    // Send emails
    const emailPromises = [];

    // Send to user
    const userEmailPromise = resend.emails.send({
      from: "ΦΟΜΟ <noreply@fomo.cy>",
      to: [userProfile.email],
      subject: userSubject,
      html: userHtml,
    });
    emailPromises.push(userEmailPromise);

    // Send to business if applicable
    if (businessEmail && businessSubject) {
      const businessEmailPromise = resend.emails.send({
        from: "ΦΟΜΟ <noreply@fomo.cy>",
        to: [businessEmail],
        subject: businessSubject,
        html: businessHtml,
      });
      emailPromises.push(businessEmailPromise);
    }

    const results = await Promise.all(emailPromises);
    console.log('Email API responses:', JSON.stringify(results, null, 2));
    console.log('Emails sent successfully to:', userProfile.email, businessEmail || 'no business email');

    // Send push notification AND create in-app notification for business owner for new reservations and cancellations
    if (businessData?.user_id && (type === 'new' || type === 'cancellation')) {
      try {
        const businessPushTitle = type === 'new' ? '📋 Νέα Κράτηση!' : '🚫 Ακύρωση Κράτησης';
        const businessPushBody = `${reservation.reservation_name} • ${formattedDateTime} • ${reservation.party_size} άτομα`;
        
        // Create in-app notification for business owner
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
        console.log('Business in-app notification created', { userId: businessData.user_id });
        
        const businessPushResult = await sendPushIfEnabled(businessData.user_id, {
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
        console.log('Business push notification result:', businessPushResult);
      } catch (pushError) {
        console.log('Failed to send business push notification', pushError);
      }
    }

    // Create in-app notification and send push notification
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
        console.log('In-app notification created for user', reservation.user_id);
        
        // Send push notification using shared encrypted module
        const pushResult = await sendPushIfEnabled(reservation.user_id, {
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
        console.log('Push notification result:', pushResult);
      } catch (notifError) {
        console.log('Failed to create in-app notification', notifError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-reservation-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
