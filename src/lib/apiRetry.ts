/**
 * Retry & Circuit Breaker utilities for API calls.
 * Provides exponential backoff retries and circuit breaker pattern.
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: any) => boolean;
}

const defaultRetryOn = (error: any): boolean => {
  // Retry on network errors or 5xx
  if (!navigator.onLine) return false; // Don't retry if offline
  if (error?.status >= 500) return true;
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) return true;
  return false;
};

/** Retry a function with exponential backoff */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 500, maxDelayMs = 10000, retryOn = defaultRetryOn } = options;

  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + Math.random() * 200, maxDelayMs);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/** Simple circuit breaker state */
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuits = new Map<string, CircuitState>();

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 30000; // 30 seconds

export function getCircuitState(name: string): CircuitState {
  if (!circuits.has(name)) {
    circuits.set(name, { failures: 0, lastFailure: 0, state: 'closed' });
  }
  return circuits.get(name)!;
}

/** Execute with circuit breaker protection */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  const circuit = getCircuitState(name);

  // Check if circuit should transition from open to half-open
  if (circuit.state === 'open') {
    if (Date.now() - circuit.lastFailure > RESET_TIMEOUT_MS) {
      circuit.state = 'half-open';
    } else {
      if (fallback) return fallback();
      throw new Error(`Circuit breaker '${name}' is open. Service temporarily unavailable.`);
    }
  }

  try {
    const result = await fn();
    // Success: reset circuit
    circuit.failures = 0;
    circuit.state = 'closed';
    return result;
  } catch (error) {
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= FAILURE_THRESHOLD) {
      circuit.state = 'open';
    }

    throw error;
  }
}

/** Combine retry + circuit breaker for robust API calls */
export async function resilientCall<T>(
  circuitName: string,
  fn: () => Promise<T>,
  options?: RetryOptions & { fallback?: () => T }
): Promise<T> {
  return withCircuitBreaker(
    circuitName,
    () => withRetry(fn, options),
    options?.fallback
  );
}
