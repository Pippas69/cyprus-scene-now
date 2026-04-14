import { describe, it, expect } from "vitest";
import { getMinAge, DEFAULT_MIN_AGE, EVENT_MIN_AGE } from "../ageRestrictions";

describe("getMinAge", () => {
  it("returns 21 for the hardcoded event ID", () => {
    expect(getMinAge("ae2f9eaa-574b-400e-be37-b2cef98d4907")).toBe(21);
  });

  it("returns DEFAULT_MIN_AGE (16) for unknown event IDs", () => {
    expect(getMinAge("unknown-id")).toBe(DEFAULT_MIN_AGE);
    expect(getMinAge("")).toBe(16);
  });

  it("exports the correct default", () => {
    expect(DEFAULT_MIN_AGE).toBe(16);
  });
});
