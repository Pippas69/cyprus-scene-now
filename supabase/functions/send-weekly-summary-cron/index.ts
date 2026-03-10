// Cron job: Send weekly summary email to businesses every Monday at 9am Cyprus time
// Summarizes: reservations, tickets, offers, QR check-ins, best day of visits
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { getEmailForUserId } from "../_shared/user-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[WEEKLY-SUMMARY-CRON] ${step}`, details ? JSON.stringify(details) : '');
};

// Day names in Greek
const dayNamesEl: Record<number, string> = {
  0: 'Κυριακή',
  1: 'Δευτέρα',
  2: 'Τρίτη',
  3: 'Τετάρτη',
  4: 'Πέμπτη',
  5: 'Παρασκευή',
  6: 'Σάββατο',
};

// Email template
const NO_OFFERS_CATEGORIES = ['clubs', 'events', 'theatre', 'music', 'dance', 'kids'];

const buildWeeklySummaryEmail = (
  businessName: string,
  stats: {
    reservations: number;
    tickets: number;
    offers: number;
    qrCheckins: number;
    bestDay: string;
    weekStart: string;
    weekEnd: string;
    hideOffers: boolean;
  }
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 20px; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="color: #0d3b66; margin: 0 0 8px 0; font-size: 22px;">Εβδομαδιαία Σύνοψη 📊</h2>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 14px;">
        ${stats.weekStart} - ${stats.weekEnd}
      </p>
      
      <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
        Αγαπητέ/ή <strong>${businessName}</strong>,<br>
        Ακολουθεί η σύνοψη της εβδομάδας σας:
      </p>
      
      <!-- Stats Grid -->
      <div style="display: flex; flex-wrap: wrap; gap: 16px; margin: 24px 0;">
        <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #0d3b66;">${stats.reservations}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Κρατήσεις</div>
        </div>
        <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #0d3b66;">${stats.tickets}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Εισιτήρια</div>
        </div>
        ${!stats.hideOffers ? `
        <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #0d3b66;">${stats.offers}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Προσφορές</div>
        </div>
        ` : ''}
        <div style="flex: 1; min-width: 120px; background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #0d3b66;">${stats.qrCheckins}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">QR Check-ins</div>
        </div>
      </div>
      
      <!-- Best Day -->
      <div style="background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="font-size: 12px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Καλύτερη Μέρα Επισκέψεων</div>
        <div style="font-size: 24px; font-weight: bold; color: #ffffff; margin-top: 8px;">${stats.bestDay}</div>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://fomo.com.cy/dashboard-business" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Δείτε Αναλυτικά
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
      <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0; font-family: 'Cinzel', Georgia, serif;">ΦΟΜΟ</p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 ΦΟΜΟ. Discover events in Cyprus.</p>
    </div>
  </div>
</body>
</html>
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Weekly summary cron started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate last week's date range (Monday to Sunday)
    const now = new Date();
    const cyprusOffset = 3; // EET/EEST approximation
    now.setHours(now.getHours() + cyprusOffset);
    
    // Get last Monday
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - now.getDay() - 6);
    lastMonday.setHours(0, 0, 0, 0);
    
    // Get last Sunday
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const weekStart = lastMonday.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
    const weekEnd = lastSunday.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });

    logStep("Date range", { 
      lastMonday: lastMonday.toISOString(), 
      lastSunday: lastSunday.toISOString() 
    });

    // Get all businesses with weekly summary enabled
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, user_id, category');

    if (bizError) {
      throw new Error(`Failed to fetch businesses: ${bizError.message}`);
    }

    let sentCount = 0;
    let skippedCount = 0;

    for (const business of businesses || []) {
      try {
        // Check if user has weekly summary enabled
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('notification_weekly_summary')
          .eq('user_id', business.user_id)
          .single();

        if (prefs?.notification_weekly_summary === false) {
          skippedCount++;
          continue;
        }

        // Get reservations count
        const { count: reservationsCount } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .gte('created_at', lastMonday.toISOString())
          .lte('created_at', lastSunday.toISOString());

        // Get tickets count
        const { count: ticketsCount } = await supabase
          .from('ticket_purchases')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('status', 'paid')
          .gte('created_at', lastMonday.toISOString())
          .lte('created_at', lastSunday.toISOString());

        // Get offers count (claims/purchases)
        const { count: offersCount } = await supabase
          .from('offer_purchases')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .in('status', ['paid', 'redeemed'])
          .gte('created_at', lastMonday.toISOString())
          .lte('created_at', lastSunday.toISOString());

        // Get QR check-ins count
        const { count: qrCheckinsCount } = await supabase
          .from('redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .gte('redeemed_at', lastMonday.toISOString())
          .lte('redeemed_at', lastSunday.toISOString());

        // Calculate best day based on reservations + ticket purchases
        const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

        const { data: weekReservations } = await supabase
          .from('reservations')
          .select('created_at')
          .eq('business_id', business.id)
          .gte('created_at', lastMonday.toISOString())
          .lte('created_at', lastSunday.toISOString());

        for (const r of weekReservations || []) {
          const day = new Date(r.created_at).getDay();
          dayCounts[day]++;
        }

        const { data: weekTickets } = await supabase
          .from('ticket_purchases')
          .select('created_at')
          .eq('business_id', business.id)
          .eq('status', 'paid')
          .gte('created_at', lastMonday.toISOString())
          .lte('created_at', lastSunday.toISOString());

        for (const t of weekTickets || []) {
          const day = new Date(t.created_at).getDay();
          dayCounts[day]++;
        }

        // Find best day
        let bestDayNum = 1; // Default Monday
        let maxCount = 0;
        for (const [day, count] of Object.entries(dayCounts)) {
          if (count > maxCount) {
            maxCount = count;
            bestDayNum = parseInt(day);
          }
        }
        const bestDay = maxCount > 0 ? dayNamesEl[bestDayNum] : 'Δεν υπάρχουν δεδομένα';

        // Get user email
        const email = await getEmailForUserId(supabase, business.user_id);
        if (!email) {
          logStep("No email found for business", { businessId: business.id });
          continue;
        }

        const bizCategories = (business.category || []).map((c: string) => c.toLowerCase());
        const hideOffers = bizCategories.some((c: string) => NO_OFFERS_CATEGORIES.includes(c));

        // Send email
        const emailHtml = buildWeeklySummaryEmail(business.name, {
          reservations: reservationsCount || 0,
          tickets: ticketsCount || 0,
          offers: hideOffers ? 0 : (offersCount || 0),
          qrCheckins: qrCheckinsCount || 0,
          bestDay,
          weekStart,
          weekEnd,
          hideOffers,
        });

        await resend.emails.send({
          from: "ΦΟΜΟ <support@fomo.com.cy>",
          to: [email],
          subject: `📊 Εβδομαδιαία Σύνοψη - ${business.name}`,
          html: emailHtml,
        });

        sentCount++;
        logStep("Email sent", { businessId: business.id, email });

      } catch (err) {
        logStep("Error processing business", { 
          businessId: business.id, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }

    logStep("Cron completed", { sent: sentCount, skipped: skippedCount });

    return new Response(JSON.stringify({ 
      success: true, 
      sent: sentCount, 
      skipped: skippedCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
