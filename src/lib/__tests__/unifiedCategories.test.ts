import { describe, it, expect } from "vitest";
import {
  getAllCategoryIds,
  getCategoryLabelById,
  getCategorySingularLabelById,
  getCategoryIcon,
  unifiedCategories,
} from "../unifiedCategories";

describe("getAllCategoryIds", () => {
  it("returns main + sub-option IDs", () => {
    const ids = getAllCategoryIds();
    expect(ids).toContain("nightlife");
    expect(ids).toContain("clubs");
    expect(ids).toContain("dining");
    expect(ids).toContain("fine-dining");
    expect(ids).toContain("performances");
    expect(ids).toContain("theatre");
  });

  it("returns more than 3 IDs (includes sub-options)", () => {
    expect(getAllCategoryIds().length).toBeGreaterThan(3);
  });
});

describe("getCategoryLabelById", () => {
  it("returns Greek label for main category", () => {
    expect(getCategoryLabelById("dining", "el")).toBe("Εστίαση");
  });

  it("returns English label for sub-option", () => {
    expect(getCategoryLabelById("clubs", "en")).toBe("Clubs");
  });

  it("falls back to ID for unknown categories", () => {
    expect(getCategoryLabelById("unknown", "en")).toBe("unknown");
  });
});

describe("getCategorySingularLabelById", () => {
  it("returns singular label when available", () => {
    expect(getCategorySingularLabelById("clubs", "en")).toBe("Club");
    expect(getCategorySingularLabelById("theatre", "el")).toBe("Θέατρο");
  });

  it("falls back to plural label if no singular", () => {
    expect(getCategorySingularLabelById("nightlife", "en")).toBe("Nightlife");
  });
});

describe("getCategoryIcon", () => {
  it("returns icon for main categories", () => {
    expect(getCategoryIcon("nightlife")).toBe("🍸");
    expect(getCategoryIcon("dining")).toBe("🍴");
    expect(getCategoryIcon("performances")).toBe("🎬");
  });

  it("returns parent icon for sub-options", () => {
    expect(getCategoryIcon("clubs")).toBe("🍸");
    expect(getCategoryIcon("theatre")).toBe("🎬");
  });

  it("returns default icon for unknown", () => {
    expect(getCategoryIcon("unknown")).toBe("📍");
  });
});

describe("unifiedCategories structure", () => {
  it("has exactly 3 main categories", () => {
    expect(unifiedCategories).toHaveLength(3);
  });

  it("nightlife has 4 sub-options", () => {
    const nightlife = unifiedCategories.find((c) => c.id === "nightlife");
    expect(nightlife?.subOptions).toHaveLength(4);
  });
});
