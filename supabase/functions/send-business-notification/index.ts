import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { BusinessApprovalEmail } from '../_shared/email-templates/business-approval.tsx'
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Legacy HTML templates for registration and rejection (kept as-is)
const emailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
  </div>
`;

const emailFooter = `
  <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</p>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 ΦΟΜΟ. Discover events in Cyprus.</p>
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
    return new Response(null, { headers: securityHeaders });
  }

  try {
    const { businessEmail, businessName, type, notes }: NotificationRequest = await req.json();
    console.log("Processing business notification:", type, "for:", businessEmail);

    let subject = "";
    let html = "";

    if (type === "approval") {
      // Use React Email template for approval — matches signup email design
      subject = "\u0397 \u03B5\u03C0\u03B9\u03C7\u03B5\u03AF\u03C1\u03B7\u03C3\u03AE \u03C3\u03BF\u03C5 \u03B5\u03B3\u03BA\u03C1\u03AF\u03B8\u03B7\u03BA\u03B5! \u2705";
      html = await renderAsync(
        React.createElement(BusinessApprovalEmail, {
          businessName,
          siteUrl: 'https://fomo.com.cy',
          loginUrl: 'https://fomo.com.cy/login',
        })
      );
    } else if (type === "registration") {
      subject = "\u0395\u03C0\u03B9\u03B2\u03B5\u03B2\u03B1\u03AF\u03C9\u03C3\u03B7 \u0395\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE\u03C2 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F";
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
    } else {
      subject = "\u0397 \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE \u03C3\u03B1\u03C2 \u03C3\u03C4\u03BF \u03A6\u039F\u039C\u039F \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9 \u03B5\u03BD\u03B7\u03BC\u03AD\u03C1\u03C9\u03C3\u03B7";
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
      from: "ΦΟΜΟ <support@fomo.com.cy>",
      to: [businessEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...securityHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-business-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...securityHeaders },
      }
    );
  }
};

Deno.serve(handler);
