/**
 * TEST SUITE 02: QR Check-in Integrity
 * 
 * Verifies:
 * - atomic_ticket_checkin allows exactly 1 check-in per ticket
 * - Concurrent check-in attempts → only 1 succeeds
 * - Cancelled/refunded tickets are always rejected
 * - Staff user ID is recorded on check-in
 * - "already used" response is deterministic
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Helper: create a valid ticket for testing
async function createTestTicket(status: string = "valid") {
  const { data: business } = await supabase.from("businesses").select("id, user_id").limit(1).single();
  assertExists(business);

  const { data: event } = await supabase.from("events").insert({
    business_id: business.id,
    title: `[TEST] CheckIn ${Date.now()}`,
    category: ["test"],
    location: "Test",
    start_at: new Date(Date.now() + 86400000).toISOString(),
    end_at: new Date(Date.now() + 90000000).toISOString(),
    event_type: "ticket",
  }).select().single();
  assertExists(event);

  const { data: tier } = await supabase.from("ticket_tiers").insert({
    event_id: event!.id,
    name: "Test",
    price_cents: 1000,
    currency: "eur",
    quantity_total: 100,
    quantity_sold: 0,
    max_per_order: 10,
    active: true,
  }).select().single();
  assertExists(tier);

  const { data: order } = await supabase.from("ticket_orders").insert({
    user_id: business.user_id,
    event_id: event!.id,
    business_id: business.id,
    subtotal_cents: 1000,
    total_cents: 1000,
    status: "completed",
    customer_email: "test@test.com",
    customer_name: "Test User",
  }).select().single();
  assertExists(order);

  const { data: ticket } = await supabase.from("tickets").insert({
    order_id: order!.id,
    tier_id: tier!.id,
    event_id: event!.id,
    user_id: business.user_id,
    status,
  }).select().single();
  assertExists(ticket);

  return { business, event: event!, tier: tier!, order: order!, ticket: ticket! };
}

async function cleanupCheckinTest(eventId: string) {
  // Delete in order of dependencies
  const { data: orders } = await supabase.from("ticket_orders").select("id").eq("event_id", eventId);
  if (orders) {
    for (const o of orders) {
      await supabase.from("tickets").delete().eq("order_id", o.id);
    }
  }
  await supabase.from("ticket_orders").delete().eq("event_id", eventId);
  await supabase.from("ticket_tiers").delete().eq("event_id", eventId);
  await supabase.from("events").delete().eq("id", eventId);
}

Deno.test("02.1 - Single check-in succeeds for valid ticket", async () => {
  const { business, event, ticket } = await createTestTicket("valid");
  
  try {
    const { data, error } = await supabase.rpc("atomic_ticket_checkin", {
      p_ticket_id: ticket.id,
      p_staff_user_id: business.user_id,
    });

    assertEquals(error, null);
    assertExists(data);
    assertEquals(data.success, true);

    // Verify ticket is now "used"
    const { data: updatedTicket } = await supabase
      .from("tickets")
      .select("status, checked_in_at, checked_in_by")
      .eq("id", ticket.id)
      .single();

    assertEquals(updatedTicket?.status, "used");
    assertExists(updatedTicket?.checked_in_at);
    assertEquals(updatedTicket?.checked_in_by, business.user_id);
  } finally {
    await cleanupCheckinTest(event.id);
  }
});

Deno.test("02.2 - Second check-in always returns ALREADY_USED", async () => {
  const { business, event, ticket } = await createTestTicket("valid");
  
  try {
    // First check-in
    await supabase.rpc("atomic_ticket_checkin", {
      p_ticket_id: ticket.id,
      p_staff_user_id: business.user_id,
    });

    // Second check-in
    const { data } = await supabase.rpc("atomic_ticket_checkin", {
      p_ticket_id: ticket.id,
      p_staff_user_id: business.user_id,
    });

    assertEquals(data?.success, false);
    assertEquals(data?.error, "ALREADY_USED");
  } finally {
    await cleanupCheckinTest(event.id);
  }
});

Deno.test("02.3 - Concurrent check-ins → exactly 1 success", async () => {
  const { business, event, ticket } = await createTestTicket("valid");
  
  try {
    // Fire 5 concurrent check-in attempts (simulating 5 scanners)
    const promises = Array.from({ length: 5 }, () =>
      supabase.rpc("atomic_ticket_checkin", {
        p_ticket_id: ticket.id,
        p_staff_user_id: business.user_id,
      })
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.data?.success === true).length;
    const alreadyUsed = results.filter(r => r.data?.error === "ALREADY_USED").length;

    assertEquals(successes, 1, `Expected exactly 1 success, got ${successes}`);
    assertEquals(alreadyUsed, 4, `Expected exactly 4 ALREADY_USED, got ${alreadyUsed}`);
  } finally {
    await cleanupCheckinTest(event.id);
  }
});

Deno.test("02.4 - Cancelled ticket is rejected", async () => {
  const { business, event, ticket } = await createTestTicket("cancelled");
  
  try {
    const { data } = await supabase.rpc("atomic_ticket_checkin", {
      p_ticket_id: ticket.id,
      p_staff_user_id: business.user_id,
    });

    assertEquals(data?.success, false);
    assert(
      data?.error === "ALREADY_USED" || data?.error === "NOT_VALID",
      `Expected rejection, got: ${data?.error}`
    );
  } finally {
    await cleanupCheckinTest(event.id);
  }
});

Deno.test("02.5 - Refunded ticket is rejected", async () => {
  const { business, event, ticket } = await createTestTicket("refunded");
  
  try {
    const { data } = await supabase.rpc("atomic_ticket_checkin", {
      p_ticket_id: ticket.id,
      p_staff_user_id: business.user_id,
    });

    assertEquals(data?.success, false);
  } finally {
    await cleanupCheckinTest(event.id);
  }
});
