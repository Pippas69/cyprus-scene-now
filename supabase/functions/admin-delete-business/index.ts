import { createClient } from "npm:@supabase/supabase-js@2"
import { securityHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIP } from "../_shared/rate-limiter.ts";

async function del(supabase: any, table: string, column: string, value: string | string[], errors: string[]) {
  try {
    if (Array.isArray(value) && value.length === 0) return
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
  }
}

async function delStorage(supabase: any, bucket: string, path: string) {
  try {
    const { data: files } = await supabase.storage.from(bucket).list(path)
    if (files && files.length > 0) {
      await supabase.storage.from(bucket).remove(files.map((f: any) => `${path}/${f.name}`))
      console.log(`✅ Storage ${bucket}/${path} cleaned`)
    }
  } catch (_) {}
}

async function getOwnerEmail(supabase: any, ownerId: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.admin.getUserById(ownerId)
    return data?.user?.email || null
  } catch (_) { return null }
}

async function cleanConversations(supabase: any, userId: string, errors: string[]) {
  try {
    const { data: convos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId)
    if (convos && convos.length > 0) {
      const convIds = convos.map((c: any) => c.conversation_id)
      await del(supabase, "direct_messages", "conversation_id", convIds, errors)
      await del(supabase, "conversation_participants", "conversation_id", convIds, errors)
      await del(supabase, "conversations", "id", convIds, errors)
    }
  } catch (_) {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: securityHeaders })
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitId = (req.headers.get("Authorization") || clientIP).substring(0, 40) + ":" + clientIP;
    const rateCheck = await checkRateLimit(rateLimitId, "admin_delete_business", 5, 10);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...securityHeaders, "Content-Type": "application/json" }
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
        status: 401, headers: { ...securityHeaders, "Content-Type": "application/json" }
      })
    }

    // Check admin role
    const { data: hasRole } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" })
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...securityHeaders, "Content-Type": "application/json" }
      })
    }

    const { business_id, delete_owner_account } = await req.json()
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400, headers: { ...securityHeaders, "Content-Type": "application/json" }
      })
    }

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("name, city, user_id, created_at, category")
      .eq("id", business_id)
      .single()

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404, headers: { ...securityHeaders, "Content-Type": "application/json" }
      })
    }

    const errors: string[] = []
    const ownerId = business.user_id
    const ownerEmail = await getOwnerEmail(supabaseAdmin, ownerId)

    console.log(`🗑️ FULL WIPE: "${business.name}" (${business_id}), owner: ${ownerId}`)

    // Audit log BEFORE deletion
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action_type: "delete_business_full",
      entity_type: "business",
      entity_id: business_id,
      old_value: { name: business.name, city: business.city, user_id: ownerId, created_at: business.created_at, category: business.category },
    })

    // ============ Collect ALL IDs ============
    const { data: events } = await supabaseAdmin.from("events").select("id").eq("business_id", business_id)
    const eventIds = events?.map((e: any) => e.id) || []

    const { data: discounts } = await supabaseAdmin.from("discounts").select("id").eq("business_id", business_id)
    const discountIds = discounts?.map((d: any) => d.id) || []

    const { data: productions } = await supabaseAdmin.from("productions").select("id").eq("business_id", business_id)
    const productionIds = productions?.map((p: any) => p.id) || []

    const { data: posts } = await supabaseAdmin.from("business_posts").select("id").eq("business_id", business_id)
    const postIds = posts?.map((p: any) => p.id) || []

    const { data: guests } = await supabaseAdmin.from("crm_guests").select("id").eq("business_id", business_id)
    const guestIds = guests?.map((g: any) => g.id) || []

    const { data: boosts } = await supabaseAdmin.from("event_boosts").select("id").eq("business_id", business_id)
    const boostIds = boosts?.map((b: any) => b.id) || []

    const { data: purchases } = await supabaseAdmin.from("offer_purchases").select("id").eq("business_id", business_id)
    const purchaseIds = purchases?.map((p: any) => p.id) || []

    let ticketOrderIds: string[] = []
    if (eventIds.length > 0) {
      const { data: orders } = await supabaseAdmin.from("ticket_orders").select("id").in("event_id", eventIds)
      ticketOrderIds = orders?.map((o: any) => o.id) || []
    }

    let reservationIds: string[] = []
    if (eventIds.length > 0) {
      const { data: res } = await supabaseAdmin.from("reservations").select("id").in("event_id", eventIds)
      reservationIds = res?.map((r: any) => r.id) || []
    }

    let showInstanceIds: string[] = []
    if (productionIds.length > 0) {
      const { data: inst } = await supabaseAdmin.from("show_instances").select("id").in("production_id", productionIds)
      showInstanceIds = inst?.map((i: any) => i.id) || []
    }

    let seatingTypeIds: string[] = []
    if (eventIds.length > 0) {
      const { data: st } = await supabaseAdmin.from("reservation_seating_types").select("id").in("event_id", eventIds)
      seatingTypeIds = st?.map((t: any) => t.id) || []
    }

    const { data: venues } = await supabaseAdmin.from("venues").select("id").eq("business_id", business_id)
    const venueIds = venues?.map((v: any) => v.id) || []

    let venueZoneIds: string[] = []
    if (venueIds.length > 0) {
      const { data: zones } = await supabaseAdmin.from("venue_zones").select("id").in("venue_id", venueIds)
      venueZoneIds = zones?.map((z: any) => z.id) || []
    }

    // Collect ALL entity IDs for reports/featured cleanup
    const allEntityIds = [business_id, ...eventIds, ...discountIds, ...productionIds]

    console.log(`📊 ${eventIds.length} events, ${discountIds.length} discounts, ${productionIds.length} productions, ${postIds.length} posts, ${guestIds.length} CRM guests, ${ticketOrderIds.length} ticket orders, ${reservationIds.length} reservations`)

    // ============ LEVEL 1: Tickets ============
    console.log("🔥 L1: Tickets")
    if (ticketOrderIds.length > 0) {
      await del(supabaseAdmin, "tickets", "order_id", ticketOrderIds, errors)
      await del(supabaseAdmin, "commission_ledger", "ticket_order_id", ticketOrderIds, errors)
    }
    // Also delete tickets directly by event_id (manual entries, walk-ins)
    if (eventIds.length > 0) {
      await del(supabaseAdmin, "tickets", "event_id", eventIds, errors)
      await del(supabaseAdmin, "ticket_orders", "event_id", eventIds, errors)
      await del(supabaseAdmin, "ticket_tiers", "event_id", eventIds, errors)
      await del(supabaseAdmin, "ticket_commission_rates", "event_id", eventIds, errors)
    }

    // ============ LEVEL 2: Reservations ============
    console.log("🔥 L2: Reservations")
    if (reservationIds.length > 0) {
      for (const t of ["reservation_guests", "reservation_scans", "reservation_table_assignments", "reservation_zone_assignments"]) {
        await del(supabaseAdmin, t, "reservation_id", reservationIds, errors)
      }
    }
    if (eventIds.length > 0) {
      await del(supabaseAdmin, "reservation_no_shows", "event_id", eventIds, errors)
      await del(supabaseAdmin, "reservation_slot_closures", "event_id", eventIds, errors)
      await del(supabaseAdmin, "reservations", "event_id", eventIds, errors)
    }

    // ============ LEVEL 3: Events & derivatives ============
    console.log("🔥 L3: Events")
    if (boostIds.length > 0) await del(supabaseAdmin, "boost_analytics", "boost_id", boostIds, errors)
    await del(supabaseAdmin, "event_boosts", "business_id", business_id, errors)
    if (eventIds.length > 0) {
      for (const t of ["event_views", "event_posts", "rsvps", "free_entry_reports", "messages", "realtime_stats"]) {
        await del(supabaseAdmin, t, "event_id", eventIds, errors)
      }
      await del(supabaseAdmin, "favorites", "event_id", eventIds, errors)
      if (seatingTypeIds.length > 0) await del(supabaseAdmin, "seating_type_tiers", "seating_type_id", seatingTypeIds, errors)
      await del(supabaseAdmin, "reservation_seating_types", "event_id", eventIds, errors)
    }
    await del(supabaseAdmin, "events", "business_id", business_id, errors)

    // ============ LEVEL 4: Productions ============
    console.log("🔥 L4: Productions")
    if (showInstanceIds.length > 0) {
      await del(supabaseAdmin, "show_zone_pricing", "show_instance_id", showInstanceIds, errors)
      await del(supabaseAdmin, "show_instance_seats", "show_instance_id", showInstanceIds, errors)
    }
    if (productionIds.length > 0) {
      await del(supabaseAdmin, "show_instances", "production_id", productionIds, errors)
      await del(supabaseAdmin, "production_cast", "production_id", productionIds, errors)
    }
    await del(supabaseAdmin, "productions", "business_id", business_id, errors)

    // ============ LEVEL 5: Discounts/Offers ============
    console.log("🔥 L5: Discounts/Offers")
    if (purchaseIds.length > 0) {
      await del(supabaseAdmin, "offer_purchase_guests", "purchase_id", purchaseIds, errors)
      await del(supabaseAdmin, "credit_transactions", "purchase_id", purchaseIds, errors)
    }
    await del(supabaseAdmin, "offer_purchases", "business_id", business_id, errors)
    await del(supabaseAdmin, "offer_boosts", "business_id", business_id, errors)
    if (discountIds.length > 0) {
      for (const t of ["discount_scans", "discount_views", "discount_items", "redemptions", "commission_ledger", "favorite_discounts"]) {
        await del(supabaseAdmin, t, "discount_id", discountIds, errors)
      }
    }
    await del(supabaseAdmin, "discounts", "business_id", business_id, errors)

    // ============ LEVEL 6: Business Posts ============
    console.log("🔥 L6: Posts")
    if (postIds.length > 0) {
      for (const t of ["business_post_poll_votes", "business_post_likes", "business_post_views", "post_reactions"]) {
        await del(supabaseAdmin, t, "post_id", postIds, errors)
      }
    }
    await del(supabaseAdmin, "business_posts", "business_id", business_id, errors)

    // ============ LEVEL 7: CRM ============
    console.log("🔥 L7: CRM")
    if (guestIds.length > 0) {
      for (const t of ["crm_guest_tag_assignments", "crm_guest_notes", "crm_communication_log"]) {
        await del(supabaseAdmin, t, "guest_id", guestIds, errors)
      }
    }
    await del(supabaseAdmin, "crm_guests", "business_id", business_id, errors)
    await del(supabaseAdmin, "crm_guest_tags", "business_id", business_id, errors)

    // ============ LEVEL 8: Floor Plans ============
    console.log("🔥 L8: Floor Plans")
    for (const t of ["floor_plan_tables", "floor_plan_rooms", "floor_plan_zones"]) {
      await del(supabaseAdmin, t, "business_id", business_id, errors)
    }

    // ============ LEVEL 9: Venues ============
    console.log("🔥 L9: Venues")
    if (venueZoneIds.length > 0) await del(supabaseAdmin, "venue_seats", "zone_id", venueZoneIds, errors)
    if (venueIds.length > 0) await del(supabaseAdmin, "venue_zones", "venue_id", venueIds, errors)
    await del(supabaseAdmin, "venues", "business_id", business_id, errors)

    // ============ LEVEL 10: Business-level tables ============
    console.log("🔥 L10: Business-level")
    for (const t of [
      "profile_boosts", "credit_transactions", "business_followers",
      "business_subscriptions", "business_subscription_plan_history",
      "beta_invite_codes", "daily_analytics", "engagement_events",
      "student_discount_redemptions", "student_discount_partners",
      "student_redemptions", "student_subsidy_invoices",
      "payment_invoices", "posts", "offline_scan_results",
    ]) {
      await del(supabaseAdmin, t, "business_id", business_id, errors)
    }

    // ============ LEVEL 11: Notifications, Reports, Featured, Emails ============
    console.log("🔥 L11: Notifications & cleanup")
    await del(supabaseAdmin, "notifications", "user_id", ownerId, errors)
    await del(supabaseAdmin, "notification_log", "user_id", ownerId, errors)
    // Reports referencing any entity
    for (const eid of allEntityIds) {
      await del(supabaseAdmin, "reports", "entity_id", eid, errors)
    }
    // Featured & featured_content
    for (const eid of allEntityIds) {
      await del(supabaseAdmin, "featured", "entity_id", eid, errors)
      await del(supabaseAdmin, "featured_content", "entity_id", eid, errors)
    }
    // Clean suppressed emails & unsubscribe tokens for owner
    if (ownerEmail) {
      await del(supabaseAdmin, "suppressed_emails", "email", ownerEmail, errors)
      await del(supabaseAdmin, "email_unsubscribe_tokens", "email", ownerEmail, errors)
    }

    // ============ LEVEL 12: Storage ============
    console.log("🔥 L12: Storage")
    for (const bucket of ["business-logos", "business-covers", "floor-plans", "floor-plan-references"]) {
      await delStorage(supabaseAdmin, bucket, business_id)
    }
    for (const eid of eventIds) await delStorage(supabaseAdmin, "event-covers", eid)
    for (const did of discountIds) await delStorage(supabaseAdmin, "offer-images", did)

    // ============ Delete business record ============
    console.log("🔥 Deleting business record")
    const { error: deleteError } = await supabaseAdmin.from("businesses").delete().eq("id", business_id)
    if (deleteError) {
      return new Response(JSON.stringify({ error: `Failed to delete business: ${deleteError.message}`, partial_errors: errors }), {
        status: 500, headers: { ...securityHeaders, "Content-Type": "application/json" }
      })
    }

    // ============ LEVEL 13: Owner account ============
    if (delete_owner_account !== false) {
      console.log("🔥 L13: Owner account")
      // Conversations
      await cleanConversations(supabaseAdmin, ownerId, errors)
      // User-level tables
      for (const t of [
        "user_roles", "push_subscriptions", "user_preferences",
        "favorites", "favorite_discounts", "rsvps", "event_views",
        "business_post_likes", "business_post_poll_votes", "business_post_views",
        "post_reactions", "event_posts", "messages", "reports",
        "notification_log", "notifications", "discount_scans", "discount_views",
        "engagement_events", "student_verifications",
      ]) {
        await del(supabaseAdmin, t, "user_id", ownerId, errors)
      }
      // User connections (both directions)
      await del(supabaseAdmin, "user_connections", "requester_id", ownerId, errors)
      await del(supabaseAdmin, "user_connections", "receiver_id", ownerId, errors)
      // Profile
      await del(supabaseAdmin, "profiles", "id", ownerId, errors)
      // Auth user
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(ownerId)
      if (authErr) {
        errors.push(`auth.users: ${authErr.message}`)
        console.warn(`⚠️ Auth user: ${authErr.message}`)
      } else {
        console.log("✅ Auth user deleted")
      }
    }

    console.log(`✅ WIPE COMPLETE: "${business.name}". Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({ success: true, name: business.name, owner_deleted: delete_owner_account !== false, warnings: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...securityHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...securityHeaders, "Content-Type": "application/json" }
    })
  }
})
