import { describe, it, expect } from "vitest";
import { getMinAge, DEFAULT_MIN_AGE } from "../ageRestrictions";

describe("getMinAge", () => {
  it("returns DEFAULT_MIN_AGE (16) when no eventMinimumAge provided", () => {
    expect(getMinAge("any-id")).toBe(16);
    expect(getMinAge("any-id", null)).toBe(16);
    expect(getMinAge("any-id", undefined)).toBe(16);
  });

  it("returns eventMinimumAge when >= 16", () => {
    expect(getMinAge("any-id", 18)).toBe(18);
    expect(getMinAge("any-id", 21)).toBe(21);
  });

  it("returns DEFAULT_MIN_AGE when eventMinimumAge < 16", () => {
    expect(getMinAge("any-id", 15)).toBe(16);
    expect(getMinAge("any-id", 0)).toBe(16);
  });

  it("exports the correct default", () => {
    expect(DEFAULT_MIN_AGE).toBe(16);
  });
});
