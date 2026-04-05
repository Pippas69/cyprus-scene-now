/**
 * Shared Zod validation schemas and helpers for edge functions.
 * 
 * Usage:
 *   import { z, parseBody, uuid, safeString, email } from "../_shared/validation.ts";
 *   
 *   const Schema = z.object({ id: uuid, name: safeString(200) });
 *   const data = await parseBody(req, Schema);
 */

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export { z };

// ── Reusable field schemas ──────────────────────────────────────────

/** UUID v4 string */
export const uuid = z.string().uuid();

/** UUID that also accepts non-v4 Supabase-generated IDs (36 chars, hex + dashes) */
export const flexId = z.string().min(10).max(100).regex(/^[a-zA-Z0-9_-]+$/);

/** Safe string: trimmed, with max length, no null bytes */
export const safeString = (max = 500) =>
  z.string().trim().min(1).max(max).refine((s) => !s.includes("\0"), "Invalid characters");

/** Optional safe string (can be empty/missing) */
export const optionalString = (max = 500) =>
  z.string().trim().max(max).refine((s) => !s.includes("\0"), "Invalid characters").optional().or(z.literal(""));

/** Email field */
export const email = z.string().trim().email().max(320).toLowerCase();

/** Optional email */
export const optionalEmail = z.string().trim().email().max(320).toLowerCase().optional().or(z.literal(""));

/** Phone number: digits, spaces, + - ( ) only, max 25 chars */
export const phone = z.string().trim().max(25).regex(/^[0-9+\-() ]+$/);

/** Optional phone */
export const optionalPhone = phone.optional().or(z.literal(""));

/** Positive integer */
export const positiveInt = z.number().int().positive();

/** Non-negative integer (0 or more) */
export const nonNegativeInt = z.number().int().nonnegative();

/** Price in cents (non-negative integer) */
export const priceCents = z.number().int().nonnegative().max(100_000_00); // max €100,000

/** Language code */
export const language = z.enum(["el", "en"]).default("en");

/** Date string (ISO or YYYY-MM-DD) */
export const dateString = z.string().trim().min(8).max(30);

/** URL string */
export const urlString = z.string().trim().url().max(2048);

/** Optional URL */
export const optionalUrl = urlString.optional().or(z.literal(""));

/** Boolean with default false */
export const boolDefault = (def = false) => z.boolean().default(def);

/** Boost tier */
export const boostTier = z.enum(["standard", "premium"]);

/** Duration mode */
export const durationMode = z.enum(["daily", "hourly"]).default("daily");

/** Billing cycle */
export const billingCycle = z.enum(["monthly", "annual", "yearly"]);

/** Notification event type */
export const notificationEventType = z.string().trim().min(1).max(100);

// ── Parse helpers ───────────────────────────────────────────────────

/**
 * Parse and validate request JSON body against a Zod schema.
 * Returns the validated data or throws a ValidationError.
 */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    throw new ValidationError("Invalid or missing JSON body");
  }

  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const errors = result.error.flatten();
    const fieldErrors = errors.fieldErrors;
    const formErrors = errors.formErrors;
    const details = Object.keys(fieldErrors).length > 0
      ? fieldErrors
      : formErrors.length > 0
        ? formErrors
        : result.error.message;
    throw new ValidationError("Validation failed", details);
  }

  return result.data;
}

/**
 * Custom error class for validation failures.
 * Includes structured details about which fields failed.
 */
export class ValidationError extends Error {
  public details: unknown;
  public statusCode = 400;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Create a 400 response for validation errors.
 */
export function validationErrorResponse(
  error: ValidationError,
  headers: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: error.message,
      details: error.details,
    }),
    {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    }
  );
}
