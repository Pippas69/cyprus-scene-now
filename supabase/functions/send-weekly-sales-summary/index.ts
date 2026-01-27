import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WEEKLY-SALES-SUMMARY] ${step}${detailsStr}`);
};

// Create in-app notification for business owner
async function createInAppNotification(
  supabase: any,
  userId: string,
  businessId: string,
  totalReservations: number,
  totalTickets: number,
  totalOfferRedemptions: number,
  totalRevenue: number
): Promise<void> {
  const message = `Κρατήσεις: ${totalReservations} | Εισιτήρια: ${totalTickets} | Εξαργυρώσεις: ${totalOfferRedemptions} | Έσοδα: €${(totalRevenue / 100).toFixed(2)}`;
  
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Εβδομαδιαία Σύνοψη 📊',
    message,
    type: 'business',
    event_type: 'WEEKLY_DIGEST',
    entity_type: 'BUSINESS',
    entity_id: businessId,
    deep_link: '/dashboard-business/analytics',
    read: false,
    delivered_at: new Date().toISOString(),
  });
}

const emailHeader = `
<div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
  <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 4px; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Εβδομαδιαία Σύνοψη Επιχείρησης</p>
</div>
`;

const emailFooter = `
<div style="background: #102b4a; padding: 24px; text-align: center; border-radius: 0 0 12px 12px;">
  <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</p>
  <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 ΦΟΜΟ. Empowering Cyprus businesses.</p>
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    ${emailHeader}
    <div style="padding: 32px 24px;">
      ${content}
    </div>
    ${emailFooter}
  </div>
