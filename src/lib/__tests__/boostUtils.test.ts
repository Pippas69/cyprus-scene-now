import { describe, it, expect } from "vitest";
import { isBoostCurrentlyActive } from "../boostUtils";

describe("isBoostCurrentlyActive", () => {
  it("returns true when now is within the boost window", () => {
    const now = "2024-06-15T12:00:00.000Z";
    expect(
      isBoostCurrentlyActive(
        { event_id: "e1", start_date: "2024-06-15", end_date: "2024-06-16" },
        now
      )
    ).toBe(true);
  });

  it("returns false when now is outside the boost window", () => {
    const now = "2024-06-20T12:00:00.000Z";
    expect(
      isBoostCurrentlyActive(
        { event_id: "e1", start_date: "2024-06-15", end_date: "2024-06-16" },
        now
      )
    ).toBe(false);
  });

  it("handles hourly boosts", () => {
    const now = "2024-06-15T11:00:00.000Z";
    expect(
      isBoostCurrentlyActive(
        {
          event_id: "e1",
          start_date: "2024-06-15",
          end_date: "2024-06-15",
          created_at: "2024-06-15T10:00:00Z",
          duration_mode: "hourly",
          duration_hours: 6,
        },
        now
      )
    ).toBe(true);
  });

  it("returns false for hourly boost when now is after duration", () => {
    const now = "2024-06-15T20:00:00.000Z";
    expect(
      isBoostCurrentlyActive(
        {
          event_id: "e1",
          start_date: "2024-06-15",
          end_date: "2024-06-15",
          created_at: "2024-06-15T10:00:00Z",
          duration_mode: "hourly",
          duration_hours: 6,
        },
        now
      )
    ).toBe(false);
  });
});
