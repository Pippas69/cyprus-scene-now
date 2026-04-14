import { describe, it, expect } from "vitest";
import { getCategoryLabel } from "../categoryTranslations";

describe("getCategoryLabel", () => {
  it("translates known categories to Greek", () => {
    expect(getCategoryLabel("clubs", "el")).toBe("Clubs");
    expect(getCategoryLabel("dining", "el")).toBe("Εστίαση");
  });

  it("translates known categories to English", () => {
    expect(getCategoryLabel("clubs", "en")).toBe("Clubs");
    expect(getCategoryLabel("dining", "en")).toBe("Dining");
  });

  it("is case-insensitive", () => {
    expect(getCategoryLabel("CLUBS", "en")).toBe("Clubs");
    expect(getCategoryLabel("Dining", "en")).toBe("Dining");
  });

  it("handles Greek input values", () => {
    expect(getCategoryLabel("εστίαση", "en")).toBe("Dining");
    expect(getCategoryLabel("θέατρο", "el")).toBe("Θέατρο");
  });

  it("returns capitalized original for unknown categories", () => {
    expect(getCategoryLabel("xyz", "en")).toBe("Xyz");
  });

  it("returns default for null/undefined", () => {
    expect(getCategoryLabel(null, "el")).toBe("Εκδήλωση");
    expect(getCategoryLabel(undefined, "en")).toBe("Event");
  });

  it("returns singular form when requested", () => {
    expect(getCategoryLabel("clubs", "en", { singular: true })).toBe("Club");
    expect(getCategoryLabel("theatre", "el", { singular: true })).toBe("Θέατρο");
  });

  it("handles space-separated variants", () => {
    expect(getCategoryLabel("casual dining", "en")).toBe("Casual Dining");
    expect(getCategoryLabel("fine dining", "el")).toBe("Επίσημη Εστίαση");
  });
});
