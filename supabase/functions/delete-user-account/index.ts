import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function d(supabase: any, table: string, col: string, val: string | string[]) {
  try {
    if (Array.isArray(val) && val.length === 0) return
    const q = Array.isArray(val)
      ? supabase.from(table).delete().in(col, val)
      : supabase.from(table).delete().eq(col, val)
    await q
  } catch (_) {}
}

async function delStorage(supabase: any, bucket: string, path: string) {
  try {
    const { data: files } = await supabase.storage.from(bucket).list(path)
    if (files?.length > 0) await supabase.storage.from(bucket).remove(files.map((f: any) => `${path}/${f.name}`))
  } catch (_) {}
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
    const userEmail = user.email
    console.log(`🗑️ Self-delete requested by ${userId}`)

    // Check if user owns a business
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle()

    if (business) {
      console.log(`📦 User owns business "${business.name}", performing full cascade`)
      await performBusinessCascade(supabaseAdmin, business.id, userId, userEmail)
    } else {
      console.log("👤 Regular user deletion")
      await performUserCascade(supabaseAdmin, userId, userEmail)
    }

    console.log(`✅ User ${userId} fully wiped`)
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

async function performUserCascade(supabase: any, userId: string, email: string | undefined) {
  // Get user's ticket orders first to clean tickets
  const { data: userOrders } = await supabase.from("ticket_orders").select("id").eq("user_id", userId)
  const userOrderIds = userOrders?.map((o: any) => o.id) || []
  if (userOrderIds.length > 0) {
    await d(supabase, "tickets", "order_id", userOrderIds)
  }

  // Get user's reservations for child cleanup
  const { data: userReservations } = await supabase.from("reservations").select("id").eq("user_id", userId)
  const userResIds = userReservations?.map((r: any) => r.id) || []
  if (userResIds.length > 0) {
    for (const t of ["reservation_guests", "reservation_scans", "reservation_table_assignments", "reservation_zone_assignments"]) {
      await d(supabase, t, "reservation_id", userResIds)
    }
  }

  // User-level tables with user_id column
  const userTables = [
    "notifications", "notification_log", "favorites", "favorite_discounts",
    "rsvps", "reservations", "ticket_orders", "offer_purchases",
    "push_subscriptions", "user_preferences", "user_roles",
    "business_followers", "discount_scans", "discount_views",
    "event_views", "business_post_likes", "business_post_poll_votes",
    "business_post_views", "post_reactions", "event_posts", "messages",
    "engagement_events", "reports", "student_verifications",
  ]
  for (const table of userTables) {
    await d(supabase, table, "user_id", userId)
  }

  // User connections (both directions)
  await d(supabase, "user_connections", "requester_id", userId)
  await d(supabase, "user_connections", "receiver_id", userId)

  // Conversations
  try {
    const { data: convos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId)
    if (convos && convos.length > 0) {
      const convIds = convos.map((c: any) => c.conversation_id)
      await d(supabase, "direct_messages", "conversation_id", convIds)
      await d(supabase, "conversation_participants", "conversation_id", convIds)
      await d(supabase, "conversations", "id", convIds)
    }
  } catch (_) {}

  // Email-based cleanup
  if (email) {
    await d(supabase, "suppressed_emails", "email", email)
    await d(supabase, "email_unsubscribe_tokens", "email", email)
  }

  // Profile & auth
  await supabase.from("profiles").delete().eq("id", userId)
  await supabase.auth.admin.deleteUser(userId)
}

async function performBusinessCascade(supabase: any, businessId: string, ownerId: string, ownerEmail: string | undefined) {
  // ============ Collect IDs ============
  const { data: events } = await supabase.from("events").select("id").eq("business_id", businessId)
  const eventIds = events?.map((e: any) => e.id) || []
  const { data: discounts } = await supabase.from("discounts").select("id").eq("business_id", businessId)
  const discountIds = discounts?.map((d2: any) => d2.id) || []
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

  const allEntityIds = [businessId, ...eventIds, ...discountIds, ...productionIds]
  const err: string[] = [] // Not critical for self-delete, but we log

  // Tickets
  if (ticketOrderIds.length > 0) { await d(supabase, "tickets", "order_id", ticketOrderIds); await d(supabase, "commission_ledger", "ticket_order_id", ticketOrderIds) }
  if (eventIds.length > 0) { await d(supabase, "tickets", "event_id", eventIds); await d(supabase, "ticket_orders", "event_id", eventIds); await d(supabase, "ticket_tiers", "event_id", eventIds); await d(supabase, "ticket_commission_rates", "event_id", eventIds) }

  // Reservations
  if (reservationIds.length > 0) { for (const t of ["reservation_guests","reservation_scans","reservation_table_assignments","reservation_zone_assignments"]) await d(supabase, t, "reservation_id", reservationIds) }
  if (eventIds.length > 0) { await d(supabase, "reservation_no_shows","event_id",eventIds); await d(supabase, "reservation_slot_closures","event_id",eventIds); await d(supabase, "reservations","event_id",eventIds) }

  // Events
  if (boostIds.length > 0) await d(supabase, "boost_analytics","boost_id",boostIds)
  await d(supabase, "event_boosts","business_id",businessId)
  if (eventIds.length > 0) { for (const t of ["event_views","event_posts","rsvps","free_entry_reports","messages","realtime_stats","favorites"]) await d(supabase, t,"event_id",eventIds) }
  if (seatingTypeIds.length > 0) await d(supabase, "seating_type_tiers","seating_type_id",seatingTypeIds)
  if (eventIds.length > 0) await d(supabase, "reservation_seating_types","event_id",eventIds)
  await d(supabase, "events","business_id",businessId)

  // Productions
  if (showInstanceIds.length > 0) { await d(supabase, "show_zone_pricing","show_instance_id",showInstanceIds); await d(supabase, "show_instance_seats","show_instance_id",showInstanceIds) }
  if (productionIds.length > 0) { await d(supabase, "show_instances","production_id",productionIds); await d(supabase, "production_cast","production_id",productionIds) }
  await d(supabase, "productions","business_id",businessId)

  // Discounts
  if (purchaseIds.length > 0) { await d(supabase, "offer_purchase_guests","purchase_id",purchaseIds); await d(supabase, "credit_transactions","purchase_id",purchaseIds) }
  await d(supabase, "offer_purchases","business_id",businessId); await d(supabase, "offer_boosts","business_id",businessId)
  if (discountIds.length > 0) { for (const t of ["discount_scans","discount_views","discount_items","redemptions","commission_ledger","favorite_discounts"]) await d(supabase, t,"discount_id",discountIds) }
  await d(supabase, "discounts","business_id",businessId)

  // Posts
  if (postIds.length > 0) { for (const t of ["business_post_poll_votes","business_post_likes","business_post_views","post_reactions"]) await d(supabase, t,"post_id",postIds) }
  await d(supabase, "business_posts","business_id",businessId)

  // CRM
  if (guestIds.length > 0) { for (const t of ["crm_guest_tag_assignments","crm_guest_notes","crm_communication_log"]) await d(supabase, t,"guest_id",guestIds) }
  await d(supabase, "crm_guests","business_id",businessId); await d(supabase, "crm_guest_tags","business_id",businessId)

  // Floor plans
  for (const t of ["floor_plan_tables","floor_plan_rooms","floor_plan_zones"]) await d(supabase, t,"business_id",businessId)

  // Venues
  if (venueZoneIds.length > 0) await d(supabase, "venue_seats","zone_id",venueZoneIds)
  if (venueIds.length > 0) await d(supabase, "venue_zones","venue_id",venueIds)
  await d(supabase, "venues","business_id",businessId)

  // Business-level
  for (const t of ["profile_boosts","credit_transactions","business_followers","business_subscriptions","business_subscription_plan_history","beta_invite_codes","daily_analytics","engagement_events","student_discount_redemptions","student_discount_partners","student_redemptions","student_subsidy_invoices","payment_invoices","posts","offline_scan_results"]) {
    await d(supabase, t,"business_id",businessId)
  }

  // Notifications, reports, featured
  await d(supabase, "notifications","user_id",ownerId)
  await d(supabase, "notification_log","user_id",ownerId)
  for (const eid of allEntityIds) { await d(supabase, "reports","entity_id",eid); await d(supabase, "featured","entity_id",eid); await d(supabase, "featured_content","entity_id",eid) }

  // Email cleanup
  if (ownerEmail) {
    await d(supabase, "suppressed_emails","email",ownerEmail)
    await d(supabase, "email_unsubscribe_tokens","email",ownerEmail)
  }

  // Storage
  for (const bucket of ["business-logos","business-covers","floor-plans","floor-plan-references"]) await delStorage(supabase, bucket, businessId)
  for (const eid of eventIds) await delStorage(supabase, "event-covers", eid)
  for (const did2 of discountIds) await delStorage(supabase, "offer-images", did2)

  // Delete business
  await supabase.from("businesses").delete().eq("id", businessId)

  // Owner account cleanup (conversations, user tables, profile, auth)
  try {
    const { data: convos } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", ownerId)
    if (convos && convos.length > 0) {
      const convIds = convos.map((c: any) => c.conversation_id)
      await d(supabase, "direct_messages","conversation_id",convIds)
      await d(supabase, "conversation_participants","conversation_id",convIds)
      await d(supabase, "conversations","id",convIds)
    }
  } catch (_) {}

  for (const t of ["user_roles","push_subscriptions","user_preferences","favorites","favorite_discounts","rsvps","event_views","business_post_likes","business_post_poll_votes","business_post_views","post_reactions","event_posts","messages","reports","notification_log","notifications","discount_scans","discount_views","engagement_events","student_verifications"]) {
    await d(supabase, t,"user_id",ownerId)
  }
  await d(supabase, "user_connections","requester_id",ownerId)
  await d(supabase, "user_connections","receiver_id",ownerId)

  await supabase.from("profiles").delete().eq("id", ownerId)
  await supabase.auth.admin.deleteUser(ownerId)
}
