import { describe, it, expect } from "vitest";
import { isValidPhone, getDigitCount, phoneRegex } from "../phoneValidation";

describe("getDigitCount", () => {
  it("counts digits only", () => {
    expect(getDigitCount("+357 99 123456")).toBe(11);
    expect(getDigitCount("(99) 123-456")).toBe(8);
    expect(getDigitCount("12345678")).toBe(8);
  });
});

describe("phoneRegex", () => {
  it("allows digits, spaces, dashes, parens, leading +", () => {
    expect(phoneRegex.test("+357 99 123456")).toBe(true);
    expect(phoneRegex.test("(99) 123-456")).toBe(true);
  });

  it("rejects letters and special chars", () => {
    expect(phoneRegex.test("abc123")).toBe(false);
    expect(phoneRegex.test("99@123")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts valid phone numbers (8-15 digits)", () => {
    expect(isValidPhone("99123456")).toBe(true);          // 8 digits
    expect(isValidPhone("+357 99 123456")).toBe(true);    // 11 digits
    expect(isValidPhone("123456789012345")).toBe(true);   // 15 digits
  });

  it("rejects too few digits", () => {
    expect(isValidPhone("1234567")).toBe(false);          // 7 digits
  });

  it("rejects too many digits", () => {
    expect(isValidPhone("1234567890123456")).toBe(false); // 16 digits
  });

  it("rejects non-numeric characters", () => {
    expect(isValidPhone("abcdefgh")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidPhone("")).toBe(false);
  });
});