</body>
</html>
`;

interface DaySummary {
  date: string;
  reservations: number;
  tickets: number;
  revenue: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting weekly sales summary job");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate date range for past 7 days
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartISO = weekStart.toISOString();
    const weekEndISO = weekEnd.toISOString();

    logStep("Date range", { weekStart: weekStartISO, weekEnd: weekEndISO });

    // Find businesses with weekly summary enabled
    const { data: preferences, error: prefError } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("notification_weekly_summary", true);

    if (prefError) {
      throw new Error(`Failed to fetch preferences: ${prefError.message}`);
    }

    logStep("Found users with weekly summary enabled", { count: preferences?.length || 0 });

    if (!preferences || preferences.length === 0) {
      return new Response(JSON.stringify({ success: true, emailsSent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = preferences.map((p) => p.user_id);

    // Get businesses for these users
    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, user_id")
      .in("user_id", userIds);

    if (bizError) {
      throw new Error(`Failed to fetch businesses: ${bizError.message}`);
    }

    let emailsSent = 0;

    for (const business of businesses || []) {
      try {
        // Get business owner email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", business.user_id)
          .single();

        if (!profile?.email) {
          logStep("No email found for business", { businessId: business.id });
          continue;
        }

        // Fetch events for this business
        const { data: events } = await supabase
          .from("events")
          .select("id, title")
          .eq("business_id", business.id);

        const eventIds = events?.map((e) => e.id) || [];

        // Fetch reservations for the week
        const { data: reservations } = await supabase
          .from("reservations")
          .select("id, party_size, created_at, event_id")
          .in("event_id", eventIds.length > 0 ? eventIds : ["no-events"])
          .gte("created_at", weekStartISO)
          .lte("created_at", weekEndISO);

        // Fetch direct reservations
        const { data: directReservations } = await supabase
          .from("direct_reservations")
          .select("id, party_size, created_at")
          .eq("business_id", business.id)
          .gte("created_at", weekStartISO)
          .lte("created_at", weekEndISO);

        // Fetch ticket sales
        const { data: ticketOrders } = await supabase
          .from("ticket_orders")
          .select("id, quantity, total_amount, created_at")
          .in("event_id", eventIds.length > 0 ? eventIds : ["no-events"])
          .eq("status", "completed")
          .gte("created_at", weekStartISO)
          .lte("created_at", weekEndISO);

        // Fetch offer redemptions
        const { data: discounts } = await supabase
          .from("discounts")
          .select("id")
          .eq("business_id", business.id);

        const discountIds = discounts?.map((d) => d.id) || [];

        const { data: redemptions } = await supabase
          .from("discount_scans")
          .select("id, created_at, status")
          .in("discount_id", discountIds.length > 0 ? discountIds : ["no-discounts"])
          .eq("status", "redeemed")
          .gte("created_at", weekStartISO)
          .lte("created_at", weekEndISO);

        // Fetch QR check-ins (verified scans)
        const { data: qrCheckins } = await supabase
          .from("discount_scans")
          .select("id, created_at")
          .in("discount_id", discountIds.length > 0 ? discountIds : ["no-discounts"])
          .eq("status", "verified")
          .gte("created_at", weekStartISO)
          .lte("created_at", weekEndISO);

        // Calculate totals
        const totalReservations = (reservations?.length || 0) + (directReservations?.length || 0);
        const totalTickets = ticketOrders?.reduce((sum, o) => sum + (o.quantity || 0), 0) || 0;
        const totalRevenue = ticketOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        const totalOfferRedemptions = redemptions?.length || 0;
        const totalQRCheckins = qrCheckins?.length || 0;

        // Find best day (most combined activity)
        const dayActivity: Record<string, number> = {};
        const allItems = [
          ...(reservations || []),
          ...(directReservations || []),
          ...(ticketOrders || []),
          ...(redemptions || []),
        ];

        allItems.forEach((item) => {
          const day = new Date(item.created_at).toLocaleDateString("el-GR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          dayActivity[day] = (dayActivity[day] || 0) + 1;
        });

        const bestDay = Object.entries(dayActivity).sort((a, b) => b[1] - a[1])[0];

        // Build email content
        const emailContent = `
          <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 24px 0;">Γεια σου ${business.name}! 👋</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">Εδώ είναι η εβδομαδιαία σύνοψη της επιχείρησής σας:</p>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="color: #64748b; font-size: 14px;">📅 Κρατήσεις</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <strong style="color: #1e293b; font-size: 18px;">${totalReservations}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="color: #64748b; font-size: 14px;">🎫 Εισιτήρια</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <strong style="color: #1e293b; font-size: 18px;">${totalTickets}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="color: #64748b; font-size: 14px;">🎁 Εξαργυρώσεις Προσφορών</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <strong style="color: #1e293b; font-size: 18px;">${totalOfferRedemptions}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="color: #64748b; font-size: 14px;">📱 QR Check-ins</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                  <strong style="color: #1e293b; font-size: 18px;">${totalQRCheckins}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0;">
                  <span style="color: #64748b; font-size: 14px;">💰 Συνολικά Έσοδα</span>
                </td>
                <td style="padding: 12px 0; text-align: right;">
                  <strong style="color: #10b981; font-size: 18px;">€${(totalRevenue / 100).toFixed(2)}</strong>
                </td>
              </tr>
            </table>
          </div>

          ${bestDay ? `
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">🏆 Καλύτερη μέρα της εβδομάδας</p>
            <p style="color: #78350f; font-size: 18px; font-weight: 700; margin: 8px 0 0 0;">${bestDay[0]}</p>
            <p style="color: #92400e; font-size: 12px; margin: 4px 0 0 0;">${bestDay[1]} δραστηριότητες</p>
          </div>
          ` : ""}

          <div style="text-align: center; margin-top: 32px;">
            <a href="https://fomocy.lovable.app/dashboard-business/analytics" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Δείτε Αναλυτικά Στατιστικά
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">
            Για να απενεργοποιήσετε αυτές τις ειδοποιήσεις, μεταβείτε στις <a href="https://fomocy.lovable.app/dashboard-business/settings" style="color: #0ea5e9;">ρυθμίσεις</a>.
          </p>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "FOMO Cyprus <noreply@fomo.cy>",
          to: [profile.email],
          subject: `📊 Εβδομαδιαία Σύνοψη - ${business.name}`,
          html: wrapEmailContent(emailContent),
        });

        if (emailError) {
          logStep("Failed to send email", { businessId: business.id, error: emailError.message });
        } else {
          emailsSent++;
          logStep("Email sent successfully", { businessId: business.id, email: profile.email });
          
          // Also create in-app notification
          await createInAppNotification(
            supabase,
            business.user_id,
            business.id,
            totalReservations,
            totalTickets,
            totalOfferRedemptions,
            totalRevenue
          );
          
          // Send push notification to business owner
          const pushResult = await sendPushIfEnabled(business.user_id, {
            title: '📊 Εβδομαδιαία Σύνοψη',
            body: `Κρατήσεις: ${totalReservations} | Εισιτήρια: ${totalTickets} | €${(totalRevenue / 100).toFixed(2)}`,
            tag: `weekly-summary-${business.id}`,
            data: {
              url: '/dashboard-business/analytics',
              type: 'weekly_sales_summary',
              entityType: 'business',
              entityId: business.id,
            },
          }, supabase);
          logStep("Push notification sent", pushResult);
        }
      } catch (bizError: any) {
        logStep("Error processing business", { businessId: business.id, error: bizError.message });
      }
    }

    logStep("Weekly summary job completed", { emailsSent });

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("Error in weekly summary", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});