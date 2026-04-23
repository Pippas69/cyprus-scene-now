import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface PriceInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** Value in CENTS (integer). E.g. €12.50 → 1250 */
  valueCents: number;
  /** Called with the new value in CENTS (integer). */
  onChangeCents: (cents: number) => void;
  /** Optional minimum cents (default 0). */
  minCents?: number;
  /** Optional maximum cents. */
  maxCents?: number;
  className?: string;
}

/**
 * Premium price input for euro amounts.
 *
 * UX rules:
 * - Stores cents in parent state, but lets the user edit a free-form string
 *   internally so they can fully clear the field with Backspace, type "0.",
 *   etc., without the value snapping back to "0".
 * - Accepts both "." and "," as decimal separators (Greek keyboards).
 * - Limits to 2 decimal digits (euro/cent precision).
 * - On blur, normalizes to a clean "12.50" style string and clamps to bounds.
 */
const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  (
    {
      valueCents,
      onChangeCents,
      minCents = 0,
      maxCents,
      className,
      onBlur,
      onFocus,
      ...rest
    },
    ref
  ) => {
    // Format cents → display string. Empty for 0 only when user has cleared it
    // (we keep an internal flag to differentiate "user is editing" from "external value").
    const formatCents = (cents: number): string => {
      if (!Number.isFinite(cents) || cents <= 0) return "0";
      const euros = cents / 100;
      // Trim trailing zeros but keep at most 2 decimals
      return Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace(/\.?0+$/, "");
    };

    const [internal, setInternal] = React.useState<string>(() => formatCents(valueCents));
    const isFocusedRef = React.useRef(false);

    // Sync from external changes only when not actively editing
    React.useEffect(() => {
      if (!isFocusedRef.current) {
        setInternal(formatCents(valueCents));
      }
    }, [valueCents]);

    const parseToCents = (raw: string): number | null => {
      if (raw === "" || raw === "." || raw === ",") return null;
      const normalized = raw.replace(",", ".");
      const num = parseFloat(normalized);
      if (!Number.isFinite(num)) return null;
      let cents = Math.round(num * 100);
      if (cents < minCents) cents = minCents;
      if (typeof maxCents === "number" && cents > maxCents) cents = maxCents;
      return cents;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;

      // Normalize comma to dot for parsing, but preserve user's separator visually.
      // Strip anything other than digits, "." and ",".
      raw = raw.replace(/[^0-9.,]/g, "");

      // Allow only one decimal separator
      const firstSep = raw.search(/[.,]/);
      if (firstSep !== -1) {
        const head = raw.slice(0, firstSep + 1);
        const tail = raw.slice(firstSep + 1).replace(/[.,]/g, "");
        raw = head + tail;
      }

      // Limit to 2 decimal digits
      const sepIdx = raw.search(/[.,]/);
      if (sepIdx !== -1) {
        const intPart = raw.slice(0, sepIdx);
        const sep = raw[sepIdx];
        const decPart = raw.slice(sepIdx + 1).slice(0, 2);
        raw = intPart + sep + decPart;
      }

      // Strip leading zeros like "07" → "7", but keep "0", "0.x"
      if (/^0\d/.test(raw)) {
        raw = raw.replace(/^0+/, "");
        if (raw === "") raw = "0";
      }

      setInternal(raw);

      const cents = parseToCents(raw);
      if (cents === null) {
        // User cleared field or typed only a separator — treat as 0 in parent state
        // but keep the visual field empty/partial.
        onChangeCents(minCents);
      } else {
        onChangeCents(cents);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      // On blur, normalize to a tidy string based on the committed cents value
      const cents = parseToCents(internal);
      const finalCents = cents === null ? minCents : cents;
      onChangeCents(finalCents);
      setInternal(formatCents(finalCents));
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={internal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(className)}
        {...rest}
      />
    );
  }
);
PriceInput.displayName = "PriceInput";

export { PriceInput };
