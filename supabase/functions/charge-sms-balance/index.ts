// Φάση 6: Cron-driven SMS billing με υβριδική λογική.
//
// Λογική:
//  - mode=threshold (κάθε ώρα): χρεώνει επιχειρήσεις με unbilled >= €10
//  - mode=monthly   (1η μήνα 03:00): χρεώνει ΟΛΕΣ με unbilled > 0
//
// 3-Strike rule: μετά από 3 διαδοχικές αποτυχίες ⇒ pauses SMS sending +
// στέλνει email στον επιχειρηματία.
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

const THRESHOLD_CENTS = 1000; // €10
const MAX_FAILED_ATTEMPTS = 3;

const log = (s: string, d?: unknown) =>
  console.log(`[charge-sms-balance] ${s}${d ? " " + JSON.stringify(d) : ""}`);

async function sendOpsEmail(
  resend: any,
  to: string,
  subject: string,
  html: string,
) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: "FOMO <support@fomo.com.cy>",
      to: [to],
      subject,
      html,
    });
  } catch (e) {
    log("email send failed", { err: String(e) });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    if (!STRIPE_KEY) throw new Error("STRIPE_SECRET_KEY missing");

    const url = new URL(req.url);
    let mode = url.searchParams.get("mode") ?? "threshold";
    let bodyBusinessId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.mode) mode = body.mode;
        if (body?.business_id) bodyBusinessId = body.business_id;
      } catch {
        /* ignore */
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" });

    // Lazy resend
    let resend: any = null;
    if (RESEND_KEY) {
      const { Resend } = await import("npm:resend@2.0.0");
      resend = new Resend(RESEND_KEY);
    }

    // Find candidate businesses from actual unbilled charge rows
    const { data: rawCharges, error: balErr } = await admin
      .from("sms_charges")
      .select("id, business_id, cost_cents, status, billed_at")
      .eq("is_billable", true)
      .is("billed_at", null)
      .in("status", ["sent", "delivered"]);

    if (balErr) throw balErr;

    const byBusiness = new Map<string, { business_id: string; unbilled_cents: number; unbilled_count: number }>();
    for (const row of (rawCharges ?? []) as Array<any>) {
      const businessId = String(row.business_id);
      const existing = byBusiness.get(businessId) ?? { business_id: businessId, unbilled_cents: 0, unbilled_count: 0 };
      existing.unbilled_cents += Number(row.cost_cents ?? 0);
      existing.unbilled_count += 1;
      byBusiness.set(businessId, existing);
    }

    let candidates = Array.from(byBusiness.values());

    if (bodyBusinessId) {
      candidates = candidates.filter((c) => c.business_id === bodyBusinessId);
    } else if (mode === "threshold") {
      candidates = candidates.filter((c) => c.unbilled_cents >= THRESHOLD_CENTS);
    }

    log("Candidates", { mode, count: candidates.length });

    const results: any[] = [];

    for (const c of candidates) {
      const result: any = { business_id: c.business_id, amount_cents: c.unbilled_cents };
      try {
        // Get default active payment method
        const { data: pm } = await admin
          .from("business_payment_methods")
          .select("stripe_customer_id, stripe_payment_method_id")
          .eq("business_id", c.business_id)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get business info for emails / pause
        const { data: bizInfo } = await admin
          .from("businesses")
          .select("id, name, user_id, sms_sending_paused")
          .eq("id", c.business_id)
          .maybeSingle();

        const { data: ownerProfile } = bizInfo?.user_id
          ? await admin.from("profiles").select("email").eq("id", bizInfo.user_id).maybeSingle()
          : { data: null as any };
        const ownerEmail: string | null = ownerProfile?.email ?? null;

        if (!pm) {
          // No card: log a failed attempt + maybe pause if many tries
          await recordAttempt(admin, {
            business_id: c.business_id,
            amount_cents: c.unbilled_cents,
            sms_count: c.unbilled_count,
            status: "failed",
            trigger_type: mode === "monthly" ? "monthly" : (mode === "manual" ? "manual" : "threshold"),
            error_code: "no_payment_method",
            error_message: "No saved card on file",
          });
          // If no card and balance significant, send notice email (once per balance threshold)
          if (ownerEmail) {
            await sendOpsEmail(
              resend,
              ownerEmail,
              "Προσθέστε κάρτα για χρέωση SMS - FOMO",
              `<p>Γεια σας,</p><p>Η επιχείρησή σας <b>${escapeHtml(bizInfo?.name ?? "")}</b> έχει συσσωρευμένο υπόλοιπο €${(c.unbilled_cents/100).toFixed(2)} για SMS. Παρακαλούμε προσθέστε κάρτα στο dashboard στο <b>Billing & SMS</b> για να συνεχίσει η αποστολή.</p><p>— FOMO</p>`,
            );
          }
          // Maybe pause after several no-card cycles
          await maybePauseFromHistory(admin, c.business_id, ownerEmail, resend, bizInfo?.name);
          result.status = "failed";
          result.error = "no_payment_method";
          results.push(result);
          continue;
        }

        // Lock unbilled charge IDs first (to make idempotent)
        const { data: charges } = await admin
          .from("sms_charges")
          .select("id, cost_cents, num_segments")
          .eq("business_id", c.business_id)
          .eq("is_billable", true)
          .is("billed_at", null)
          .order("created_at", { ascending: true });

        const chargeIds = (charges ?? []).map((x: any) => x.id);
        const totalCents = (charges ?? []).reduce(
          (sum: number, x: any) => sum + Number(x.cost_cents ?? 0),
          0,
        );

        if (totalCents <= 0 || chargeIds.length === 0) {
          result.status = "skipped";
          results.push(result);
          continue;
        }

        // Idempotency key: unique per (business, max_charge_id) → safe across retries
        const idemKey = `sms-bill-${c.business_id}-${chargeIds[chargeIds.length - 1]}`;

        let pi: Stripe.PaymentIntent;
        try {
          pi = await stripe.paymentIntents.create(
            {
              amount: totalCents,
              currency: "eur",
              customer: pm.stripe_customer_id,
              payment_method: pm.stripe_payment_method_id,
              off_session: true,
              confirm: true,
              description: `FOMO SMS billing - ${chargeIds.length} SMS`,
              metadata: {
                business_id: c.business_id,
                purpose: "sms_billing",
                sms_count: String(chargeIds.length),
                trigger: mode,
              },
            },
            { idempotencyKey: idemKey },
          );
        } catch (stripeErr: any) {
          const errCode = stripeErr?.code ?? "stripe_error";
          const errMsg = stripeErr?.message ?? "Stripe charge failed";
          const attempt = await recordAttempt(admin, {
            business_id: c.business_id,
            amount_cents: totalCents,
            sms_count: chargeIds.length,
            status: "failed",
            trigger_type: mode === "monthly" ? "monthly" : (mode === "manual" ? "manual" : "threshold"),
            stripe_payment_method_id: pm.stripe_payment_method_id,
            error_code: errCode,
            error_message: errMsg,
          });
          // Email user
          if (ownerEmail) {
            await sendOpsEmail(
              resend,
              ownerEmail,
              "Αποτυχία χρέωσης κάρτας SMS - FOMO",
              `<p>Γεια σας,</p><p>Η χρέωση €${(totalCents/100).toFixed(2)} για ${chargeIds.length} SMS της επιχείρησης <b>${escapeHtml(bizInfo?.name ?? "")}</b> απέτυχε.</p><p>Λόγος: <code>${escapeHtml(errMsg)}</code></p><p>Παρακαλούμε ελέγξτε ή ενημερώστε την κάρτα σας στο dashboard (Billing & SMS). Θα ξαναπροσπαθήσουμε αυτόματα.</p><p>— FOMO</p>`,
            );
          }
          await maybePauseFromHistory(admin, c.business_id, ownerEmail, resend, bizInfo?.name);
          result.status = "failed";
          result.error = errMsg;
          result.attempt_id = attempt;
          results.push(result);
          continue;
        }

        if (pi.status === "succeeded") {
          const attempt = await recordAttempt(admin, {
            business_id: c.business_id,
            amount_cents: totalCents,
            sms_count: chargeIds.length,
            status: "success",
            trigger_type: mode === "monthly" ? "monthly" : (mode === "manual" ? "manual" : "threshold"),
            stripe_payment_intent_id: pi.id,
            stripe_payment_method_id: pm.stripe_payment_method_id,
          });
          // Mark sms_charges as billed
          await admin
            .from("sms_charges")
            .update({ billed_at: new Date().toISOString(), billing_attempt_id: attempt })
            .in("id", chargeIds);

          // Auto-unpause if was paused for payment_failed
          if (bizInfo?.sms_sending_paused) {
            await admin
              .from("businesses")
              .update({ sms_sending_paused: false, sms_paused_reason: null, sms_paused_at: null })
              .eq("id", c.business_id)
              .eq("sms_paused_reason", "payment_failed");
          }
          if (ownerEmail) {
            await sendOpsEmail(
              resend,
              ownerEmail,
              "Επιτυχής χρέωση SMS - FOMO",
              `<p>Γεια σας,</p><p>Χρεώθηκε επιτυχώς €${(totalCents/100).toFixed(2)} για ${chargeIds.length} SMS της επιχείρησης <b>${escapeHtml(bizInfo?.name ?? "")}</b>.</p><p>— FOMO</p>`,
            );
          }
          result.status = "success";
          result.payment_intent = pi.id;
          result.attempt_id = attempt;
        } else {
          await recordAttempt(admin, {
            business_id: c.business_id,
            amount_cents: totalCents,
            sms_count: chargeIds.length,
            status: "failed",
            trigger_type: mode === "monthly" ? "monthly" : (mode === "manual" ? "manual" : "threshold"),
            stripe_payment_intent_id: pi.id,
            stripe_payment_method_id: pm.stripe_payment_method_id,
            error_code: pi.status,
            error_message: `PaymentIntent in ${pi.status}`,
          });
          result.status = "failed";
          result.error = `pi_status_${pi.status}`;
        }
        results.push(result);
      } catch (innerErr: any) {
        log("Loop error", { biz: c.business_id, err: innerErr?.message });
        results.push({ business_id: c.business_id, status: "error", error: innerErr?.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, mode, processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log("FATAL", { msg: e?.message });
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function recordAttempt(
  admin: any,
  data: {
    business_id: string;
    amount_cents: number;
    sms_count: number;
    status: "success" | "failed";
    trigger_type: "threshold" | "monthly" | "manual";
    stripe_payment_intent_id?: string;
    stripe_payment_method_id?: string;
    error_code?: string;
    error_message?: string;
  },
): Promise<string | null> {
  // Determine attempt_number = consecutive failed attempts + 1 (only if failed)
  let attempt_number = 1;
  if (data.status === "failed") {
    const { count } = await admin
      .from("sms_billing_attempts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", data.business_id)
      .eq("status", "failed")
      .gt(
        "attempted_at",
        // Only count failures since last success (approx: last 30 days)
        new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      );
    attempt_number = (count ?? 0) + 1;
  }
  const { data: row, error } = await admin
    .from("sms_billing_attempts")
    .insert({ ...data, attempt_number })
    .select("id")
    .single();
  if (error) {
    console.error("[charge-sms-balance] recordAttempt err", error);
    return null;
  }
  return row?.id ?? null;
}

async function maybePauseFromHistory(
  admin: any,
  business_id: string,
  ownerEmail: string | null,
  resend: any,
  businessName: string | null | undefined,
) {
  // Count consecutive failures since last success
  const { data: lastSuccess } = await admin
    .from("sms_billing_attempts")
    .select("attempted_at")
    .eq("business_id", business_id)
    .eq("status", "success")
    .order("attempted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sinceTs = lastSuccess?.attempted_at ?? new Date(0).toISOString();

  const { count } = await admin
    .from("sms_billing_attempts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business_id)
    .eq("status", "failed")
    .gt("attempted_at", sinceTs);

  if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
    const { data: biz } = await admin
      .from("businesses")
      .select("sms_sending_paused")
      .eq("id", business_id)
      .maybeSingle();
    if (!biz?.sms_sending_paused) {
      await admin
        .from("businesses")
        .update({
          sms_sending_paused: true,
          sms_paused_reason: "payment_failed",
          sms_paused_at: new Date().toISOString(),
        })
        .eq("id", business_id);
      if (ownerEmail && resend) {
        await resend.emails.send({
          from: "FOMO <support@fomo.com.cy>",
          to: [ownerEmail],
          subject: "Παγώθηκε η αποστολή SMS - FOMO",
          html: `<p>Γεια σας,</p><p>Μετά από <b>3 αποτυχημένες προσπάθειες</b> χρέωσης της κάρτας σας, παγώσαμε προσωρινά την αποστολή SMS της επιχείρησης <b>${escapeHtml(businessName ?? "")}</b>.</p><p>Ο λογαριασμός σας λειτουργεί κανονικά (κρατήσεις, εισιτήρια, payouts) — μόνο τα SMS προς τους πελάτες σας είναι σε παύση.</p><p>Παρακαλούμε ενημερώστε την κάρτα σας στο dashboard (<b>Billing & SMS</b>). Με την επόμενη επιτυχημένη χρέωση η αποστολή SMS θα ενεργοποιηθεί αυτόματα.</p><p>— FOMO</p>`,
        });
      }
    }
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
