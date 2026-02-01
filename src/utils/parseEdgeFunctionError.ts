export type EdgeFunctionStructuredError = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};

/**
 * supabase-js returns a FunctionsHttpError for non-2xx responses.
 * Depending on version/runtime, the structured payload may live in:
 * - error.context (Response)
 * - error.context.response (Response)
 * - error.context.body (string)
 *
 * This helper tries to extract `{ error, message }` reliably.
 */
export async function parseEdgeFunctionStructuredError(
  err: unknown
): Promise<EdgeFunctionStructuredError | null> {
  const anyErr: any = err;

  const maybeResponse: Response | undefined =
    anyErr?.context instanceof Response
      ? anyErr.context
      : anyErr?.context?.response instanceof Response
        ? anyErr.context.response
        : undefined;

  // If we have a Response, try to read JSON/text (defensively).
  if (maybeResponse) {
    // Prefer clone() to avoid "body already used" issues.
    try {
      const cloned = maybeResponse.clone();
      const text = await cloned.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          return parsed && typeof parsed === "object" ? (parsed as EdgeFunctionStructuredError) : null;
        } catch {
          // Not JSON
        }
      }
    } catch {
      // ignore
    }

    // Fallback to json() directly.
    try {
      const payload = await maybeResponse.json();
      return payload && typeof payload === "object" ? (payload as EdgeFunctionStructuredError) : null;
    } catch {
      // ignore
    }
  }

  // Some runtimes attach body as string.
  const body = anyErr?.context?.body;
  if (typeof body === "string" && body.trim()) {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === "object" ? (parsed as EdgeFunctionStructuredError) : null;
    } catch {
      // ignore
    }
  }

  // Last-resort: sometimes message contains JSON.
  const msg = anyErr?.message;
  if (typeof msg === "string" && msg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      return parsed && typeof parsed === "object" ? (parsed as EdgeFunctionStructuredError) : null;
    } catch {
      // ignore
    }
  }

  return null;
}
