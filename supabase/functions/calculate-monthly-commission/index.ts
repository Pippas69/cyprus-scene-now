import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-COMMISSION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Calculate period (last month)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1);

    logStep("Calculating commissions for period", {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString()
    });

    // Get all pending commission entries from last month
    const { data: commissions, error: fetchError } = await supabaseClient
      .from('commission_ledger')
      .select('*')
      .eq('status', 'pending')
      .gte('redeemed_at', periodStart.toISOString())
      .lt('redeemed_at', periodEnd.toISOString());

    if (fetchError) throw fetchError;

    if (!commissions || commissions.length === 0) {
      logStep("No pending commissions found");
      return new Response(JSON.stringify({ message: "No commissions to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found pending commissions", { count: commissions.length });

    // Group by business_id and calculate totals
    const businessTotals = new Map<string, number>();
    const commissionIds = new Map<string, string[]>();

    for (const commission of commissions) {
      const current = businessTotals.get(commission.business_id) || 0;
      businessTotals.set(commission.business_id, current + commission.commission_amount_cents);

      const ids = commissionIds.get(commission.business_id) || [];
      ids.push(commission.id);
      commissionIds.set(commission.business_id, ids);
    }

    logStep("Grouped commissions by business", { businessCount: businessTotals.size });

    // Create invoices for each business (only if >= €5)
    const MIN_INVOICE_AMOUNT_CENTS = 500; // €5

    for (const [businessId, totalCents] of businessTotals.entries()) {
      if (totalCents < MIN_INVOICE_AMOUNT_CENTS) {
        logStep("Skipping invoice for business (below minimum)", {
          businessId,
          amount: totalCents,
          minimum: MIN_INVOICE_AMOUNT_CENTS
        });
        continue;
      }

      // Create payment invoice
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from('payment_invoices')
        .insert({
          business_id: businessId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          commission_total_cents: totalCents,
          total_amount_cents: totalCents,
          status: 'pending',
          due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
        })
        .select()
        .single();

      if (invoiceError) {
        logStep("Error creating invoice", { businessId, error: invoiceError });
        continue;
      }

      logStep("Invoice created", { invoiceId: invoice.id, businessId, amount: totalCents });

      // Update commission entries to reference the invoice
      const ids = commissionIds.get(businessId) || [];
      const { error: updateError } = await supabaseClient
        .from('commission_ledger')
        .update({
          status: 'invoiced',
          invoice_id: invoice.id
        })
        .in('id', ids);

      if (updateError) {
        logStep("Error updating commission entries", { businessId, error: updateError });
      } else {
        logStep("Commission entries updated", { count: ids.length });
      }
    }

    logStep("Monthly commission calculation completed");

    return new Response(JSON.stringify({
      message: "Commission calculation completed",
      period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
      processed: commissions.length,
      invoicesCreated: Array.from(businessTotals.values()).filter(v => v >= MIN_INVOICE_AMOUNT_CENTS).length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in calculate-monthly-commission", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
