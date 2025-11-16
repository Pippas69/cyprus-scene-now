import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  reservationId: string;
  type: 'new' | 'status_change' | 'cancellation';
}

const handler = async (req: Request): Promise<Response> => {
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

    // Determine language based on user preference (default to Greek for now)
    const lang = 'el';

    if (type === 'new') {
      // User confirmation email (Greek)
      userSubject = `Επιβεβαίωση Κράτησης - ${eventTitle}`;
      userHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Επιβεβαίωση Κράτησης</h1>
          <p>Γεια σου ${userProfile.name || 'φίλε'},</p>
          <p>Η κράτησή σου έχει καταχωρηθεί επιτυχώς!</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Λεπτομέρειες Κράτησης</h2>
            <p><strong>Κωδικός Επιβεβαίωσης:</strong> <span style="font-size: 24px; color: #2563eb; font-weight: bold;">${reservation.confirmation_code}</span></p>
            <p><strong>Εκδήλωση:</strong> ${eventTitle}</p>
            <p><strong>Ημερομηνία:</strong> ${eventDate}</p>
            <p><strong>Τοποθεσία:</strong> ${event.location}</p>
            <p><strong>Όνομα Κράτησης:</strong> ${reservation.reservation_name}</p>
            <p><strong>Άτομα:</strong> ${reservation.party_size}</p>
            ${reservation.seating_preference ? `<p><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
            ${reservation.preferred_time ? `<p><strong>Προτιμώμενη Ώρα:</strong> ${reservation.preferred_time}</p>` : ''}
            <p><strong>Κατάσταση:</strong> ${reservation.status === 'pending' ? 'Εκκρεμεί' : reservation.status === 'accepted' ? 'Εγκρίθηκε' : 'Απορρίφθηκε'}</p>
          </div>
          
          ${reservation.status === 'pending' ? '<p style="color: #f59e0b;"><em>Η κράτησή σου εκκρεμεί και περιμένει έγκριση από την επιχείρηση.</em></p>' : ''}
          
          <p>Θα λάβεις email όταν η κατάσταση της κράτησής σου αλλάξει.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Παρουσίασε τον κωδικό επιβεβαίωσης κατά την άφιξή σου.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            ${businessName}<br/>
            Αυτό είναι ένα αυτόματο email. Παρακαλώ μην απαντήσετε.
          </p>
        </div>
      `;

      // Business notification email (Greek)
      if (businessEmail) {
        businessSubject = `Νέα Κράτηση - ${eventTitle}`;
        businessHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Νέα Κράτηση</h1>
            <p>Έχετε μια νέα κράτηση για την εκδήλωσή σας!</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Λεπτομέρειες Κράτησης</h2>
              <p><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
              <p><strong>Εκδήλωση:</strong> ${eventTitle}</p>
              <p><strong>Πελάτης:</strong> ${reservation.reservation_name}</p>
              <p><strong>Email:</strong> ${userProfile.email}</p>
              ${reservation.phone_number ? `<p><strong>Τηλέφωνο:</strong> ${reservation.phone_number}</p>` : ''}
              <p><strong>Άτομα:</strong> ${reservation.party_size}</p>
              ${reservation.seating_preference ? `<p><strong>Προτίμηση Θέσης:</strong> ${reservation.seating_preference}</p>` : ''}
              ${reservation.preferred_time ? `<p><strong>Προτιμώμενη Ώρα:</strong> ${reservation.preferred_time}</p>` : ''}
              ${reservation.special_requests ? `<p><strong>Ειδικές Απαιτήσεις:</strong> ${reservation.special_requests}</p>` : ''}
            </div>
            
            <p>Συνδεθείτε στο dashboard σας για να διαχειριστείτε αυτή την κράτηση.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Αυτό είναι ένα αυτόματο email από το σύστημα κρατήσεων.
            </p>
          </div>
        `;
      }
    } else if (type === 'status_change') {
      const statusText = reservation.status === 'accepted' ? 'Εγκρίθηκε' : 'Απορρίφθηκε';
      const statusColor = reservation.status === 'accepted' ? '#16a34a' : '#dc2626';
      
      userSubject = `Ενημέρωση Κράτησης - ${statusText}`;
      userHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${statusColor};">Η Κράτησή σας ${statusText}</h1>
          <p>Γεια σου ${userProfile.name || 'φίλε'},</p>
          <p>Η κατάσταση της κράτησής σου έχει ενημερωθεί.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Κωδικός Επιβεβαίωσης:</strong> ${reservation.confirmation_code}</p>
            <p><strong>Εκδήλωση:</strong> ${eventTitle}</p>
            <p><strong>Ημερομηνία:</strong> ${eventDate}</p>
            <p><strong>Κατάσταση:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
          </div>
          
          ${reservation.status === 'accepted' 
            ? '<p>Ανυπομονούμε να σας δούμε! Παρουσιάστε με τον κωδικό επιβεβαίωσης κατά την άφιξή σας.</p>' 
            : '<p>Λυπούμαστε που δεν μπορούμε να σας εξυπηρετήσουμε αυτή τη φορά. Ελπίζουμε να σας δούμε σύντομα!</p>'}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            ${businessName}<br/>
            Αυτό είναι ένα αυτόματο email. Παρακαλώ μην απαντήσετε.
          </p>
        </div>
      `;
    } else if (type === 'cancellation') {
      userSubject = `Ακύρωση Κράτησης - ${eventTitle}`;
      userHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Κράτηση Ακυρώθηκε</h1>
          <p>Γεια σου ${userProfile.name || 'φίλε'},</p>
          <p>Η κράτησή σου έχει ακυρωθεί επιτυχώς.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Κωδικός Επιβεβαίωσης:</strong> ${reservation.confirmation_code}</p>
            <p><strong>Εκδήλωση:</strong> ${eventTitle}</p>
            <p><strong>Ημερομηνία:</strong> ${eventDate}</p>
          </div>
          
          <p>Ελπίζουμε να σας δούμε σύντομα σε μια άλλη εκδήλωση!</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            ${businessName}<br/>
            Αυτό είναι ένα αυτόματο email. Παρακαλώ μην απαντήσετε.
          </p>
        </div>
      `;

      // Notify business about cancellation
      if (businessEmail) {
        businessSubject = `Ακύρωση Κράτησης - ${eventTitle}`;
        businessHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Ακύρωση Κράτησης</h1>
            <p>Μια κράτηση ακυρώθηκε.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Κωδικός:</strong> ${reservation.confirmation_code}</p>
              <p><strong>Εκδήλωση:</strong> ${eventTitle}</p>
              <p><strong>Πελάτης:</strong> ${reservation.reservation_name}</p>
              <p><strong>Άτομα:</strong> ${reservation.party_size}</p>
            </div>
          </div>
        `;
      }
    }

    // Send emails
    const emailPromises = [];

    // Send to user
    const userEmailPromise = resend.emails.send({
      from: "Reservations <onboarding@resend.dev>",
      to: [userProfile.email],
      subject: userSubject,
      html: userHtml,
    });
    emailPromises.push(userEmailPromise);

    // Send to business if applicable
    if (businessEmail && businessSubject) {
      const businessEmailPromise = resend.emails.send({
        from: "Reservations <onboarding@resend.dev>",
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
