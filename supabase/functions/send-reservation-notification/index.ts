import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://cdn.jsdelivr.net/npm/resend@3.5.0/+esm";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
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
    const { reservationId, type }: NotificationRequest = await req.json();
    console.log(`Processing ${type} notification for reservation ${reservationId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch reservation with event and business details
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
            profiles (
              email,
              name
            )
          )
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

    const event = reservation.events;
    const business = event.businesses;
    const businessEmail = business.profiles?.email;
    const businessName = business.name;
    const eventTitle = event.title;
    const eventDate = new Date(event.start_at).toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let userSubject = '';
    let userHtml = '';
    let businessSubject = '';
    let businessHtml = '';

    if (type === 'new') {
      // User confirmation email
      userSubject = `Επιβεβαίωση Κράτησης - ${eventTitle}`;
      userHtml = wrapEmailContent(`
        <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Επιβεβαίωση Κράτησης 🎉</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
          Η κράτησή σου έχει καταχωρηθεί επιτυχώς!
        </p>
        
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 18px;">${eventTitle}</h3>
          <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός Επιβεβαίωσης:</strong> <span style="font-size: 20px; color: #0d3b66; font-weight: bold;">${reservation.confirmation_code}</span></p>
          <p style="color: #475569; margin: 4px 0;">📅 ${eventDate}</p>
          <p style="color: #475569; margin: 4px 0;">📍 ${event.location}</p>
          <p style="color: #475569; margin: 4px 0;">🏢 ${businessName}</p>
          <p style="color: #475569; margin: 12px 0 0 0;"><strong>Όνομα:</strong> ${reservation.reservation_name}</p>
          <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
          ${reservation.seating_preference ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
          ${reservation.preferred_time ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτιμώμενη Ώρα:</strong> ${reservation.preferred_time}</p>` : ''}
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

      // Business notification email
      if (businessEmail) {
        businessSubject = `Νέα Κράτηση - ${eventTitle}`;
        businessHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Νέα Κράτηση! 📋</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Έχετε μια νέα κράτηση για την εκδήλωσή σας.
          </p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #0d3b66; margin: 0 0 16px 0;">${eventTitle}</h3>
            <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Πελάτης:</strong> ${reservation.reservation_name}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Email:</strong> ${userProfile.email}</p>
            ${reservation.phone_number ? `<p style="color: #475569; margin: 4px 0;"><strong>Τηλέφωνο:</strong> ${reservation.phone_number}</p>` : ''}
            <p style="color: #475569; margin: 4px 0;"><strong>Άτομα:</strong> ${reservation.party_size}</p>
            ${reservation.seating_preference ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
            ${reservation.preferred_time ? `<p style="color: #475569; margin: 4px 0;"><strong>Προτιμώμενη Ώρα:</strong> ${reservation.preferred_time}</p>` : ''}
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
      userHtml = wrapEmailContent(`
        <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Ενημέρωση Κράτησης ${statusEmoji}</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
          Η κατάσταση της κράτησής σου έχει ενημερωθεί.
        </p>
        
        <div style="background: ${isAccepted ? 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)' : '#fef2f2'}; border-left: 4px solid ${isAccepted ? '#4ecdc4' : '#ef4444'}; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός Επιβεβαίωσης:</strong> ${reservation.confirmation_code}</p>
          <p style="color: #475569; margin: 4px 0;"><strong>Εκδήλωση:</strong> ${eventTitle}</p>
          <p style="color: #475569; margin: 4px 0;">📅 ${eventDate}</p>
          <p style="color: #475569; margin: 12px 0 0 0;"><strong>Κατάσταση:</strong> <span style="color: ${isAccepted ? '#059669' : '#dc2626'}; font-weight: bold;">${statusText}</span></p>
        </div>
        
        ${isAccepted 
          ? `<p style="color: #059669; font-weight: 600;">🎉 Ανυπομονούμε να σας δούμε! Παρουσιάστε τον κωδικό επιβεβαίωσης κατά την άφιξή σας.</p>` 
          : `<p style="color: #64748b; font-size: 14px;">Λυπούμαστε που δεν μπορούμε να σας εξυπηρετήσουμε αυτή τη φορά. Ελπίζουμε να σας δούμε σύντομα!</p>`
        }
      `);
    } else if (type === 'cancellation') {
      userSubject = `Ακύρωση Κράτησης - ${eventTitle}`;
      userHtml = wrapEmailContent(`
        <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Κράτηση Ακυρώθηκε</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Γεια σου <strong>${userProfile.name || 'φίλε'}</strong>,<br><br>
          Η κράτησή σου έχει ακυρωθεί επιτυχώς.
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
          <p style="color: #475569; margin: 4px 0;"><strong>Εκδήλωση:</strong> ${eventTitle}</p>
          <p style="color: #475569; margin: 4px 0;">📅 ${eventDate}</p>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
          Ελπίζουμε να σας δούμε σύντομα σε μια άλλη εκδήλωση!
        </p>
      `);

      // Notify business about cancellation
      if (businessEmail) {
        businessSubject = `Ακύρωση Κράτησης - ${eventTitle}`;
        businessHtml = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Ακύρωση Κράτησης</h2>
          <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
            Μια κράτηση ακυρώθηκε.
          </p>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #475569; margin: 4px 0;"><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Εκδήλωση:</strong> ${eventTitle}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Πελάτης:</strong> ${reservation.reservation_name}</p>
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

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-reservation-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
