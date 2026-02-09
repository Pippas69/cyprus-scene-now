// Edge function to send offer expiry reminders 2 hours before claimed offers expire
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { sendEncryptedPush } from "../_shared/web-push-crypto.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[OFFER-EXPIRY-REMINDERS] ${step}`, details ? JSON.stringify(details) : '');
};

// Email template parts
const emailHeader = `
  <div style="background: linear-gradient(180deg, #0d3b66 0%, #4ecdc4 100%); padding: 48px 24px 36px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 42px; font-weight: bold; letter-spacing: 4px;">ΦΟΜΟ</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Cyprus Events</p>
  </div>
`;

const emailFooter = `
  <div style="background: #102b4a; padding: 28px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #3ec3b7; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px 0;">ΦΟΜΟ</p>
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 ΦΟΜΟ. Discover events in Cyprus.</p>
  </div>
`;

const wrapEmailContent = (content: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

interface OfferReminder {
  userId: string;
  purchaseId: string;
  offerTitle: string;
  businessName: string;
  expiresAt: string;
  percentOff?: number;
  qrCodeToken: string;
  userEmail: string;
  userName: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursStart = new Date(twoHoursFromNow.getTime() - 15 * 60 * 1000);
    const twoHoursEnd = new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000);

    // Get claimed offers that expire in ~2 hours and haven't been redeemed yet
    const { data: expiringPurchases, error } = await supabase
      .from('offer_purchases')
      .select(`
        id,
        user_id,
        qr_code_token,
        expires_at,
        discounts!inner(
          id,
          title,
          percent_off,
          businesses!inner(id, name)
        )
      `)
      .eq('status', 'claimed')
      .eq('redeemed', false)
      .gte('expires_at', twoHoursStart.toISOString())
      .lte('expires_at', twoHoursEnd.toISOString());

    if (error) {
      throw new Error(`Failed to fetch expiring offers: ${error.message}`);
    }

    if (!expiringPurchases || expiringPurchases.length === 0) {
      logStep("No expiring offers to remind");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user IDs
    const userIds = [...new Set(expiringPurchases.map((p: any) => p.user_id))];

    // Get user profiles and preferences
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, name')
      .in('id', userIds);

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, email_notifications_enabled, notification_expiring_offers')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const prefMap = new Map(prefs?.map(p => [p.user_id, p]) || []);

    const remindersToSend: OfferReminder[] = [];

    expiringPurchases.forEach((p: any) => {
      const pref = prefMap.get(p.user_id);
      // Check if user has disabled offer expiry reminders
      if (pref?.notification_expiring_offers === false) return;
      if (pref?.email_notifications_enabled === false) return;

      const profile = profileMap.get(p.user_id);
      if (!profile?.email) return;

      remindersToSend.push({
        userId: p.user_id,
        purchaseId: p.id,
        offerTitle: p.discounts.title,
        businessName: p.discounts.businesses.name,
        expiresAt: p.expires_at,
        percentOff: p.discounts.percent_off,
        qrCodeToken: p.qr_code_token,
        userEmail: profile.email,
        userName: profile.first_name || profile.name || 'User',
      });
    });

    // Check notification_log for duplicates
    const { data: existingLogs } = await supabase
      .from('notification_log')
      .select('user_id, reference_id')
      .eq('notification_type', 'offer_expiry_reminder')
      .in('reference_id', remindersToSend.map(r => r.purchaseId));

    const loggedSet = new Set(existingLogs?.map(l => `${l.user_id}-${l.reference_id}`) || []);

    let sentCount = 0;

    for (const reminder of remindersToSend) {
      const logKey = `${reminder.userId}-${reminder.purchaseId}`;
      if (loggedSet.has(logKey)) continue;

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=M&data=${encodeURIComponent(reminder.qrCodeToken)}&bgcolor=ffffff&color=000000`;

      const emailHtml = wrapEmailContent(`
        <h2 style="color: #f59e0b; margin: 0 0 16px 0; font-size: 24px;">⚠️ Η προσφορά σου λήγει σε 2 ώρες!</h2>
        <p style="color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
          Γεια σου <strong>${reminder.userName}</strong>!<br><br>
          Μην ξεχάσεις! Η προσφορά σου λήγει <strong>σε 2 ώρες</strong>!
        </p>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 20px;">${reminder.offerTitle}</h3>
          <p style="color: #92400e; margin: 4px 0;">🏢 ${reminder.businessName}</p>
          ${reminder.percentOff ? `
            <div style="margin-top: 12px;">
              <span style="display: inline-block; background: #dc2626; color: white; padding: 6px 16px; border-radius: 6px; font-size: 18px; font-weight: bold;">
                -${reminder.percentOff}%
              </span>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <p style="color: #102b4a; font-weight: bold; margin: 0 0 12px 0;">Ο Κωδικός σου</p>
          <div style="background: #ffffff; border: 3px solid #f59e0b; border-radius: 16px; padding: 20px; display: inline-block;">
            <img src="${qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; display: block;" />
          </div>
        </div>

        <p style="color: #dc2626; font-weight: 600; text-align: center; font-size: 16px;">
          ⏰ Εξαργύρωσε την προσφορά πριν λήξει!
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://fomo.com.cy/dashboard-user/offers" style="display: inline-block; background: linear-gradient(135deg, #0d3b66 0%, #4ecdc4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
            Δες τις Προσφορές μου
          </a>
        </div>
      `);

      try {
        // Send email
        await resend.emails.send({
          from: "ΦΟΜΟ <offers@fomo.com.cy>",
          to: [reminder.userEmail],
          subject: `⚠️ Η προσφορά σου λήγει σε 2 ώρες! - ${reminder.offerTitle}`,
          html: emailHtml,
        });

        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: reminder.userId,
          title: '⚠️ Η προσφορά σου λήγει σύντομα!',
          message: `Η προσφορά "${reminder.offerTitle}" από ${reminder.businessName} λήγει σε 2 ώρες. Μην τη χάσεις!`,
          type: 'warning',
          event_type: 'offer_expiry_reminder',
          entity_type: 'offer_purchase',
          entity_id: reminder.purchaseId,
          deep_link: '/dashboard-user/offers',
          read: false,
        });

        // Send push notification (using encrypted push for iOS/Safari)
        const pushResult = await sendEncryptedPush(reminder.userId, {
          title: '⚠️ Η προσφορά σου λήγει!',
          body: `Η προσφορά "${reminder.offerTitle}" λήγει σε 2 ώρες!`,
          tag: `offer-expiry-${reminder.purchaseId}`,
          data: { url: '/dashboard-user/offers' },
        }, supabase);
        logStep('Push notification sent', { purchaseId: reminder.purchaseId, ...pushResult });

        // Log to prevent duplicates
        await supabase.from('notification_log').insert({
          user_id: reminder.userId,
          notification_type: 'offer_expiry_reminder',
          reference_id: reminder.purchaseId,
          reference_type: 'offer_purchase',
        });

        sentCount++;
      } catch (err) {
        logStep('Error sending reminder', { purchaseId: reminder.purchaseId, error: String(err) });
      }
    }

    logStep(`Sent ${sentCount} offer expiry reminders`);

    return new Response(JSON.stringify({ success: true, sent: sentCount, checked: remindersToSend.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep('ERROR', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
