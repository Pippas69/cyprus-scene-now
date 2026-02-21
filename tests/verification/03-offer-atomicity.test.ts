/**
 * TEST SUITE 03: Offer Claim Atomicity
 * 
 * Verifies:
 * - claim_offer_spots_atomically prevents over-subscription
 * - Concurrent claims respect capacity limits
 * - Remaining capacity never goes negative
 * - Release spots restores capacity
 * - Unlimited offers (people_remaining IS NULL) always succeed
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createTestOffer(peopleRemaining: number | null, totalPeople: number | null) {
  const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
  assertExists(business);

  const { data: discount } = await supabase.from("discounts").insert({
    business_id: business.id,
    title: `[TEST] Offer Atomicity ${Date.now()}`,
    start_at: new Date(Date.now() - 3600000).toISOString(),
    end_at: new Date(Date.now() + 86400000).toISOString(),
    qr_code_token: crypto.randomUUID(),
    active: true,
    people_remaining: peopleRemaining,
    total_people: totalPeople,
    pricing_type: "free",
  }).select().single();

  assertExists(discount);
  return { business, discount: discount! };
}

async function cleanupOffer(discountId: string) {
  await supabase.from("offer_purchases").delete().eq("discount_id", discountId);
  await supabase.from("discounts").delete().eq("id", discountId);
}

Deno.test("03.1 - Claim exactly N spots from N available", async () => {
  const { discount } = await createTestOffer(5, 5);
  
  try {
    const { data } = await supabase.rpc("claim_offer_spots_atomically", {
      p_discount_id: discount.id,
      p_party_size: 5,
    });

    assertEquals(data?.success, true);
    assertEquals(data?.remaining, 0);
  } finally {
    await cleanupOffer(discount.id);
  }
});

Deno.test("03.2 - Reject claim when insufficient spots", async () => {
  const { discount } = await createTestOffer(3, 5);
  
  try {
    const { data } = await supabase.rpc("claim_offer_spots_atomically", {
      p_discount_id: discount.id,
      p_party_size: 5,
    });

    assertEquals(data?.success, false);
    assert(data?.message?.includes("Not enough") || data?.message?.includes("spots"));
  } finally {
    await cleanupOffer(discount.id);
  }
});

Deno.test("03.3 - Concurrent claims never go negative", async () => {
  const CAPACITY = 5;
  const { discount } = await createTestOffer(CAPACITY, CAPACITY);
  
  try {
    // 10 concurrent claims for 1 spot each
    const promises = Array.from({ length: 10 }, () =>
      supabase.rpc("claim_offer_spots_atomically", {
        p_discount_id: discount.id,
        p_party_size: 1,
      })
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.data?.success).length;
    const failures = results.filter(r => r.data && !r.data.success).length;

    assertEquals(successes, CAPACITY, `Expected ${CAPACITY} successes, got ${successes}`);
    assertEquals(failures, 10 - CAPACITY, `Expected ${10 - CAPACITY} failures, got ${failures}`);

    // Verify remaining is 0, not negative
    const { data: finalDiscount } = await supabase
      .from("discounts")
      .select("people_remaining")
      .eq("id", discount.id)
      .single();

    assertEquals(finalDiscount?.people_remaining, 0, "people_remaining must be exactly 0");
    assert(finalDiscount!.people_remaining! >= 0, "people_remaining must never be negative");
  } finally {
    await cleanupOffer(discount.id);
  }
});

Deno.test("03.4 - Unlimited offer (null remaining) always succeeds", async () => {
  const { discount } = await createTestOffer(null, null);
  
  try {
    // Multiple claims should all succeed
    const promises = Array.from({ length: 5 }, () =>
      supabase.rpc("claim_offer_spots_atomically", {
        p_discount_id: discount.id,
        p_party_size: 3,
      })
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.data?.success).length;

    assertEquals(successes, 5, "All claims on unlimited offer should succeed");
  } finally {
    await cleanupOffer(discount.id);
  }
});

Deno.test("03.5 - Release spots restores capacity", async () => {
  const { discount } = await createTestOffer(5, 5);
  
  try {
    // Claim all
    await supabase.rpc("claim_offer_spots_atomically", {
      p_discount_id: discount.id,
      p_party_size: 5,
    });

    // Release 3
    await supabase.rpc("release_offer_spots", {
      p_discount_id: discount.id,
      p_party_size: 3,
    });

    // Claim 3 more — should succeed
    const { data } = await supabase.rpc("claim_offer_spots_atomically", {
      p_discount_id: discount.id,
      p_party_size: 3,
    });

    assertEquals(data?.success, true);
    assertEquals(data?.remaining, 0);
  } finally {
    await cleanupOffer(discount.id);
  }
});
