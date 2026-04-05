import { createClient } from "npm:@supabase/supabase-js@2";
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CLEANUP-STALE-DATA] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders });
  }

  try {
    logStep("Cleanup started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date().toISOString();
    const results = {
      abandoned_orders_expired: 0,
      expired_discounts_deactivated: 0,
      old_notifications_deleted: 0,
      old_notification_log_deleted: 0,
      errors: [] as string[],
    };

    // ============================================================
    // 1. Expire abandoned ticket orders (no Stripe session, >2h old)
    //    These are orders created but user never reached checkout
    // ============================================================
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // Use 'cancelled' since the ticket_order_status enum doesn't have 'expired'
      const { data: abandoned, error: abandonedError } = await supabase
        .from("ticket_orders")
        .update({ status: "cancelled" })
        .eq("status", "pending")
        .is("stripe_checkout_session_id", null)
        .lt("created_at", twoHoursAgo)
        .select("id");

      if (abandonedError) {
        results.errors.push(`Abandoned orders: ${abandonedError.message}`);
      } else {
        results.abandoned_orders_expired = abandoned?.length || 0;
        if (results.abandoned_orders_expired > 0) {
          logStep("Expired abandoned orders", { count: results.abandoned_orders_expired });
        }
      }
    } catch (e) {
      results.errors.push(`Abandoned orders: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ============================================================
    // 2. Deactivate expired discounts (end_at < now, still active)
    // ============================================================
    try {
      const { data: expiredDiscounts, error: discountError } = await supabase
        .from("discounts")
        .update({ active: false })
        .eq("active", true)
        .lt("end_at", now)
        .select("id");

      if (discountError) {
        results.errors.push(`Expired discounts: ${discountError.message}`);
      } else {
        results.expired_discounts_deactivated = expiredDiscounts?.length || 0;
        if (results.expired_discounts_deactivated > 0) {
          logStep("Deactivated expired discounts", { count: results.expired_discounts_deactivated });
        }
      }
    } catch (e) {
      results.errors.push(`Expired discounts: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ============================================================
    // 3. Delete old read notifications (>90 days)
    //    Keeps unread notifications indefinitely
    // ============================================================
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: oldNotifications, error: notifError } = await supabase
        .from("notifications")
        .delete()
        .eq("read", true)
        .lt("created_at", ninetyDaysAgo)
        .select("id");

      if (notifError) {
        results.errors.push(`Old notifications: ${notifError.message}`);
      } else {
        results.old_notifications_deleted = oldNotifications?.length || 0;
        if (results.old_notifications_deleted > 0) {
          logStep("Deleted old notifications", { count: results.old_notifications_deleted });
        }
      }
    } catch (e) {
      results.errors.push(`Old notifications: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ============================================================
    // 4. Delete old notification_log entries (>90 days)
    // ============================================================
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: oldLogs, error: logError } = await supabase
        .from("notification_log")
        .delete()
        .lt("created_at", ninetyDaysAgo)
        .select("id");

      if (logError) {
        results.errors.push(`Old notification logs: ${logError.message}`);
      } else {
        results.old_notification_log_deleted = oldLogs?.length || 0;
        if (results.old_notification_log_deleted > 0) {
          logStep("Deleted old notification logs", { count: results.old_notification_log_deleted });
        }
      }
    } catch (e) {
      results.errors.push(`Old notification logs: ${e instanceof Error ? e.message : String(e)}`);
    }

    logStep("Cleanup complete", results);

    return new Response(JSON.stringify({
      success: true,
      timestamp: now,
      ...results,
    }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...securityHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
