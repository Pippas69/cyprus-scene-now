import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  businessEmail: string;
  businessName: string;
  type: "registration" | "approval" | "rejection";
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-business-notification invoked with method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessEmail, businessName, type, notes }: NotificationRequest = await req.json();
    console.log("Processing business notification:", type, "for:", businessEmail);

    let subject = "";
    let html = "";

    if (type === "registration") {
      subject = "Επιβεβαίωση Εγγραφής στο ΦΟΜΟ";
      html = wrapEmailContent(`
        <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Καλώς ήρθατε στο ΦΟΜΟ! 🎉</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Αγαπητέ/ή <strong>${businessName}</strong>,<br><br>
          Η επιχείρησή σας καταχωρήθηκε επιτυχώς στο ΦΟΜΟ και εκκρεμεί προς επαλήθευση.
        </p>
        
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #0d3b66; margin: 0 0 12px 0; font-size: 16px;">Τι θα συμβεί τώρα;</h3>
          <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Η ομάδα μας θα εξετάσει την αίτησή σας</li>
            <li>Θα λάβετε ενημέρωση εντός 24-48 ωρών</li>
            <li>Μόλις εγκριθείτε, θα μπορείτε να δημοσιεύετε εκδηλώσεις</li>
          </ul>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
          Ευχαριστούμε για το ενδιαφέρον σας να γίνετε μέλος της κοινότητας ΦΟΜΟ!
        </p>
      `);
    } else if (type === "approval") {
      subject = "Η Επιχείρησή σας εγκρίθηκε στο ΦΟΜΟ! 🎉";
      html = wrapEmailContent(`
        <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Συγχαρητήρια! ✅</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Αγαπητέ/ή <strong>${businessName}</strong>,<br><br>
          Η επιχείρησή σας έχει εγκριθεί και είναι πλέον ενεργή στο ΦΟΜΟ!
        </p>
        
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #4ecdc4; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #0d3b66; margin: 0 0 12px 0; font-size: 16px;">Τι μπορείτε να κάνετε τώρα:</h3>
          <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>📅 Δημιουργήστε εκδηλώσεις</li>
            <li>🎁 Προσθέστε προσφορές</li>
            <li>📊 Παρακολουθήστε τα analytics σας</li>
            <li>👥 Προσεγγίστε νέο κοινό σε όλη την Κύπρο</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://fomo.com.cy/login" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Συνδεθείτε τώρα
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center;">
          Ευχαριστούμε που είστε μέλος της κοινότητας ΦΟΜΟ!
        </p>
      `);
    } else {
      subject = "Η εγγραφή σας στο ΦΟΜΟ χρειάζεται ενημέρωση";
      html = wrapEmailContent(`
        <h2 style="color: #0d3b66; margin: 0 0 16px 0; font-size: 24px;">Ενημέρωση Εγγραφής</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Αγαπητέ/ή <strong>${businessName}</strong>,<br><br>
          Ευχαριστούμε για το ενδιαφέρον σας να εγγραφείτε στο ΦΟΜΟ.
        </p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #475569; margin: 0 0 12px 0;">
            Δυστυχώς, η εγγραφή σας χρειάζεται επιπλέον πληροφορίες ή διορθώσεις.
          </p>
          ${notes ? `<p style="color: #475569; margin: 0;"><strong>Σημειώσεις:</strong> ${notes}</p>` : ""}
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
          Παρακαλούμε επικοινωνήστε μαζί μας στο <a href="mailto:info@fomo.com.cy" style="color: #4ecdc4;">info@fomo.com.cy</a> για περισσότερες λεπτομέρειες.
        </p>
      `);
    }

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <noreply@fomocy.com>",
      to: [businessEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-business-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
