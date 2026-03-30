import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function deleteFromTable(supabase: any, table: string, column: string, value: string | string[], errors: string[]) {
  try {
    const query = Array.isArray(value)
      ? supabase.from(table).delete().in(column, value)
      : supabase.from(table).delete().eq(column, value)
    const { error } = await query
    if (error && !error.message.includes("does not exist") && !error.message.includes("relation") && !error.code?.includes("42P01")) {
      errors.push(`${table}: ${error.message}`)
      console.warn(`⚠️ ${table}: ${error.message}`)
    } else {
      console.log(`✅ ${table} cleaned`)
    }
  } catch (e) {
    errors.push(`${table}: ${e.message}`)
    console.warn(`⚠️ ${table} exception: ${e.message}`)
  }
}

async function deleteStorageFolder(supabase: any, bucket: string, path: string, errors: string[]) {
  try {
    const { data: files } = await supabase.storage.from(bucket).list(path)
    if (files && files.length > 0) {
      const paths = files.map((f: any) => `${path}/${f.name}`)
      await supabase.storage.from(bucket).remove(paths)
      console.log(`✅ Storage ${bucket}/${path} cleaned (${paths.length} files)`)
    }
  } catch (e) {
    // Storage bucket may not exist, that's fine
    console.log(`ℹ️ Storage ${bucket}/${path}: ${e.message}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    // Verify caller
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Check admin role
    const { data: hasRole } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" })
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { business_id, delete_owner_account } = await req.json()
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get business info for audit
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("name, city, user_id, created_at, category, logo_url, cover_url")
      .eq("id", business_id)
      .single()

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const errors: string[] = []
    const ownerId = business.user_id

    console.log(`🗑️ Starting FULL deletion of business "${business.name}" (${business_id}), owner: ${ownerId}`)

    // Save audit BEFORE deletion
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action_type: "delete_business_full",
      entity_type: "business",
      entity_id: business_id,
      old_value: { name: business.name, city: business.city, user_id: ownerId, created_at: business.created_at, category: business.category },
    })

    // ============ Collect IDs needed for cascade ============

    // Event IDs
    const { data: events } = await supabaseAdmin.from("events").select("id").eq("business_id", business_id)
    const eventIds = events?.map((e: any) => e.id) || []

    // Discount IDs
    const { data: discounts } = await supabaseAdmin.from("discounts").select("id").eq("business_id", business_id)
    const discountIds = discounts?.map((d: any) => d.id) || []

    // Production IDs
    const { data: productions } = await supabaseAdmin.from("productions").select("id").eq("business_id", business_id)
    const productionIds = productions?.map((p: any) => p.id) || []

    // Business post IDs
    const { data: posts } = await supabaseAdmin.from("business_posts").select("id").eq("business_id", business_id)
    const postIds = posts?.map((p: any) => p.id) || []

    // CRM guest IDs
    const { data: guests } = await supabaseAdmin.from("crm_guests").select("id").eq("business_id", business_id)
    const guestIds = guests?.map((g: any) => g.id) || []

    // Event boost IDs
    const { data: boosts } = await supabaseAdmin.from("event_boosts").select("id").eq("business_id", business_id)
    const boostIds = boosts?.map((b: any) => b.id) || []

    // Ticket order IDs (via events)
    let ticketOrderIds: string[] = []
    if (eventIds.length > 0) {
      const { data: orders } = await supabaseAdmin.from("ticket_orders").select("id").in("event_id", eventIds)
      ticketOrderIds = orders?.map((o: any) => o.id) || []
    }

    // Offer purchase IDs
    const { data: purchases } = await supabaseAdmin.from("offer_purchases").select("id").eq("business_id", business_id)
    const purchaseIds = purchases?.map((p: any) => p.id) || []

    // Reservation IDs (via events)
    let reservationIds: string[] = []
    if (eventIds.length > 0) {
      const { data: reservations } = await supabaseAdmin.from("reservations").select("id").in("event_id", eventIds)
      reservationIds = reservations?.map((r: any) => r.id) || []
    }

    // Show instance IDs (via productions)
    let showInstanceIds: string[] = []
    if (productionIds.length > 0) {
      const { data: instances } = await supabaseAdmin.from("show_instances").select("id").in("production_id", productionIds)
      showInstanceIds = instances?.map((i: any) => i.id) || []
    }

    // Reservation seating type IDs (via events)
    let seatingTypeIds: string[] = []
    if (eventIds.length > 0) {
      const { data: types } = await supabaseAdmin.from("reservation_seating_types").select("id").in("event_id", eventIds)
      seatingTypeIds = types?.map((t: any) => t.id) || []
    }

    // Venue IDs
    const { data: venues } = await supabaseAdmin.from("venues").select("id").eq("business_id", business_id)
    const venueIds = venues?.map((v: any) => v.id) || []

    let venueZoneIds: string[] = []
    if (venueIds.length > 0) {
      const { data: zones } = await supabaseAdmin.from("venue_zones").select("id").in("venue_id", venueIds)
      venueZoneIds = zones?.map((z: any) => z.id) || []
    }

    console.log(`📊 Found: ${eventIds.length} events, ${discountIds.length} discounts, ${productionIds.length} productions, ${postIds.length} posts, ${guestIds.length} CRM guests`)

    // ============ LEVEL 1: Tickets & derivatives ============
    console.log("🔥 Level 1: Tickets")
    if (ticketOrderIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "tickets", "order_id", ticketOrderIds, errors)
      await deleteFromTable(supabaseAdmin, "commission_ledger", "ticket_order_id", ticketOrderIds, errors)
    }
    if (eventIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "ticket_orders", "event_id", eventIds, errors)
      await deleteFromTable(supabaseAdmin, "ticket_tiers", "event_id", eventIds, errors)
      await deleteFromTable(supabaseAdmin, "ticket_commission_rates", "event_id", eventIds, errors)
    }

    // ============ LEVEL 2: Reservations & derivatives ============
    console.log("🔥 Level 2: Reservations")
    if (reservationIds.length > 0) {
      for (const table of ["reservation_guests", "reservation_scans", "reservation_table_assignments", "reservation_zone_assignments"]) {
        await deleteFromTable(supabaseAdmin, table, "reservation_id", reservationIds, errors)
      }
    }
    if (eventIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "reservation_no_shows", "event_id", eventIds, errors)
      await deleteFromTable(supabaseAdmin, "reservation_slot_closures", "event_id", eventIds, errors)
      await deleteFromTable(supabaseAdmin, "reservations", "event_id", eventIds, errors)
    }

    // ============ LEVEL 3: Events & derivatives ============
    console.log("🔥 Level 3: Events")
    if (boostIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "boost_analytics", "boost_id", boostIds, errors)
    }
    await deleteFromTable(supabaseAdmin, "event_boosts", "business_id", business_id, errors)
    if (eventIds.length > 0) {
      for (const table of ["event_views", "rsvps", "free_entry_reports"]) {
        await deleteFromTable(supabaseAdmin, table, "event_id", eventIds, errors)
      }
      // Favorites referencing events
      await deleteFromTable(supabaseAdmin, "favorites", "event_id", eventIds, errors)
      // Seating type tiers
      if (seatingTypeIds.length > 0) {
        await deleteFromTable(supabaseAdmin, "seating_type_tiers", "seating_type_id", seatingTypeIds, errors)
      }
      await deleteFromTable(supabaseAdmin, "reservation_seating_types", "event_id", eventIds, errors)
    }
    await deleteFromTable(supabaseAdmin, "events", "business_id", business_id, errors)

    // ============ LEVEL 4: Productions & derivatives ============
    console.log("🔥 Level 4: Productions")
    if (showInstanceIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "show_zone_pricing", "show_instance_id", showInstanceIds, errors)
      await deleteFromTable(supabaseAdmin, "show_instance_seats", "show_instance_id", showInstanceIds, errors)
    }
    if (productionIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "show_instances", "production_id", productionIds, errors)
      await deleteFromTable(supabaseAdmin, "production_cast", "production_id", productionIds, errors)
    }
    await deleteFromTable(supabaseAdmin, "productions", "business_id", business_id, errors)

    // ============ LEVEL 5: Discounts/Offers & derivatives ============
    console.log("🔥 Level 5: Discounts/Offers")
    if (purchaseIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "offer_purchase_guests", "purchase_id", purchaseIds, errors)
      await deleteFromTable(supabaseAdmin, "credit_transactions", "purchase_id", purchaseIds, errors)
    }
    await deleteFromTable(supabaseAdmin, "offer_purchases", "business_id", business_id, errors)
    await deleteFromTable(supabaseAdmin, "offer_boosts", "business_id", business_id, errors)
    if (discountIds.length > 0) {
      for (const table of ["discount_scans", "discount_views", "discount_items", "redemptions", "commission_ledger"]) {
        await deleteFromTable(supabaseAdmin, table, "discount_id", discountIds, errors)
      }
      // Favorite discounts
      await deleteFromTable(supabaseAdmin, "favorite_discounts", "discount_id", discountIds, errors)
    }
    await deleteFromTable(supabaseAdmin, "discounts", "business_id", business_id, errors)

    // ============ LEVEL 6: Business Posts ============
    console.log("🔥 Level 6: Business Posts")
    if (postIds.length > 0) {
      for (const table of ["business_post_poll_votes", "business_post_likes", "business_post_views"]) {
        await deleteFromTable(supabaseAdmin, table, "post_id", postIds, errors)
      }
    }
    await deleteFromTable(supabaseAdmin, "business_posts", "business_id", business_id, errors)

    // ============ LEVEL 7: CRM ============
    console.log("🔥 Level 7: CRM")
    if (guestIds.length > 0) {
      for (const table of ["crm_guest_tag_assignments", "crm_guest_notes", "crm_communication_log"]) {
        await deleteFromTable(supabaseAdmin, table, "guest_id", guestIds, errors)
      }
    }
    await deleteFromTable(supabaseAdmin, "crm_guests", "business_id", business_id, errors)
    await deleteFromTable(supabaseAdmin, "crm_guest_tags", "business_id", business_id, errors)

    // ============ LEVEL 8: Floor Plans ============
    console.log("🔥 Level 8: Floor Plans")
    await deleteFromTable(supabaseAdmin, "floor_plan_tables", "business_id", business_id, errors)
    await deleteFromTable(supabaseAdmin, "floor_plan_rooms", "business_id", business_id, errors)
    await deleteFromTable(supabaseAdmin, "floor_plan_zones", "business_id", business_id, errors)

    // ============ LEVEL 9: Venues ============
    console.log("🔥 Level 9: Venues")
    if (venueZoneIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "venue_seats", "zone_id", venueZoneIds, errors)
    }
    if (venueIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "venue_zones", "venue_id", venueIds, errors)
    }
    await deleteFromTable(supabaseAdmin, "venues", "business_id", business_id, errors)

    // ============ LEVEL 10: Remaining business-level tables ============
    console.log("🔥 Level 10: Business-level tables")
    const businessLevelTables = [
      "profile_boosts", "credit_transactions", "business_followers",
      "business_subscriptions", "business_subscription_plan_history",
      "beta_invite_codes", "daily_analytics", "engagement_events",
      "student_discount_redemptions", "student_discount_partners",
      "student_redemptions", "student_subsidy_invoices",
      "payment_invoices", "posts", "offline_scan_results",
    ]
    for (const table of businessLevelTables) {
      await deleteFromTable(supabaseAdmin, table, "business_id", business_id, errors)
    }

    // ============ LEVEL 11: Notifications & Featured Content ============
    console.log("🔥 Level 11: Notifications & Featured Content")
    // Notifications for the business owner
    await deleteFromTable(supabaseAdmin, "notifications", "user_id", ownerId, errors)
    // Featured content referencing this business
    await deleteFromTable(supabaseAdmin, "featured_content", "entity_id", business_id, errors)
    // Also clean featured content for events and discounts
    if (eventIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "featured_content", "entity_id", eventIds, errors)
    }
    if (discountIds.length > 0) {
      await deleteFromTable(supabaseAdmin, "featured_content", "entity_id", discountIds, errors)
    }

    // ============ LEVEL 12: Storage ============
    console.log("🔥 Level 12: Storage cleanup")
    await deleteStorageFolder(supabaseAdmin, "business-logos", business_id, errors)
    await deleteStorageFolder(supabaseAdmin, "business-covers", business_id, errors)
    await deleteStorageFolder(supabaseAdmin, "floor-plans", business_id, errors)
    await deleteStorageFolder(supabaseAdmin, "floor-plan-references", business_id, errors)
    for (const eid of eventIds) {
      await deleteStorageFolder(supabaseAdmin, "event-covers", eid, errors)
    }
    for (const did of discountIds) {
      await deleteStorageFolder(supabaseAdmin, "offer-images", did, errors)
    }

    // ============ Delete the business itself ============
    console.log("🔥 Deleting business record")
    const { error: deleteError } = await supabaseAdmin.from("businesses").delete().eq("id", business_id)
    if (deleteError) {
      return new Response(JSON.stringify({ error: `Failed to delete business: ${deleteError.message}`, partial_errors: errors }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ============ LEVEL 13: Owner account (if requested) ============
    if (delete_owner_account !== false) {
      console.log("🔥 Level 13: Deleting owner account")
      // Delete owner's profile and related user data
      await deleteFromTable(supabaseAdmin, "user_roles", "user_id", ownerId, errors)
      await deleteFromTable(supabaseAdmin, "push_subscriptions", "user_id", ownerId, errors)
      await deleteFromTable(supabaseAdmin, "user_preferences", "user_id", ownerId, errors)
      await deleteFromTable(supabaseAdmin, "favorites", "user_id", ownerId, errors)
      await deleteFromTable(supabaseAdmin, "favorite_discounts", "user_id", ownerId, errors)
      await deleteFromTable(supabaseAdmin, "rsvps", "user_id", ownerId, errors)
      await deleteFromTable(supabaseAdmin, "profiles", "id", ownerId, errors)

      // Delete auth user
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(ownerId)
      if (authDeleteError) {
        errors.push(`auth.users: ${authDeleteError.message}`)
        console.warn(`⚠️ Failed to delete auth user: ${authDeleteError.message}`)
      } else {
        console.log("✅ Auth user deleted")
      }
    }

    console.log(`✅ Business "${business.name}" fully deleted. Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        name: business.name,
        owner_deleted: delete_owner_account !== false,
        warnings: errors.length > 0 ? errors : undefined,
      }),
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
