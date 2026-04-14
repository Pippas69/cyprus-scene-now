import { describe, it, expect } from "vitest";
import { calculateDistance, getCategoryColor, getDirectionsUrl } from "../mapUtils";

describe("calculateDistance", () => {
  it("returns 0 for same coordinates", () => {
    expect(calculateDistance(35.17, 33.36, 35.17, 33.36)).toBe(0);
  });

  it("calculates approximate distance between Nicosia and Limassol", () => {
    // Nicosia ~35.17N 33.36E, Limassol ~34.68N 33.04E
    const dist = calculateDistance(35.17, 33.36, 34.68, 33.04);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(100);
  });

  it("is symmetric", () => {
    const ab = calculateDistance(35.17, 33.36, 34.68, 33.04);
    const ba = calculateDistance(34.68, 33.04, 35.17, 33.36);
    expect(ab).toBeCloseTo(ba, 5);
  });
});

describe("getCategoryColor", () => {
  it("returns known colors for known categories", () => {
    expect(getCategoryColor("nightlife")).toBe("#9D4EDD");
    expect(getCategoryColor("dining")).toBe("#FF6B35");
  });

  it("returns fallback for unknown categories", () => {
    expect(getCategoryColor("unknown")).toBe("#6366f1");
  });
});

describe("getDirectionsUrl", () => {
  it("uses address when available", () => {
    const url = getDirectionsUrl("123 Main St", 35, 33);
    expect(url).toContain("destination=123%20Main%20St");
  });

  it("falls back to coordinates when no address", () => {
    const url = getDirectionsUrl(null, 35.17, 33.36);
    expect(url).toContain("destination=35.17,33.36");
  });

  it("returns base Google Maps URL when nothing provided", () => {
    expect(getDirectionsUrl(null)).toBe("https://www.google.com/maps");
  });

  it("ignores empty/whitespace address", () => {
    const url = getDirectionsUrl("  ", 35.17, 33.36);
    expect(url).toContain("destination=35.17,33.36");
  });
});
