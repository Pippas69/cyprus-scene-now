/**
 * Simple in-memory rate limiter for edge functions.
 * Uses a sliding window approach per IP address.
 * 
 * Note: Since edge functions can run on multiple isolates,
 * this provides per-isolate rate limiting. For distributed
 * rate limiting across all isolates, use the database-backed approach.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Database-backed rate limiter using rate_limit_entries table.
 * Works across all edge function isolates.
 * 
 * @param identifier - Unique key (e.g., IP address, user ID, or combo)
 * @param action - Action name (e.g., 'login', 'signup', 'password_reset')
 * @param maxAttempts - Max attempts allowed in the window
 * @param windowMinutes - Time window in minutes
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const key = `${action}:${identifier}`;

  // Count recent attempts
  const { count, error } = await supabase
    .from("rate_limit_entries")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart);

  if (error) {
    // If rate limit check fails, allow the request (fail open)
    console.error("Rate limit check failed:", error.message);
    return { allowed: true, remaining: maxAttempts };
  }

  const currentCount = count || 0;

  if (currentCount >= maxAttempts) {
    // Get oldest entry to calculate retry-after
    const { data: oldest } = await supabase
      .from("rate_limit_entries")
      .select("created_at")
      .eq("key", key)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const retryAfter = oldest
      ? Math.ceil((new Date(oldest.created_at).getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000)
      : windowMinutes * 60;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfter, 1),
    };
  }

  // Record this attempt
  await supabase.from("rate_limit_entries").insert({
    key,
    action,
    identifier,
  });

  return {
    allowed: true,
    remaining: maxAttempts - currentCount - 1,
  };
}

/**
 * Get client IP from request headers.
 * Checks common proxy headers.
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
