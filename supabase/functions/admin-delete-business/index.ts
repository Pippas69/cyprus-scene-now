import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Verify user from JWT
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Check admin role
    const { data: hasRole } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    })
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { business_id } = await req.json()
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get business info for audit
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("name, city, user_id")
      .eq("id", business_id)
      .single()

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Delete all related data in order (child tables first)
    const relatedTables = [
      "boost_analytics",       // references event_boosts
      "event_boosts",
      "offer_boosts",
      "profile_boosts",
      "ticket_orders",
      "credit_transactions",
      "offer_purchases",
      "commission_ledger",
      "discount_scans",
      "discount_views",
      "discount_items",
      "discounts",
      "reservation_no_shows",
      "reservation_slot_closures",
      "reservations",
      "rsvps",
      "event_views",
      "events",
      "business_post_poll_votes",
      "business_post_likes",
      "business_post_views",
      "business_posts",
      "posts",
      "productions",
      "business_followers",
      "business_subscriptions",
      "business_subscription_plan_history",
      "beta_invite_codes",
      "daily_analytics",
      "engagement_events",
      "crm_guest_tag_assignments",
      "crm_guest_notes",
      "crm_communication_log",
      "crm_guests",
      "crm_guest_tags",
      "floor_plan_tables",
      "floor_plan_rooms",
      "floor_plan_zones",
      "student_discount_redemptions",
      "student_discount_partners",
      "student_redemptions",
      "student_subsidy_invoices",
      "payment_invoices",
    ]

    const errors: string[] = []

    // For tables that reference events (not business directly), delete via event_ids first
    const { data: eventIds } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("business_id", business_id)

    const eventIdList = eventIds?.map(e => e.id) || []

    if (eventIdList.length > 0) {
      // Delete boost_analytics via event_boosts
      const { data: boostIds } = await supabaseAdmin
        .from("event_boosts")
        .select("id")
        .eq("business_id", business_id)
      
      if (boostIds && boostIds.length > 0) {
        await supabaseAdmin.from("boost_analytics").delete().in("boost_id", boostIds.map(b => b.id))
      }

      // Delete RSVPs, event_views, ticket_orders, reservations by event
      for (const table of ["rsvps", "ticket_orders", "reservations"]) {
        const { error } = await supabaseAdmin.from(table).delete().in("event_id", eventIdList)
        if (error) errors.push(`${table}: ${error.message}`)
      }
    }

    // Delete discount-related via discount_ids
    const { data: discountIds } = await supabaseAdmin
      .from("discounts")
      .select("id")
      .eq("business_id", business_id)

    const discountIdList = discountIds?.map(d => d.id) || []
    if (discountIdList.length > 0) {
      for (const table of ["discount_scans", "discount_views", "discount_items", "commission_ledger"]) {
        await supabaseAdmin.from(table).delete().in("discount_id", discountIdList)
      }
    }

    // Delete CRM guest related data
    const { data: guestIds } = await supabaseAdmin
      .from("crm_guests")
      .select("id")
      .eq("business_id", business_id)

    if (guestIds && guestIds.length > 0) {
      const guestIdList = guestIds.map(g => g.id)
      for (const table of ["crm_guest_tag_assignments", "crm_guest_notes", "crm_communication_log"]) {
        await supabaseAdmin.from(table).delete().in("guest_id", guestIdList)
      }
    }

    // Delete business_post related data
    const { data: postIds } = await supabaseAdmin
      .from("business_posts")
      .select("id")
      .eq("business_id", business_id)

    if (postIds && postIds.length > 0) {
      const postIdList = postIds.map(p => p.id)
      for (const table of ["business_post_poll_votes", "business_post_likes", "business_post_views"]) {
        await supabaseAdmin.from(table).delete().in("post_id", postIdList)
      }
    }

    // Now delete from business-level tables
    for (const table of relatedTables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("business_id", business_id)
      if (error && !error.message.includes("does not exist")) {
        errors.push(`${table}: ${error.message}`)
      }
    }

    // Finally delete the business itself
    const { error: deleteError } = await supabaseAdmin
      .from("businesses")
      .delete()
      .eq("id", business_id)

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message, partial_errors: errors }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Log audit
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action_type: "delete_business",
      entity_type: "business",
      entity_id: business_id,
      old_value: { name: business.name, city: business.city, user_id: business.user_id },
    })

    console.log(`Business deleted: ${business.name} (${business_id}) by admin ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, name: business.name, warnings: errors.length > 0 ? errors : undefined }),
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
