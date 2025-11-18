import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  businessEmail: string;
  businessName: string;
  type: "registration" | "approval" | "rejection";
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessEmail, businessName, type, notes }: NotificationRequest = await req.json();

    let subject = "";
    let html = "";

    if (type === "registration") {
      subject = "Επιβεβαίωση Εγγραφής στο ΦΟΜΟ";
      html = `
        <h1>Καλώς ήρθατε, ${businessName}!</h1>
        <p>Η επιχείρησή σας καταχωρήθηκε επιτυχώς στο ΦΟΜΟ και εκκρεμεί προς επαλήθευση.</p>
        <p>Η ομάδα μας θα εξετάσει την αίτησή σας και θα σας ενημερώσει σύντομα.</p>
        <p>Μόλις εγκριθεί η επιχείρησή σας, θα μπορείτε να δημοσιεύετε εκδηλώσεις και προσφορές.</p>
        <br>
        <p>Ευχαριστούμε για το ενδιαφέρον σας!</p>
        <p>— Η Ομάδα του ΦΟΜΟ</p>
      `;
    } else if (type === "approval") {
      subject = "Η Επιχείρησή σας εγκρίθηκε στο ΦΟΜΟ!";
      html = `
        <h1>Συγχαρητήρια, ${businessName}!</h1>
        <p>Η επιχείρησή σας έχει εγκριθεί και είναι πλέον ενεργή στο ΦΟΜΟ.</p>
        <p>Μπορείτε τώρα να δημοσιεύετε εκδηλώσεις και προσφορές και να προσεγγίσετε νέο κοινό σε όλη την Κύπρο.</p>
        <p>Συνδεθείτε στο λογαριασμό σας για να ξεκινήσετε: <a href="https://fomo.cy/login">ΦΟΜΟ Login</a></p>
        <br>
        <p>Ευχαριστούμε που είστε μέλος της κοινότητας ΦΟΜΟ!</p>
        <p>— Η Ομάδα του ΦΟΜΟ</p>
      `;
    } else {
      subject = "Η εγγραφή σας στο ΦΟΜΟ χρειάζεται ενημέρωση";
      html = `
        <h1>Αγαπητέ/ή ${businessName},</h1>
        <p>Ευχαριστούμε για το ενδιαφέρον σας να εγγραφείτε στο ΦΟΜΟ.</p>
        <p>Δυστυχώς, η εγγραφή σας χρειάζεται επιπλέον πληροφορίες ή διορθώσεις.</p>
        ${notes ? `<p><strong>Σημειώσεις:</strong> ${notes}</p>` : ""}
        <p>Παρακαλούμε επικοινωνήστε μαζί μας στο info@fomo.cy για περισσότερες λεπτομέρειες.</p>
        <br>
        <p>Με εκτίμηση,</p>
        <p>— Η Ομάδα του ΦΟΜΟ</p>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "ΦΟΜΟ <noreply@fomo.cy>",
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

serve(handler);