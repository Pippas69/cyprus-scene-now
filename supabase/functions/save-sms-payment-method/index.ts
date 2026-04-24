// Φάση 6: Μετά από επιτυχημένο SetupIntent, αποθηκεύει το payment method
// στη βάση και το ορίζει ως default για τη χρέωση SMS.
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) =>
  console.log(`[save-sms-payment-method] ${s}${d ? " " + JSON.stringify(d) : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { business_id, payment_method_id, customer_id } = await req.json();
    if (!business_id || !payment_method_id || !customer_id) {
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: biz } = await admin
      .from("businesses")
      .select("id, user_id")
      .eq("id", business_id)
      .maybeSingle();
    if (!biz || biz.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" });

    const pm = await stripe.paymentMethods.retrieve(payment_method_id);
    if (pm.customer !== customer_id) {
      // Attach
      await stripe.paymentMethods.attach(payment_method_id, { customer: customer_id });
    }
    // Set as customer default
    await stripe.customers.update(customer_id, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    // Deactivate old methods, then upsert
    await admin
      .from("business_payment_methods")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("business_id", business_id);

    const card = pm.card;
    const { error: upsertErr } = await admin
      .from("business_payment_methods")
      .upsert(
        {
          business_id,
          stripe_customer_id: customer_id,
          stripe_payment_method_id: payment_method_id,
          card_brand: card?.brand ?? null,
          card_last4: card?.last4 ?? null,
          card_exp_month: card?.exp_month ?? null,
          card_exp_year: card?.exp_year ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "business_id,stripe_payment_method_id" },
      );

    if (upsertErr) throw upsertErr;

    // If business was paused due to payment failure, auto-unpause
    const { data: bizFull } = await admin
      .from("businesses")
      .select("sms_sending_paused, sms_paused_reason")
      .eq("id", business_id)
      .maybeSingle();
    if (bizFull?.sms_sending_paused && bizFull.sms_paused_reason === "payment_failed") {
      await admin
        .from("businesses")
        .update({ sms_sending_paused: false, sms_paused_reason: null, sms_paused_at: null })
        .eq("id", business_id);
      log("Auto-unpaused SMS sending after card update", { business_id });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log("ERR", { msg: e?.message });
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
