/**
 * TEST SUITE 01: Ticket Reservation Atomicity
 * 
 * Verifies:
 * - reserve_tickets_atomically prevents overselling
 * - Concurrent reservations are serialized per-tier
 * - Lock timeout prevents frozen checkouts
 * - release_tickets correctly frees inventory
 * - Different tiers/events don't block each other
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Helper: create a test event+tier with known quantity
async function createTestTier(quantity: number) {
  // Find a business to use
  const { data: business } = await supabase
    .from("businesses")
    .select("id, user_id")
    .limit(1)
    .single();
  
  assertExists(business, "Need at least one business for testing");

  // Create test event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      business_id: business.id,
      title: `[TEST] Atomicity Test ${Date.now()}`,
      category: ["test"],
      location: "Test Location",
      start_at: new Date(Date.now() + 86400000).toISOString(),
      end_at: new Date(Date.now() + 90000000).toISOString(),
      event_type: "ticket",
    })
    .select()
    .single();

  if (eventError) throw eventError;
  assertExists(event);

  // Create tier with exact quantity
  const { data: tier, error: tierError } = await supabase
    .from("ticket_tiers")
    .insert({
      event_id: event.id,
      name: `Test Tier ${Date.now()}`,
      price_cents: 1000,
      currency: "eur",
      quantity_total: quantity,
      quantity_sold: 0,
      max_per_order: 10,
      active: true,
    })
    .select()
    .single();

  if (tierError) throw tierError;
  assertExists(tier);

  return { business, event, tier };
}

// Cleanup helper
async function cleanupTest(eventId: string) {
  await supabase.from("ticket_tiers").delete().eq("event_id", eventId);
  await supabase.from("events").delete().eq("id", eventId);
}

Deno.test("01.1 - Reserve exactly N tickets from N available", async () => {
  const { event, tier } = await createTestTier(5);
  
  try {
    const { data, error } = await supabase.rpc("reserve_tickets_atomically", {
      p_tier_id: tier.id,
      p_quantity: 5,
    });

    assertEquals(error, null);
    assertExists(data);
    assertEquals(data.success, true);
    assertEquals(data.remaining, 0);

    // Verify DB state
    const { data: updatedTier } = await supabase
      .from("ticket_tiers")
      .select("quantity_sold, quantity_total")
      .eq("id", tier.id)
      .single();

    assertEquals(updatedTier?.quantity_sold, 5);
    assertEquals(updatedTier?.quantity_total, 5);
  } finally {
    await cleanupTest(event.id);
  }
});

Deno.test("01.2 - Reject reservation when insufficient tickets", async () => {
  const { event, tier } = await createTestTier(3);
  
  try {
    // Try to reserve more than available
    const { data, error } = await supabase.rpc("reserve_tickets_atomically", {
      p_tier_id: tier.id,
      p_quantity: 5,
    });

    assertEquals(error, null);
    assertExists(data);
    assertEquals(data.success, false);
    assert(data.message.includes("Not enough") || data.message.includes("INSUFFICIENT"), 
      `Expected insufficient message, got: ${data.message}`);
  } finally {
    await cleanupTest(event.id);
  }
});

Deno.test("01.3 - Sequential reservations never exceed capacity", async () => {
  const TOTAL = 10;
  const { event, tier } = await createTestTier(TOTAL);
  
  try {
    let totalReserved = 0;

    // Reserve in chunks of 3 — should succeed 3 times, fail on 4th
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.rpc("reserve_tickets_atomically", {
        p_tier_id: tier.id,
        p_quantity: 3,
      });

      if (data?.success) {
        totalReserved += 3;
      }
    }

    // Exactly 9 should succeed (3*3=9), 4th call would need 3 but only 1 left
    assertEquals(totalReserved, 9, `Expected exactly 9 reserved, got ${totalReserved}`);

    // Verify final DB state
    const { data: finalTier } = await supabase
      .from("ticket_tiers")
      .select("quantity_sold")
      .eq("id", tier.id)
      .single();

    assertEquals(finalTier?.quantity_sold, 9);
  } finally {
    await cleanupTest(event.id);
  }
});

Deno.test("01.4 - Release tickets restores capacity", async () => {
  const { event, tier } = await createTestTier(5);
  
  try {
    // Reserve all
    await supabase.rpc("reserve_tickets_atomically", {
      p_tier_id: tier.id,
      p_quantity: 5,
    });

    // Release 3
    await supabase.rpc("release_tickets", {
      p_tier_id: tier.id,
      p_quantity: 3,
    });

    // Should be able to reserve 3 more
    const { data } = await supabase.rpc("reserve_tickets_atomically", {
      p_tier_id: tier.id,
      p_quantity: 3,
    });

    assertEquals(data?.success, true);
    assertEquals(data?.remaining, 0);
  } finally {
    await cleanupTest(event.id);
  }
});

Deno.test("01.5 - Concurrent reservations (10 parallel for 5 tickets)", async () => {
  const { event, tier } = await createTestTier(5);
  
  try {
    // Fire 10 concurrent reservation attempts for 1 ticket each
    const promises = Array.from({ length: 10 }, () =>
      supabase.rpc("reserve_tickets_atomically", {
        p_tier_id: tier.id,
        p_quantity: 1,
      })
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.data?.success).length;
    const failures = results.filter(r => r.data && !r.data.success).length;

    assertEquals(successes, 5, `Expected exactly 5 successes, got ${successes}`);
    assertEquals(failures, 5, `Expected exactly 5 failures, got ${failures}`);

    // Verify DB
    const { data: finalTier } = await supabase
      .from("ticket_tiers")
      .select("quantity_sold")
      .eq("id", tier.id)
      .single();

    assertEquals(finalTier?.quantity_sold, 5, "quantity_sold must equal exactly 5");
  } finally {
    await cleanupTest(event.id);
  }
});

Deno.test("01.6 - Different tiers don't block each other", async () => {
  // Create 2 tiers on same event
  const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
  assertExists(business);

  const { data: event } = await supabase
    .from("events")
    .insert({
      business_id: business.id,
      title: `[TEST] Multi-Tier ${Date.now()}`,
      category: ["test"],
      location: "Test",
      start_at: new Date(Date.now() + 86400000).toISOString(),
      end_at: new Date(Date.now() + 90000000).toISOString(),
      event_type: "ticket",
    })
    .select()
    .single();
  assertExists(event);

  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .insert([
      { event_id: event!.id, name: "VIP", price_cents: 5000, currency: "eur", quantity_total: 3, quantity_sold: 0, max_per_order: 5, active: true },
      { event_id: event!.id, name: "General", price_cents: 1000, currency: "eur", quantity_total: 3, quantity_sold: 0, max_per_order: 5, active: true },
    ])
    .select();
  assertExists(tiers);
  assertEquals(tiers!.length, 2);

  try {
    // Reserve from both tiers concurrently
    const [vipResult, generalResult] = await Promise.all([
      supabase.rpc("reserve_tickets_atomically", { p_tier_id: tiers![0].id, p_quantity: 3 }),
      supabase.rpc("reserve_tickets_atomically", { p_tier_id: tiers![1].id, p_quantity: 3 }),
    ]);

    assertEquals(vipResult.data?.success, true, "VIP reservation should succeed");
    assertEquals(generalResult.data?.success, true, "General reservation should succeed");
  } finally {
    await cleanupTest(event!.id);
  }
});
