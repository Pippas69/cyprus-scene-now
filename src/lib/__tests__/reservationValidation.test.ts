import { describe, it, expect } from "vitest";
import { reservationSchema } from "../reservationValidation";

const validData = {
  reservation_name: "Γιώργος",
  party_size: 4,
  phone_number: "+357 99 123456",
  special_requests: "",
  preferred_time: new Date("2024-06-01T20:00:00Z"),
};

describe("reservationSchema", () => {
  it("accepts valid reservation data", () => {
    const result = reservationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = reservationSchema.safeParse({ ...validData, reservation_name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects name with numbers", () => {
    const result = reservationSchema.safeParse({ ...validData, reservation_name: "Test123" });
    expect(result.success).toBe(false);
  });

  it("rejects party_size < 1", () => {
    const result = reservationSchema.safeParse({ ...validData, party_size: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects party_size > 50", () => {
    const result = reservationSchema.safeParse({ ...validData, party_size: 51 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer party_size", () => {
    const result = reservationSchema.safeParse({ ...validData, party_size: 2.5 });
    expect(result.success).toBe(false);
  });

  it("allows empty phone_number", () => {
    const result = reservationSchema.safeParse({ ...validData, phone_number: "" });
    expect(result.success).toBe(true);
  });

  it("allows optional phone_number", () => {
    const { phone_number, ...rest } = validData;
    const result = reservationSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects special_requests over 500 chars", () => {
    const result = reservationSchema.safeParse({
      ...validData,
      special_requests: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts Greek names", () => {
    const result = reservationSchema.safeParse({ ...validData, reservation_name: "Μαρία Παπαδοπούλου" });
    expect(result.success).toBe(true);
  });
});
