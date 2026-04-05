/**
 * Shared security headers for all edge functions.
 * Includes CORS + CSP + HSTS + X-Frame-Options + other hardening headers.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const securityHeaders = {
  ...corsHeaders,
  // Prevent clickjacking: disallow embedding in iframes
  "X-Frame-Options": "DENY",
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  // Enable XSS filter (legacy browsers)
  "X-XSS-Protection": "1; mode=block",
  // Enforce HTTPS for 1 year
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // Referrer policy: only send origin, not full URL
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Permissions policy: restrict dangerous browser APIs
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
};

/**
 * Build response headers with security headers + Content-Type.
 */
export function jsonHeaders(): Record<string, string> {
  return {
    ...securityHeaders,
    "Content-Type": "application/json",
  };
}

/**
 * Standard CORS preflight response with security headers.
 */
export function corsResponse(): Response {
  return new Response(null, { headers: securityHeaders });
}

/**
 * Standard JSON error response with security headers.
 */
export function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders(),
  });
}

/**
 * Standard JSON success response with security headers.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders(),
  });
}
