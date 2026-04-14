import { describe, it, expect } from "vitest";
import {
  getPlanTierIndex,
  mapToPlanSlug,
  getCityDistance,
  sortBusinessesByPlanAndProximity,
  ELITE_MANUAL_ORDER,
} from "../businessRanking";

describe("getPlanTierIndex", () => {
  it("returns 0 for elite/professional/premium", () => {
    expect(getPlanTierIndex("elite")).toBe(0);
    expect(getPlanTierIndex("professional")).toBe(0);
    expect(getPlanTierIndex("premium")).toBe(0);
  });

  it("returns 1 for pro/growth", () => {
    expect(getPlanTierIndex("pro")).toBe(1);
    expect(getPlanTierIndex("growth")).toBe(1);
  });

  it("returns 2 for basic/starter", () => {
    expect(getPlanTierIndex("basic")).toBe(2);
    expect(getPlanTierIndex("starter")).toBe(2);
  });

  it("returns 3 for free/null/undefined/unknown", () => {
    expect(getPlanTierIndex("free")).toBe(3);
    expect(getPlanTierIndex(null)).toBe(3);
    expect(getPlanTierIndex(undefined)).toBe(3);
    expect(getPlanTierIndex("xyz")).toBe(3);
  });

  it("is case-insensitive", () => {
    expect(getPlanTierIndex("ELITE")).toBe(0);
    expect(getPlanTierIndex("Pro")).toBe(1);
  });
});

describe("mapToPlanSlug", () => {
  it("maps elite variants", () => {
    expect(mapToPlanSlug("id", "elite-annual")).toBe("elite");
    expect(mapToPlanSlug("id", "premium-monthly")).toBe("elite");
  });

  it("maps pro variants", () => {
    expect(mapToPlanSlug("id", "pro-monthly")).toBe("pro");
    expect(mapToPlanSlug("id", "growth-annual")).toBe("pro");
  });

  it("maps basic variants", () => {
    expect(mapToPlanSlug("id", "basic-monthly")).toBe("basic");
    expect(mapToPlanSlug("id", "starter-plan")).toBe("basic");
  });

  it("returns free for null inputs", () => {
    expect(mapToPlanSlug(null, null)).toBe("free");
    expect(mapToPlanSlug(null, "elite")).toBe("free");
  });
});

describe("getCityDistance", () => {
  it("returns 0 for same city", () => {
    expect(getCityDistance("Nicosia", "Nicosia")).toBe(0);
    expect(getCityDistance("Λευκωσία", "Λευκωσία")).toBe(0);
  });

  it("returns known distance between cities", () => {
    expect(getCityDistance("Nicosia", "Larnaca")).toBe(50);
    expect(getCityDistance("Limassol", "Paphos")).toBe(70);
  });

  it("supports cross-language lookups", () => {
    expect(getCityDistance("Nicosia", "Λάρνακα")).toBe(50);
  });

  it("returns 1000 for null inputs", () => {
    expect(getCityDistance(null, "Nicosia")).toBe(1000);
    expect(getCityDistance("Nicosia", null)).toBe(1000);
  });

  it("returns 100 for unknown different cities", () => {
    expect(getCityDistance("Athens", "Berlin")).toBe(100);
  });
});

describe("sortBusinessesByPlanAndProximity", () => {
  it("sorts by plan tier (elite first, free last)", () => {
    const businesses = [
      { id: "a", planTierIndex: 3, city: "Nicosia" },
      { id: "b", planTierIndex: 0, city: "Nicosia" },
      { id: "c", planTierIndex: 1, city: "Nicosia" },
    ];
    const sorted = sortBusinessesByPlanAndProximity(businesses, "Nicosia");
    expect(sorted.map((b) => b.planTierIndex)).toEqual([0, 1, 3]);
  });

  it("uses manual order for elite businesses", () => {
    const eliteEntries = Object.entries(ELITE_MANUAL_ORDER)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3);
    const expectedIds = eliteEntries.map(([id]) => id);

    // Feed them in reverse order
    const businesses = [...eliteEntries]
      .reverse()
      .map(([id]) => ({ id, planTierIndex: 0, city: "Nicosia" }));

    const sorted = sortBusinessesByPlanAndProximity(businesses, "Nicosia");
    expect(sorted.map((b) => b.id)).toEqual(expectedIds);
  });

  it("sorts by proximity within same non-elite tier", () => {
    const businesses = [
      { id: "a", planTierIndex: 2, city: "Paphos" },
      { id: "b", planTierIndex: 2, city: "Larnaca" },
    ];
    const sorted = sortBusinessesByPlanAndProximity(businesses, "Nicosia");
    // Larnaca (50km) closer than Paphos (150km)
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("a");
  });

  it("does not mutate original array", () => {
    const businesses = [
      { id: "a", planTierIndex: 3, city: "Nicosia" },
      { id: "b", planTierIndex: 0, city: "Nicosia" },
    ];
    const original = [...businesses];
    sortBusinessesByPlanAndProximity(businesses, "Nicosia");
    expect(businesses).toEqual(original);
  });
});
