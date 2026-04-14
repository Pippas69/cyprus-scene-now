import { describe, it, expect } from "vitest";
import { isClubOrEventBusiness, isPerformanceBusiness } from "../isClubOrEventBusiness";

describe("isClubOrEventBusiness", () => {
  it("returns true for clubs", () => {
    expect(isClubOrEventBusiness(["clubs"])).toBe(true);
  });

  it("returns true for events", () => {
    expect(isClubOrEventBusiness(["events"])).toBe(true);
  });

  it("returns true for performance categories", () => {
    expect(isClubOrEventBusiness(["theatre"])).toBe(true);
    expect(isClubOrEventBusiness(["music"])).toBe(true);
    expect(isClubOrEventBusiness(["dance"])).toBe(true);
    expect(isClubOrEventBusiness(["kids"])).toBe(true);
  });

  it("returns false for dining/bars", () => {
    expect(isClubOrEventBusiness(["bars"])).toBe(false);
    expect(isClubOrEventBusiness(["fine-dining"])).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isClubOrEventBusiness(["Clubs"])).toBe(true);
    expect(isClubOrEventBusiness(["THEATRE"])).toBe(true);
  });

  it("returns false for empty array", () => {
    expect(isClubOrEventBusiness([])).toBe(false);
  });
});

describe("isPerformanceBusiness", () => {
  it("returns true for performance categories", () => {
    expect(isPerformanceBusiness(["theatre"])).toBe(true);
    expect(isPerformanceBusiness(["music"])).toBe(true);
    expect(isPerformanceBusiness(["dance"])).toBe(true);
    expect(isPerformanceBusiness(["kids"])).toBe(true);
  });

  it("returns false for non-performance categories", () => {
    expect(isPerformanceBusiness(["clubs"])).toBe(false);
    expect(isPerformanceBusiness(["bars"])).toBe(false);
  });
});
