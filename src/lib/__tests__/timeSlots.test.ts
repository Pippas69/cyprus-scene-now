import { describe, it, expect } from "vitest";
import {
  normalizeTime,
  timeToMinutes,
  minutesToTime,
  expandTimeRange,
  expandSlotsForDay,
} from "../timeSlots";

describe("normalizeTime", () => {
  it("extracts HH:MM from full time string", () => {
    expect(normalizeTime("14:30:00")).toBe("14:30");
  });

  it("returns 00:00 for null/undefined", () => {
    expect(normalizeTime(null)).toBe("00:00");
    expect(normalizeTime(undefined)).toBe("00:00");
  });

  it("handles short time strings", () => {
    expect(normalizeTime("09:00")).toBe("09:00");
  });
});

describe("timeToMinutes", () => {
  it("converts time to minutes since midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("01:30")).toBe(90);
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesToTime", () => {
  it("converts minutes to HH:MM", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(90)).toBe("01:30");
    expect(minutesToTime(1439)).toBe("23:59");
  });

  it("wraps around at 1440 (midnight)", () => {
    expect(minutesToTime(1440)).toBe("00:00");
    expect(minutesToTime(1500)).toBe("01:00");
  });

  it("handles negative values", () => {
    expect(minutesToTime(-60)).toBe("23:00");
  });
});

describe("expandTimeRange", () => {
  it("generates slots from start to end inclusive", () => {
    const slots = expandTimeRange("09:00", "10:00", 30);
    expect(slots).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("handles overnight ranges", () => {
    const slots = expandTimeRange("23:00", "01:00", 60);
    expect(slots).toEqual(["23:00", "00:00", "01:00"]);
  });
});

describe("expandSlotsForDay", () => {
  it("returns empty for null/undefined slots", () => {
    expect(expandSlotsForDay(null, "Monday")).toEqual([]);
    expect(expandSlotsForDay(undefined, "Monday")).toEqual([]);
    expect(expandSlotsForDay([], "Monday")).toEqual([]);
  });

  it("filters by day name", () => {
    const slots = [
      { timeFrom: "09:00", timeTo: "10:00", days: ["Monday"] },
      { timeFrom: "14:00", timeTo: "15:00", days: ["Tuesday"] },
    ];
    const result = expandSlotsForDay(slots, "Monday", 30);
    expect(result).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("includes slots without day restriction", () => {
    const slots = [{ timeFrom: "09:00", timeTo: "09:30" }];
    const result = expandSlotsForDay(slots, "Monday", 30);
    expect(result).toEqual(["09:00", "09:30"]);
  });

  it("deduplicates overlapping slots", () => {
    const slots = [
      { timeFrom: "09:00", timeTo: "10:00" },
      { timeFrom: "09:30", timeTo: "10:30" },
    ];
    const result = expandSlotsForDay(slots, "Monday", 30);
    expect(new Set(result).size).toBe(result.length);
  });
});
