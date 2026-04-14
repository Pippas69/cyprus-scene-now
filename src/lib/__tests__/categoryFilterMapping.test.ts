import { describe, it, expect } from "vitest";
import {
  mapFilterIdsToDbCategories,
  normalizeBusinessCategories,
  doesCategoryMatchFilters,
} from "../categoryFilterMapping";

describe("mapFilterIdsToDbCategories", () => {
  it("maps a single filter ID to all DB variants", () => {
    const result = mapFilterIdsToDbCategories(["clubs"]);
    expect(result).toContain("clubs");
    expect(result).toContain("Clubs");
    expect(result).toContain("Κλαμπ");
  });

  it("expands parent categories to include children", () => {
    const result = mapFilterIdsToDbCategories(["nightlife"]);
    expect(result).toContain("nightlife");
    expect(result).toContain("clubs");
    expect(result).toContain("bars");
    expect(result).toContain("events");
    expect(result).toContain("pubs");
  });

  it("passes unknown IDs through directly", () => {
    const result = mapFilterIdsToDbCategories(["unknown-cat"]);
    expect(result).toContain("unknown-cat");
  });

  it("deduplicates values", () => {
    const result = mapFilterIdsToDbCategories(["nightlife", "clubs"]);
    const clubCount = result.filter((v) => v === "clubs").length;
    expect(clubCount).toBe(1);
  });
});

describe("normalizeBusinessCategories", () => {
  it("normalizes legacy DB values to unified IDs", () => {
    expect(normalizeBusinessCategories(["Clubs", "Κλαμπ"])).toEqual(["clubs"]);
  });

  it("keeps valid sub-option IDs as-is", () => {
    expect(normalizeBusinessCategories(["clubs", "bars"])).toEqual(
      expect.arrayContaining(["clubs", "bars"])
    );
  });

  it("drops invalid/unknown categories silently", () => {
    expect(normalizeBusinessCategories(["nightlife", "xyz"])).toEqual([]);
  });
});

describe("doesCategoryMatchFilters", () => {
  it("returns true when a DB category matches a filter", () => {
    expect(doesCategoryMatchFilters(["clubs"], ["clubs"])).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(doesCategoryMatchFilters(["Clubs"], ["clubs"])).toBe(true);
  });

  it("returns false when no match", () => {
    expect(doesCategoryMatchFilters(["clubs"], ["dining"])).toBe(false);
  });

  it("matches via parent expansion", () => {
    expect(doesCategoryMatchFilters(["clubs"], ["nightlife"])).toBe(true);
  });
});
