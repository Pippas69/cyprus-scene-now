import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[PROCESS-OFFER-PAYMENT] ${step}`, details ? JSON.stringify(details) : "");
};

// Generate a secure QR token
const generateQRToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Create client with anon key for user auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { purchaseId } = await req.json();
    if (!purchaseId) throw new Error("Purchase ID is required");

    // Fetch the purchase record with discount and business info
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("offer_purchases")
      .select(`
        *,
        discounts:discount_id (
          title,
          terms,
          business_id,
          offer_type,
          bonus_percent,
          credit_amount_cents,
          businesses:business_id (
            name,
            logo_url
          )
        )
      `)
      .eq("id", purchaseId)
      .eq("user_id", user.id)
      .single();

    if (purchaseError || !purchase) {
      throw new Error("Purchase not found");
    }

    if (purchase.status === "paid") {
      // Already processed, return existing data
      return new Response(JSON.stringify({ 
        success: true, 
        qrToken: purchase.qr_code_token,
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (purchase.status !== "pending") {
      throw new Error(`Cannot process purchase with status: ${purchase.status}`);
    }

    // Verify payment with Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    if (!purchase.stripe_checkout_session_id) {
      throw new Error("No checkout session found for this purchase");
    }

    const session = await stripe.checkout.sessions.retrieve(purchase.stripe_checkout_session_id);
    
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }
    logStep("Payment verified", { sessionId: session.id, paymentStatus: session.payment_status });

    // Generate unique QR code token
    const qrCodeToken = generateQRToken();

    // Check if this is a credit offer
    const discount = purchase.discounts;
    const isCredit = discount?.offer_type === 'credit';
    const initialBalance = isCredit && discount?.credit_amount_cents && discount?.bonus_percent !== null
      ? Math.round(discount.credit_amount_cents * (1 + (discount.bonus_percent || 0) / 100))
      : 0;

    // Update purchase record to paid status
    const updateData: Record<string, unknown> = {
      status: "paid",
      qr_code_token: qrCodeToken,
      stripe_payment_intent_id: session.payment_intent as string,
    };

    // Set initial balance for credit offers
    if (isCredit) {
      updateData.balance_remaining_cents = initialBalance;
    }

    const { error: updateError } = await supabaseAdmin
      .from("offer_purchases")
      .update(updateData)
      .eq("id", purchaseId);

    if (updateError) {
      throw new Error(`Failed to update purchase: ${updateError.message}`);
    }
    logStep("Purchase updated to paid", { purchaseId, qrCodeToken, isCredit, initialBalance });

    // Increment total_purchased on discounts table
    const { error: incrementError } = await supabaseAdmin.rpc("increment_discount_purchased", {
      discount_id: purchase.discount_id,
    });

    // If RPC doesn't exist, do manual update
    if (incrementError) {
      await supabaseAdmin
        .from("discounts")
        .update({ total_purchased: (await supabaseAdmin.from("discounts").select("total_purchased").eq("id", purchase.discount_id).single()).data?.total_purchased + 1 || 1 })
        .eq("id", purchase.discount_id);
    }
    logStep("Discount purchase count incremented");

    // Create initial credit transaction for credit offers
    if (isCredit && initialBalance > 0) {
      const { error: txnError } = await supabaseAdmin
        .from("credit_transactions")
        .insert({
          purchase_id: purchaseId,
          business_id: purchase.business_id,
          amount_cents: initialBalance,
          transaction_type: "purchase",
          balance_before_cents: 0,
          balance_after_cents: initialBalance,
          notes: `Initial credit purchase: €${(initialBalance / 100).toFixed(2)}`,
        });

      if (txnError) {
        logStep("Credit transaction error (non-fatal)", { error: txnError.message });
      } else {
        logStep("Initial credit transaction created", { initialBalance });
      }
    }

    // COMMISSION DISABLED: All offers are commission-free
    logStep("Commission ledger skipped - all offers are commission-free");

    // Fetch user profile for email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, name, email")
      .eq("id", user.id)
      .single();

    // Send confirmation email with QR code
    const business = discount?.businesses;
    
    if (user.email && discount && business) {
      try {
        const emailPayload = {
          purchaseId: purchase.id,
          userEmail: user.email,
          userName: profile?.first_name || profile?.name || undefined,
          offerTitle: discount.title,
          offerTerms: discount.terms || undefined,
          businessName: business.name,
          businessLogo: business.logo_url || undefined,
          originalPriceCents: purchase.original_price_cents,
          finalPriceCents: purchase.final_price_cents,
          discountPercent: purchase.discount_percent,
          expiresAt: purchase.expires_at,
          qrCodeToken: qrCodeToken,
        };

        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-offer-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(emailPayload),
          }
        );

        if (emailResponse.ok) {
          logStep("Confirmation email sent successfully");
        } else {
          const errorText = await emailResponse.text();
          logStep("Email sending failed (non-fatal)", { error: errorText });
        }
      } catch (emailError) {
        logStep("Email sending error (non-fatal)", { error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      qrToken: qrCodeToken,
      purchaseId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
