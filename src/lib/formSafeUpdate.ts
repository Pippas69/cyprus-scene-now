/**
 * Safe update utilities for React Hook Form + Radix UI components
 * 
 * Prevents "Maximum update depth exceeded" errors by:
 * 1. Deferring state updates out of React's commit phase using queueMicrotask
 * 2. Preventing no-op updates (same value being set repeatedly)
 * 
 * Use these helpers whenever wiring Radix Select/Switch/Checkbox to RHF field.onChange
 */

// Single-flight scheduler: ensures only one update is queued per tick
let pendingUpdate: (() => void) | null = null;
let microtaskScheduled = false;

function scheduleUpdate(fn: () => void) {
  pendingUpdate = fn;
  if (!microtaskScheduled) {
    microtaskScheduled = true;
    queueMicrotask(() => {
      microtaskScheduled = false;
      const update = pendingUpdate;
      pendingUpdate = null;
      if (update) update();
    });
  }
}

/**
 * Safe onChange wrapper for string values (e.g., Radix Select)
 * Only calls onChange if the value actually changed, and defers the call
 */
export function safeSelectChange(
  currentValue: string | undefined | null,
  nextValue: string,
  onChange: (value: string) => void
): void {
  // Normalize empty/null to undefined for comparison
  const normalizedCurrent = currentValue || '';
  const normalizedNext = nextValue || '';
  
  if (normalizedCurrent === normalizedNext) return;
  
  scheduleUpdate(() => onChange(nextValue));
}

/**
 * Safe onChange wrapper for boolean values (e.g., Radix Switch/Checkbox)
 * Only calls onChange if the value actually changed, and defers the call
 */
export function safeBooleanChange(
  currentValue: boolean | undefined,
  nextValue: boolean,
  onChange: (value: boolean) => void
): void {
  if (currentValue === nextValue) return;
  
  scheduleUpdate(() => onChange(nextValue));
}

/**
 * Safe onChange wrapper for array values (e.g., checkbox groups)
 * Only calls onChange if the array actually changed, and defers the call
 */
export function safeArrayChange<T>(
  currentValue: T[] | undefined,
  nextValue: T[],
  onChange: (value: T[]) => void
): void {
  const current = currentValue || [];
  
  // Quick length check
  if (current.length === nextValue.length) {
    // Deep comparison for primitives
    const same = current.every((v, i) => v === nextValue[i]);
    if (same) return;
  }
  
  scheduleUpdate(() => onChange(nextValue));
}

/**
 * Safe onChange wrapper for generic values with custom equality check
 */
export function safeChange<T>(
  currentValue: T,
  nextValue: T,
  onChange: (value: T) => void,
  isEqual: (a: T, b: T) => boolean = (a, b) => a === b
): void {
  if (isEqual(currentValue, nextValue)) return;
  
  scheduleUpdate(() => onChange(nextValue));
}

/**
 * Creates a deferred onChange handler that uses single-flight scheduling
 * Use this when you need to wrap an existing onChange without value comparison
 */
export function createDeferredOnChange<T>(onChange: (value: T) => void): (value: T) => void {
  return (value: T) => {
    scheduleUpdate(() => onChange(value));
  };
}
