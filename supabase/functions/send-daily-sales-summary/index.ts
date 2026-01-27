import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[DAILY-SALES-SUMMARY] ${step}`, details ? JSON.stringify(details) : '');
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Daily sales summary job started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Calculate yesterday's date range (in UTC)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = yesterday.toISOString();
    const yesterdayEndStr = yesterdayEnd.toISOString();

    logStep("Date range", { yesterdayStart, yesterdayEnd: yesterdayEndStr });

    // Get all businesses with daily summary notifications enabled
    const { data: businessesWithNotifs, error: prefsError } = await supabaseClient
      .from("user_preferences")
      .select("user_id, notification_daily_sales_summary, email_notifications_enabled")
      .eq("notification_daily_sales_summary", true)
      .eq("email_notifications_enabled", true);

    if (prefsError) {
      throw new Error("Failed to fetch user preferences: " + prefsError.message);
    }

    logStep("Found users with daily summary enabled", { count: businessesWithNotifs?.length || 0 });

    if (!businessesWithNotifs || businessesWithNotifs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No users with daily summary enabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get business details for these users
    const userIds = businessesWithNotifs.map(p => p.user_id);
    const { data: businesses, error: businessError } = await supabaseClient
      .from("businesses")
      .select("id, name, user_id")
      .in("user_id", userIds);

    if (businessError) {
      throw new Error("Failed to fetch businesses: " + businessError.message);
    }

    logStep("Found businesses", { count: businesses?.length || 0 });

    let emailsSent = 0;

    for (const business of (businesses || [])) {
      try {
        // Get yesterday's ticket orders for this business
        const { data: orders, error: ordersError } = await supabaseClient
          .from("ticket_orders")
          .select(`
            id,
            total_cents,
            created_at,
            events!inner(
              id,
              title,
              business_id
            )
          `)
          .eq("events.business_id", business.id)
          .eq("status", "completed")
          .gte("created_at", yesterdayStart)
          .lte("created_at", yesterdayEndStr);

        if (ordersError) {
          logStep("Error fetching orders for business", { businessId: business.id, error: ordersError.message });
          continue;
        }

        // Skip if no sales yesterday
        if (!orders || orders.length === 0) {
          logStep("No sales yesterday for business", { businessId: business.id });
          continue;
        }

        // Get ticket counts
        const { data: tickets, error: ticketsError } = await supabaseClient
          .from("tickets")
          .select("id, order_id")
          .in("order_id", orders.map(o => o.id));

        const ticketCount = tickets?.length || 0;

        // Calculate totals
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
        const orderCount = orders.length;

        // Group by event
        const eventBreakdown: Record<string, { title: string; revenue: number; tickets: number }> = {};
        for (const order of orders) {
          const event = order.events as any;
          if (event) {
            if (!eventBreakdown[event.id]) {
              eventBreakdown[event.id] = { title: event.title, revenue: 0, tickets: 0 };
            }
            eventBreakdown[event.id].revenue += order.total_cents || 0;
          }
        }

        // Count tickets per event
        for (const ticket of (tickets || [])) {
          const order = orders.find(o => o.id === ticket.order_id);
          const event = order?.events as any;
          if (event && eventBreakdown[event.id]) {
            eventBreakdown[event.id].tickets++;
          }
        }

        // Get business owner's email
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email")
          .eq("id", business.user_id)
          .single();

        if (!profile?.email) {
          logStep("No email found for business owner", { businessId: business.id });
          continue;
        }

        const formattedRevenue = totalRevenue === 0 ? 'Free' : `€${(totalRevenue / 100).toFixed(2)}`;
        const yesterdayFormatted = yesterday.toLocaleDateString('el-GR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

        // Build event breakdown HTML
        const eventRows = Object.values(eventBreakdown)
          .sort((a, b) => b.revenue - a.revenue)
          .map(e => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${e.title}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${e.tickets}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #10b981; font-weight: 600;">€${(e.revenue / 100).toFixed(2)}</td>
            </tr>
          `).join('');

        const html = wrapEmailContent(`
          <h2 style="color: #0d3b66; margin: 0 0 8px 0; font-size: 24px; text-align: center;">
            📊 Ημερήσια Αναφορά Πωλήσεων
          </h2>
          <p style="color: #64748b; margin: 0 0 24px 0; text-align: center; font-size: 14px;">
            ${yesterdayFormatted}
          </p>

          <!-- Summary Cards -->
          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-radius: 12px; padding: 20px; text-align: center;">
              <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase;">Συνολικά Έσοδα</p>
              <p style="color: #10b981; margin: 0; font-size: 28px; font-weight: 700;">${formattedRevenue}</p>
            </div>
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">Εισιτήρια</p>
              <p style="color: #0d3b66; margin: 0; font-size: 24px; font-weight: 600;">${ticketCount}</p>
            </div>
            <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="color: #64748b; margin: 0 0 4px 0; font-size: 12px;">Παραγγελίες</p>
              <p style="color: #0d3b66; margin: 0; font-size: 24px; font-weight: 600;">${orderCount}</p>
            </div>
          </div>

          ${Object.keys(eventBreakdown).length > 0 ? `
            <h3 style="color: #0d3b66; margin: 24px 0 12px 0; font-size: 16px;">Ανά Εκδήλωση</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #475569;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 10px; text-align: left; font-weight: 600;">Εκδήλωση</th>
                  <th style="padding: 10px; text-align: center; font-weight: 600;">Εισιτήρια</th>
                  <th style="padding: 10px; text-align: right; font-weight: 600;">Έσοδα</th>
                </tr>
              </thead>
              <tbody>
                ${eventRows}
              </tbody>
            </table>
          ` : ''}

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://fomo.com.cy/dashboard-business/analytics" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Δείτε Αναλυτικά
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
            Για να απενεργοποιήσετε αυτές τις ειδοποιήσεις, μεταβείτε στις Ρυθμίσεις Λογαριασμού.
          </p>
        `);

        await resend.emails.send({
          from: "ΦΟΜΟ <noreply@fomo.cy>",
          to: [profile.email],
          subject: `📊 Ημερήσια Αναφορά: ${ticketCount} εισιτήρι${ticketCount > 1 ? 'α' : 'ο'} - ${formattedRevenue}`,
          html,
        });

        emailsSent++;
        logStep("Email sent to business", { businessId: business.id, ticketCount, totalRevenue });

        // Send push notification to business owner
        const pushResult = await sendPushIfEnabled(business.user_id, {
          title: '📊 Ημερήσια Αναφορά Πωλήσεων',
          body: `${ticketCount} εισιτήρι${ticketCount > 1 ? 'α' : 'ο'} - ${formattedRevenue}`,
          tag: `daily-sales-${business.id}`,
          data: {
            url: '/dashboard-business/analytics',
            type: 'daily_sales_summary',
            entityType: 'business',
            entityId: business.id,
          },
        }, supabaseClient);
        logStep("Push notification sent", pushResult);

      } catch (businessError: any) {
        logStep("Error processing business", { businessId: business.id, error: businessError.message });
      }
    }

    logStep("Daily summary job completed", { emailsSent });

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
