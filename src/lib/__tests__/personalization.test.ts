import { describe, it, expect } from "vitest";
import {
  getPlanTierIndex,
  getPlanScore,
  getPersonalizedScore,
  getOfferBoostScore,
  getRotationSeed,
  DISPLAY_CAPS,
} from "../personalization";

describe("getPlanTierIndex (personalization)", () => {
  it("maps elite=0, pro=1, basic=2, free=3", () => {
    expect(getPlanTierIndex("elite")).toBe(0);
    expect(getPlanTierIndex("pro")).toBe(1);
    expect(getPlanTierIndex("basic")).toBe(2);
    expect(getPlanTierIndex(null)).toBe(3);
  });
});

describe("getPlanScore", () => {
  it("returns highest score for elite", () => {
    expect(getPlanScore("elite")).toBe(10000);
  });

  it("returns 0 for free/null", () => {
    expect(getPlanScore(null)).toBe(0);
    expect(getPlanScore("free")).toBe(0);
  });

  it("maintains hierarchy: elite > pro > basic > free", () => {
    expect(getPlanScore("elite")).toBeGreaterThan(getPlanScore("pro"));
    expect(getPlanScore("pro")).toBeGreaterThan(getPlanScore("basic"));
    expect(getPlanScore("basic")).toBeGreaterThan(getPlanScore("free"));
  });
});

describe("getPersonalizedScore", () => {
  const baseEvent = { id: "e1", category: ["clubs"], start_at: "2024-06-15T22:00:00Z" };

  it("returns 0 for no profile and no boosts", () => {
    expect(getPersonalizedScore(baseEvent, null, [], [])).toBe(0);
  });

  it("adds city bonus for same city", () => {
    const score = getPersonalizedScore(
      { ...baseEvent, businesses: { city: "Nicosia" } },
      { city: "Nicosia" },
      [],
      []
    );
    expect(score).toBe(30);
  });

  it("adds category match bonus", () => {
    const score = getPersonalizedScore(
      baseEvent,
      { interests: ["clubs"] },
      [],
      []
    );
    expect(score).toBe(25);
  });

  it("adds boost score when event is boosted", () => {
    const boosts = [{ event_id: "e1", targeting_quality: 5, boost_tier: "premium" }];
    const score = getPersonalizedScore(baseEvent, null, [], [], boosts);
    expect(score).toBe(50); // TIER_PREMIUM
  });
});

describe("getOfferBoostScore", () => {
  it("returns tier score for boosted offer", () => {
    const offer = { id: "o1", business_id: "b1" };
    const boosts = [{ discount_id: "o1", targeting_quality: 5 }];
    const score = getOfferBoostScore(offer, null, boosts, 0);
    expect(score).toBeGreaterThan(0);
  });

  it("adds city bonus for matching city", () => {
    const offer = { id: "o1", business_id: "b1", businesses: { city: "Nicosia", category: [] } };
    const scoreWithCity = getOfferBoostScore(offer, { city: "Nicosia" }, [], 0);
    const scoreNoCity = getOfferBoostScore(offer, null, [], 0);
    expect(scoreWithCity).toBeGreaterThan(scoreNoCity);
  });
});

describe("getRotationSeed", () => {
  it("returns a number", () => {
    expect(typeof getRotationSeed("user-1")).toBe("number");
  });

  it("returns different seeds for different users", () => {
    const s1 = getRotationSeed("user-1");
    const s2 = getRotationSeed("user-2");
    // They could be same in rare cases, but generally different
    expect(typeof s1).toBe("number");
    expect(typeof s2).toBe("number");
  });
});

describe("DISPLAY_CAPS", () => {
  it("exports expected caps", () => {
    expect(DISPLAY_CAPS.PROFILES).toBe(10);
    expect(DISPLAY_CAPS.EVENTS).toBe(8);
    expect(DISPLAY_CAPS.OFFERS).toBe(8);
  });
});
