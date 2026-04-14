import { describe, it, expect } from "vitest";
import { isEventPaused, PAUSED_SENTINEL_YEAR } from "../eventVisibility";

describe("isEventPaused", () => {
  it("returns true when appearance_start_at is in 1970", () => {
    expect(isEventPaused({ appearance_start_at: "1970-01-01T00:00:00Z" })).toBe(true);
    expect(isEventPaused({ appearance_start_at: "1970-06-15T12:00:00Z" })).toBe(true);
  });

  it("returns false for normal dates", () => {
    expect(isEventPaused({ appearance_start_at: "2024-06-01T20:00:00Z" })).toBe(false);
  });

  it("returns false when appearance_start_at is null/undefined", () => {
    expect(isEventPaused({ appearance_start_at: null })).toBe(false);
    expect(isEventPaused({})).toBe(false);
  });

  it("returns false for null/undefined event", () => {
    expect(isEventPaused(null)).toBe(false);
    expect(isEventPaused(undefined)).toBe(false);
  });

  it("sentinel year constant is 1970", () => {
    expect(PAUSED_SENTINEL_YEAR).toBe(1970);
  });
});
