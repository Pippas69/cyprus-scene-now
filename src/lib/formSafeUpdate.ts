/**
 * Safe update utilities for React Hook Form + Radix UI components
 * 
 * Prevents "Maximum update depth exceeded" errors and browser freezes by:
 * 1. Using MACROTASK deferral (setTimeout) to let the browser breathe
 * 2. Using single-flight scheduling so rapid updates collapse into one
 * 3. Preventing no-op updates (same value being set repeatedly)
 * 4. Adding loop detection to prevent runaway update storms
 * 
 * Use these helpers whenever wiring Radix Select/Switch/Checkbox to RHF field.onChange
 */

// Per-key single-flight scheduler using macrotasks (setTimeout)
// This ensures only ONE update fires per unique key, and the browser can process events between updates
const pendingUpdates = new Map<string, () => void>();
const scheduledTimers = new Map<string, number>();

// Loop detection: track update frequency
const updateCounts = new Map<string, { count: number; firstTime: number }>();
const LOOP_THRESHOLD = 50; // Max updates per window
const LOOP_WINDOW_MS = 1000; // Time window for detection

function detectLoop(key: string): boolean {
  const now = Date.now();
  const record = updateCounts.get(key);
  
  if (!record || now - record.firstTime > LOOP_WINDOW_MS) {
    // Reset counter for new window
    updateCounts.set(key, { count: 1, firstTime: now });
    return false;
  }
  
  record.count++;
  if (record.count > LOOP_THRESHOLD) {
    console.error(`[formSafeUpdate] Loop detected for key "${key}": ${record.count} updates in ${now - record.firstTime}ms. Blocking further updates.`);
    return true;
  }
  
  return false;
}

function scheduleUpdate(key: string, fn: () => void) {
  // Check for runaway loop
  if (detectLoop(key)) {
    return; // Silently drop to prevent freeze
  }
  
  // Store latest update (last-write-wins)
  pendingUpdates.set(key, fn);
  
  // If no timer scheduled for this key, schedule one
  if (!scheduledTimers.has(key)) {
    const timerId = window.setTimeout(() => {
      scheduledTimers.delete(key);
      const update = pendingUpdates.get(key);
      pendingUpdates.delete(key);
      if (update) {
        update();
      }
    }, 0); // Macrotask - yields to browser
    
    scheduledTimers.set(key, timerId);
  }
}

// Global key counter for anonymous schedulers
let anonymousKeyCounter = 0;

/**
 * Creates a unique scheduler key for a component instance
 * Call this once in useRef or useMemo to get a stable key
 */
export function createSchedulerKey(prefix = 'form'): string {
  return `${prefix}_${++anonymousKeyCounter}_${Date.now()}`;
}

/**
 * Safe onChange wrapper for string values (e.g., Radix Select)
 * Only calls onChange if the value actually changed, and defers the call
 */
export function safeSelectChange(
  currentValue: string | undefined | null,
  nextValue: string,
  onChange: (value: string) => void,
  schedulerKey = 'select'
): void {
  // Normalize empty/null to undefined for comparison
  const normalizedCurrent = currentValue || '';
  const normalizedNext = nextValue || '';
  
  if (normalizedCurrent === normalizedNext) return;
  
  scheduleUpdate(schedulerKey, () => onChange(nextValue));
}

/**
 * Safe onChange wrapper for boolean values (e.g., Radix Switch/Checkbox)
 * Only calls onChange if the value actually changed, and defers the call
 */
export function safeBooleanChange(
  currentValue: boolean | undefined,
  nextValue: boolean,
  onChange: (value: boolean) => void,
  schedulerKey = 'boolean'
): void {
  if (currentValue === nextValue) return;
  
  scheduleUpdate(schedulerKey, () => onChange(nextValue));
}

/**
 * Safe onChange wrapper for array values (e.g., checkbox groups)
 * Only calls onChange if the array actually changed, and defers the call
 */
export function safeArrayChange<T>(
  currentValue: T[] | undefined,
  nextValue: T[],
  onChange: (value: T[]) => void,
  schedulerKey = 'array'
): void {
  const current = currentValue || [];
  
  // Quick length check
  if (current.length === nextValue.length) {
    // Deep comparison for primitives
    const same = current.every((v, i) => v === nextValue[i]);
    if (same) return;
  }
  
  scheduleUpdate(schedulerKey, () => onChange(nextValue));
}

/**
 * Safe onChange wrapper for generic values with custom equality check
 */
export function safeChange<T>(
  currentValue: T,
  nextValue: T,
  onChange: (value: T) => void,
  isEqual: (a: T, b: T) => boolean = (a, b) => a === b,
  schedulerKey = 'generic'
): void {
  if (isEqual(currentValue, nextValue)) return;
  
  scheduleUpdate(schedulerKey, () => onChange(nextValue));
}

/**
 * Creates a deferred onChange handler that uses single-flight macrotask scheduling
 * Use this when you need to wrap an existing onChange without value comparison
 */
export function createDeferredOnChange<T>(
  onChange: (value: T) => void,
  schedulerKey = 'deferred'
): (value: T) => void {
  return (value: T) => {
    scheduleUpdate(schedulerKey, () => onChange(value));
  };
}

/**
 * Creates a scheduler for complex state updates (like SeatingTypeEditor)
 * Returns a function that accepts the new value and schedules a single update
 */
export function createSingleFlightScheduler<T>(
  schedulerKey: string
): {
  schedule: (getValue: () => T, onChange: (value: T) => void) => void;
  cancel: () => void;
} {
  return {
    schedule: (getValue: () => T, onChange: (value: T) => void) => {
      scheduleUpdate(schedulerKey, () => {
        const value = getValue();
        onChange(value);
      });
    },
    cancel: () => {
      const timerId = scheduledTimers.get(schedulerKey);
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        scheduledTimers.delete(schedulerKey);
      }
      pendingUpdates.delete(schedulerKey);
    }
  };
}
