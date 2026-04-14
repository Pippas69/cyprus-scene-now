import { describe, it, expect } from "vitest";
import { shouldHideOffers } from "../shouldHideOffers";

describe("shouldHideOffers", () => {
  it("returns true for clubs", () => {
    expect(shouldHideOffers(["clubs"])).toBe(true);
  });

  it("returns true for events", () => {
    expect(shouldHideOffers(["events"])).toBe(true);
  });

  it("returns true for performance categories", () => {
    expect(shouldHideOffers(["theatre"])).toBe(true);
    expect(shouldHideOffers(["music"])).toBe(true);
    expect(shouldHideOffers(["dance"])).toBe(true);
    expect(shouldHideOffers(["kids"])).toBe(true);
  });

  it("returns false for dining categories", () => {
    expect(shouldHideOffers(["fine-dining"])).toBe(false);
    expect(shouldHideOffers(["casual-dining"])).toBe(false);
  });

  it("returns false for bars", () => {
    expect(shouldHideOffers(["bars"])).toBe(false);
  });

  it("returns true if any category matches", () => {
    expect(shouldHideOffers(["bars", "clubs"])).toBe(true);
  });

  it("returns false for empty array", () => {
    expect(shouldHideOffers([])).toBe(false);
  });
});
