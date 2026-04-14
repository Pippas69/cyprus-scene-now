import { describe, it, expect } from "vitest";
import { computeBoostWindow, isTimestampWithinWindow } from "../boostWindow";

describe("computeBoostWindow", () => {
  describe("daily boosts", () => {
    it("uses start_date 00:00 to end_date 23:59:59.999 for date-only inputs", () => {
      const result = computeBoostWindow({
        start_date: "2024-06-01",
        end_date: "2024-06-03",
      });
      expect(result).toEqual({
        start: "2024-06-01T00:00:00.000Z",
        end: "2024-06-03T23:59:59.999Z",
      });
    });

    it("caps start at created_at when created_at is after start_date midnight", () => {
      const result = computeBoostWindow({
        start_date: "2024-06-01",
        end_date: "2024-06-01",
        created_at: "2024-06-01T14:30:00Z",
      });
      expect(result!.start).toBe("2024-06-01T14:30:00.000Z");
    });

    it("falls back to created_at when no start_date/end_date", () => {
      const result = computeBoostWindow({
        created_at: "2024-06-01T10:00:00Z",
      });
      expect(result).toEqual({
        start: "2024-06-01T10:00:00.000Z",
        end: "2024-06-01T10:00:00.000Z",
      });
    });

    it("returns null when no dates at all", () => {
      expect(computeBoostWindow({})).toBeNull();
    });

    it("returns null when start > end", () => {
      const result = computeBoostWindow({
        start_date: "2024-06-05",
        end_date: "2024-06-01",
      });
      expect(result).toBeNull();
    });

    it("caps end at deactivated_at when deactivated early", () => {
      const result = computeBoostWindow({
        start_date: "2024-06-01",
        end_date: "2024-06-03",
        deactivated_at: "2024-06-02T12:00:00Z",
      });
      expect(result!.end).toBe("2024-06-02T12:00:00.000Z");
    });
  });

  describe("hourly boosts", () => {
    it("computes start=created_at, end=created_at + duration_hours", () => {
      const result = computeBoostWindow({
        duration_mode: "hourly",
        created_at: "2024-06-01T10:00:00Z",
        duration_hours: 6,
      });
      expect(result).toEqual({
        start: "2024-06-01T10:00:00.000Z",
        end: "2024-06-01T16:00:00.000Z",
      });
    });

    it("caps end at deactivated_at for hourly boost", () => {
      const result = computeBoostWindow({
        duration_mode: "hourly",
        created_at: "2024-06-01T10:00:00Z",
        duration_hours: 6,
        deactivated_at: "2024-06-01T12:00:00Z",
      });
      expect(result!.end).toBe("2024-06-01T12:00:00.000Z");
    });

    it("returns null when hourly boost has no created_at", () => {
      const result = computeBoostWindow({ duration_mode: "hourly" });
      expect(result).toBeNull();
    });
  });

  describe("timezone normalization", () => {
    it("appends Z to timestamps without timezone", () => {
      const result = computeBoostWindow({
        duration_mode: "hourly",
        created_at: "2024-06-01T10:00:00",
        duration_hours: 1,
      });
      expect(result!.start).toBe("2024-06-01T10:00:00.000Z");
    });

    it("preserves existing timezone offsets", () => {
      const result = computeBoostWindow({
        duration_mode: "hourly",
        created_at: "2024-06-01T10:00:00+03:00",
        duration_hours: 1,
      });
      // +03:00 → 07:00Z
      expect(result!.start).toBe("2024-06-01T07:00:00.000Z");
    });
  });
});

describe("isTimestampWithinWindow", () => {
  const window = { start: "2024-06-01T00:00:00.000Z", end: "2024-06-01T23:59:59.999Z" };

  it("returns true for timestamp inside window", () => {
    expect(isTimestampWithinWindow("2024-06-01T12:00:00Z", window)).toBe(true);
  });

  it("returns true for timestamp at window edges", () => {
    expect(isTimestampWithinWindow("2024-06-01T00:00:00.000Z", window)).toBe(true);
    expect(isTimestampWithinWindow("2024-06-01T23:59:59.999Z", window)).toBe(true);
  });

  it("returns false for timestamp outside window", () => {
    expect(isTimestampWithinWindow("2024-06-02T00:00:00Z", window)).toBe(false);
    expect(isTimestampWithinWindow("2024-05-31T23:59:59Z", window)).toBe(false);
  });
});
