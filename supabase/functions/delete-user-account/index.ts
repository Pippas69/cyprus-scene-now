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

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const userId = user.id
    console.log(`🗑️ User ${userId} requesting self-deletion`)

    // Check if user owns a business
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle()

    if (business) {
      // Trigger full business deletion via admin-delete-business logic
      console.log(`📦 User owns business "${business.name}", invoking full cascade deletion`)

      const baseUrl = Deno.env.get("SUPABASE_URL")!
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

      const res = await fetch(`${baseUrl}/functions/v1/admin-delete-business`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_id: business.id,
          delete_owner_account: true,
        }),
      })

      // The admin-delete-business function checks for admin role, 
      // but for self-delete we need to handle it differently.
      // So we do the cascade here directly instead.
      if (!res.ok) {
        // Do the deletion ourselves since user is not admin
        console.log("Performing self-service cascade deletion")
        await performBusinessCascade(supabaseAdmin, business.id, userId)
      } else {
        const result = await res.json()
        if (result.error) {
          // admin function rejected (user is not admin), do it ourselves
          console.log("Admin function rejected, performing self-service deletion")
          await performBusinessCascade(supabaseAdmin, business.id, userId)
        } else {
          // Admin function handled everything including auth user deletion
          return new Response(JSON.stringify({ success: true }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
          })
        }
      }
    } else {
      // Regular user - clean up user data
      console.log("Regular user deletion")
      const tables = [
        "notifications", "favorites", "favorite_discounts", "rsvps",
        "reservations", "ticket_orders", "offer_purchases",
        "push_subscriptions", "user_preferences", "user_roles",
        "business_followers", "discount_scans", "discount_views",
        "event_views", "business_post_likes", "business_post_poll_votes",
        "business_post_views", "engagement_events",
      ]
      for (const table of tables) {
        try {
          await supabaseAdmin.from(table).delete().eq("user_id", userId)
        } catch (_) { /* table may not exist or column may differ */ }
      }

      // Conversation participants & messages
      try {
        const { data: convos } = await supabaseAdmin
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", userId)
        if (convos && convos.length > 0) {
          const convIds = convos.map((c: any) => c.conversation_id)
          await supabaseAdmin.from("direct_messages").delete().in("conversation_id", convIds)
          await supabaseAdmin.from("conversation_participants").delete().in("conversation_id", convIds)
          await supabaseAdmin.from("conversations").delete().in("id", convIds)
        }
      } catch (_) {}

      // Delete profile
      await supabaseAdmin.from("profiles").delete().eq("id", userId)

      // Delete auth user
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteErr) {
        console.error("Failed to delete auth user:", deleteErr)
        return new Response(JSON.stringify({ error: deleteErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    console.log(`✅ User ${userId} fully deleted`)
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})

async function performBusinessCascade(supabase: any, businessId: string, ownerId: string) {
  const del = async (table: string, col: string, val: string | string[]) => {
    try {
      const q = Array.isArray(val)
        ? supabase.from(table).delete().in(col, val)
        : supabase.from(table).delete().eq(col, val)
      await q
    } catch (_) {}
  }

  // Collect IDs
  const { data: events } = await supabase.from("events").select("id").eq("business_id", businessId)
  const eventIds = events?.map((e: any) => e.id) || []
  const { data: discounts } = await supabase.from("discounts").select("id").eq("business_id", businessId)
  const discountIds = discounts?.map((d: any) => d.id) || []
  const { data: productions } = await supabase.from("productions").select("id").eq("business_id", businessId)
  const productionIds = productions?.map((p: any) => p.id) || []
  const { data: posts } = await supabase.from("business_posts").select("id").eq("business_id", businessId)
  const postIds = posts?.map((p: any) => p.id) || []
  const { data: guests } = await supabase.from("crm_guests").select("id").eq("business_id", businessId)
  const guestIds = guests?.map((g: any) => g.id) || []
  const { data: boosts } = await supabase.from("event_boosts").select("id").eq("business_id", businessId)
  const boostIds = boosts?.map((b: any) => b.id) || []
  const { data: purchases } = await supabase.from("offer_purchases").select("id").eq("business_id", businessId)
  const purchaseIds = purchases?.map((p: any) => p.id) || []

  let ticketOrderIds: string[] = []
  if (eventIds.length > 0) {
    const { data: orders } = await supabase.from("ticket_orders").select("id").in("event_id", eventIds)
    ticketOrderIds = orders?.map((o: any) => o.id) || []
  }
  let reservationIds: string[] = []
  if (eventIds.length > 0) {
    const { data: res } = await supabase.from("reservations").select("id").in("event_id", eventIds)
    reservationIds = res?.map((r: any) => r.id) || []
  }
  let showInstanceIds: string[] = []
  if (productionIds.length > 0) {
    const { data: inst } = await supabase.from("show_instances").select("id").in("production_id", productionIds)
    showInstanceIds = inst?.map((i: any) => i.id) || []
  }
  let seatingTypeIds: string[] = []
  if (eventIds.length > 0) {
    const { data: st } = await supabase.from("reservation_seating_types").select("id").in("event_id", eventIds)
    seatingTypeIds = st?.map((t: any) => t.id) || []
  }
  const { data: venues } = await supabase.from("venues").select("id").eq("business_id", businessId)
  const venueIds = venues?.map((v: any) => v.id) || []
  let venueZoneIds: string[] = []
  if (venueIds.length > 0) {
    const { data: zones } = await supabase.from("venue_zones").select("id").in("venue_id", venueIds)
    venueZoneIds = zones?.map((z: any) => z.id) || []
  }

  // Tickets
  if (ticketOrderIds.length > 0) { await del("tickets", "order_id", ticketOrderIds); await del("commission_ledger", "ticket_order_id", ticketOrderIds) }
  if (eventIds.length > 0) { await del("ticket_orders", "event_id", eventIds); await del("ticket_tiers", "event_id", eventIds); await del("ticket_commission_rates", "event_id", eventIds) }

  // Reservations
  if (reservationIds.length > 0) { for (const t of ["reservation_guests","reservation_scans","reservation_table_assignments","reservation_zone_assignments"]) await del(t, "reservation_id", reservationIds) }
  if (eventIds.length > 0) { await del("reservation_no_shows","event_id",eventIds); await del("reservation_slot_closures","event_id",eventIds); await del("reservations","event_id",eventIds) }

  // Events
  if (boostIds.length > 0) await del("boost_analytics","boost_id",boostIds)
  await del("event_boosts","business_id",businessId)
  if (eventIds.length > 0) { for (const t of ["event_views","rsvps","free_entry_reports","favorites"]) await del(t,"event_id",eventIds) }
  if (seatingTypeIds.length > 0) await del("seating_type_tiers","seating_type_id",seatingTypeIds)
  if (eventIds.length > 0) await del("reservation_seating_types","event_id",eventIds)
  await del("events","business_id",businessId)

  // Productions
  if (showInstanceIds.length > 0) { await del("show_zone_pricing","show_instance_id",showInstanceIds); await del("show_instance_seats","show_instance_id",showInstanceIds) }
  if (productionIds.length > 0) { await del("show_instances","production_id",productionIds); await del("production_cast","production_id",productionIds) }
  await del("productions","business_id",businessId)

  // Discounts
  if (purchaseIds.length > 0) { await del("offer_purchase_guests","purchase_id",purchaseIds); await del("credit_transactions","purchase_id",purchaseIds) }
  await del("offer_purchases","business_id",businessId); await del("offer_boosts","business_id",businessId)
  if (discountIds.length > 0) { for (const t of ["discount_scans","discount_views","discount_items","redemptions","commission_ledger","favorite_discounts"]) await del(t,"discount_id",discountIds) }
  await del("discounts","business_id",businessId)

  // Posts
  if (postIds.length > 0) { for (const t of ["business_post_poll_votes","business_post_likes","business_post_views"]) await del(t,"post_id",postIds) }
  await del("business_posts","business_id",businessId)

  // CRM
  if (guestIds.length > 0) { for (const t of ["crm_guest_tag_assignments","crm_guest_notes","crm_communication_log"]) await del(t,"guest_id",guestIds) }
  await del("crm_guests","business_id",businessId); await del("crm_guest_tags","business_id",businessId)

  // Floor plans
  for (const t of ["floor_plan_tables","floor_plan_rooms","floor_plan_zones"]) await del(t,"business_id",businessId)

  // Venues
  if (venueZoneIds.length > 0) await del("venue_seats","zone_id",venueZoneIds)
  if (venueIds.length > 0) await del("venue_zones","venue_id",venueIds)
  await del("venues","business_id",businessId)

  // Business-level
  for (const t of ["profile_boosts","credit_transactions","business_followers","business_subscriptions","business_subscription_plan_history","beta_invite_codes","daily_analytics","engagement_events","student_discount_redemptions","student_discount_partners","student_redemptions","student_subsidy_invoices","payment_invoices","posts","offline_scan_results"]) {
    await del(t,"business_id",businessId)
  }

  // Notifications & featured
  await del("notifications","user_id",ownerId)
  await del("featured_content","entity_id",businessId)
  if (eventIds.length > 0) await del("featured_content","entity_id",eventIds)
  if (discountIds.length > 0) await del("featured_content","entity_id",discountIds)

  // Storage cleanup
  for (const bucket of ["business-logos","business-covers","floor-plans","floor-plan-references"]) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(businessId)
      if (files?.length > 0) await supabase.storage.from(bucket).remove(files.map((f:any) => `${businessId}/${f.name}`))
    } catch(_){}
  }
  for (const eid of eventIds) { try { const {data:f}=await supabase.storage.from("event-covers").list(eid); if(f?.length>0) await supabase.storage.from("event-covers").remove(f.map((x:any)=>`${eid}/${x.name}`)) } catch(_){} }
  for (const did of discountIds) { try { const {data:f}=await supabase.storage.from("offer-images").list(did); if(f?.length>0) await supabase.storage.from("offer-images").remove(f.map((x:any)=>`${did}/${x.name}`)) } catch(_){} }

  // Delete business
  await supabase.from("businesses").delete().eq("id", businessId)

  // Delete owner data
  for (const t of ["user_roles","push_subscriptions","user_preferences","favorites","favorite_discounts","rsvps"]) await del(t,"user_id",ownerId)
  await supabase.from("profiles").delete().eq("id", ownerId)
  await supabase.auth.admin.deleteUser(ownerId)
}
