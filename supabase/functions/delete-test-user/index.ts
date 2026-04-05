import { createClient } from "npm:@supabase/supabase-js@2"
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";
import { z, parseBody, flexId, safeString, optionalString, email, optionalEmail, phone, optionalPhone, positiveInt, nonNegativeInt, priceCents, language, dateString, urlString, optionalUrl, boolDefault, boostTier, durationMode, billingCycle, notificationEventType, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

// ONLY these emails can be deleted for testing purposes
const ALLOWED_TEST_EMAILS = new Set([
  "marinoskoumi04@gmail.com",
  "marinoskumi04@gmail.com",
  "myriapanayi80@gmail.com",
  "christoskoumi80@mail.com",
  "mklifts04@gmail.com",
])

const BodySchema = z.object({
  email: email,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders })
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "delete_test_user", 5, 10);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const { email: emailInput } = await parseBody(req, BodySchema)

    const normalizedEmail = email?.toLowerCase()

    if (!normalizedEmail || !ALLOWED_TEST_EMAILS.has(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Not allowed" }),
        { status: 403, headers: { ...securityHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Find user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const existingUser = users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser) {
      // Delete profile first (cascade should handle but be safe)
      await supabaseAdmin.from("profiles").delete().eq("id", existingUser.id)
      // Delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
      if (deleteError) throw deleteError
      console.log("Test user deleted:", normalizedEmail)
    }

    return new Response(
      JSON.stringify({ success: true, deleted: !!existingUser }),
      { status: 200, headers: { ...securityHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, securityHeaders);
    }
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...securityHeaders, "Content-Type": "application/json" } }
    )
  }
})