import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ONLY these emails can be deleted for testing purposes
const ALLOWED_TEST_EMAILS = new Set([
  "marinoskoumi04@gmail.com",
  "marinoskumi04@gmail.com",
  "myriapanayi80@gmail.com",
])

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    const normalizedEmail = email?.toLowerCase()

    if (!normalizedEmail || !ALLOWED_TEST_EMAILS.has(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})