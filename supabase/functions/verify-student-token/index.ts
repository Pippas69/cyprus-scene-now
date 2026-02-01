import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[VERIFY-STUDENT-TOKEN] ${step}`, details ? JSON.stringify(details) : '');
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

    const { token } = await req.json();
    logStep("Verifying token", { token: token?.slice(0, 8) + '...' });

    if (!token) {
      throw new Error("Missing verification token");
    }

    // Find the verification record
    const { data: verification, error: fetchError } = await supabaseClient
      .from('student_verifications')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (fetchError || !verification) {
      logStep("Token not found", fetchError);
      return new Response(
        JSON.stringify({ error: "invalid_token", message: "Μη έγκυρος σύνδεσμος επαλήθευσης" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already verified
    if (verification.status === 'approved') {
      logStep("Already verified");
      return new Response(
        JSON.stringify({ success: true, already_verified: true, message: "Η φοιτητική σου ιδιότητα έχει ήδη επαληθευτεί!", university_name: verification.university_name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token expired
    if (verification.token_expires_at && new Date(verification.token_expires_at) < new Date()) {
      logStep("Token expired");
      return new Response(
        JSON.stringify({ error: "token_expired", message: "Ο σύνδεσμος έχει λήξει. Παρακαλώ ζήτησε νέο." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this university email is already verified by another user
    const { data: existingApproved, error: checkError } = await supabaseClient
      .from('student_verifications')
      .select('id, user_id')
      .eq('university_email', verification.university_email)
      .eq('status', 'approved')
      .neq('id', verification.id)
      .maybeSingle();

    if (checkError) {
      logStep("Error checking existing approvals", checkError);
    }

    if (existingApproved) {
      logStep("Email already verified by another user", { existingUserId: existingApproved.user_id });
      return new Response(
        JSON.stringify({ 
          error: "email_already_used", 
          message: "Αυτό το φοιτητικό email χρησιμοποιείται ήδη σε άλλο λογαριασμό. Κάθε φοιτητικό email μπορεί να χρησιμοποιηθεί μόνο μία φορά." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate QR token for the student
    const qrToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

    // Update verification to approved (auto-approval)
    const { error: updateVerificationError } = await supabaseClient
      .from('student_verifications')
      .update({
        status: 'approved',
        verified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        qr_code_token: qrToken,
        verification_token: null, // Clear the token after use
        token_expires_at: null,
      })
      .eq('id', verification.id);

    if (updateVerificationError) {
      logStep("Failed to update verification", updateVerificationError);
      
      // Check if it's a unique constraint violation (email already used)
      if (updateVerificationError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            error: "email_already_used", 
            message: "Αυτό το φοιτητικό email χρησιμοποιείται ήδη σε άλλο λογαριασμό. Κάθε φοιτητικό email μπορεί να χρησιμοποιηθεί μόνο μία φορά." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw updateVerificationError;
    }

    // Update user profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        is_student_verified: true,
        student_qr_token: qrToken,
      })
      .eq('id', verification.user_id);

    if (profileError) {
      logStep("Failed to update profile", profileError);
      throw profileError;
    }

    logStep("Verification successful", { userId: verification.user_id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Η φοιτητική σου ιδιότητα επαληθεύτηκε επιτυχώς! 🎉",
        university_name: verification.university_name
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Error", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: "Κάτι πήγε στραβά. Παρακαλώ δοκίμασε ξανά." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
