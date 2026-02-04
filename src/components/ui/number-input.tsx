import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, min = 1, max = 999, step = 1, ...props }, ref) => {
    // Track internal string value to allow empty field during editing
    const [internalValue, setInternalValue] = React.useState(String(value));
    
    // Sync internal value when external value changes
    React.useEffect(() => {
      setInternalValue(String(value));
    }, [value]);

    const handleIncrement = () => {
      const newValue = Math.min(value + step, max);
      onChange(newValue);
      setInternalValue(String(newValue));
    };

    const handleDecrement = () => {
      const newValue = Math.max(value - step, min);
      onChange(newValue);
      setInternalValue(String(newValue));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Allow empty string during editing
      if (rawValue === '') {
        setInternalValue('');
        return;
      }
      
      // Only allow digits
      if (!/^\d*$/.test(rawValue)) {
        return;
      }
      
      setInternalValue(rawValue);
      const parsed = parseInt(rawValue, 10);
      if (!isNaN(parsed)) {
        onChange(Math.min(Math.max(parsed, min), max));
      }
    };

    const handleBlur = () => {
      // On blur, if empty or invalid, reset to min
      if (internalValue === '' || isNaN(parseInt(internalValue, 10))) {
        setInternalValue(String(min));
        onChange(min);
      } else {
        // Ensure value is within bounds
        const parsed = parseInt(internalValue, 10);
        const bounded = Math.min(Math.max(parsed, min), max);
        setInternalValue(String(bounded));
        onChange(bounded);
      }
    };

    return (
      <div className={cn("relative flex items-center", className)}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          ref={ref}
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "w-full h-full rounded-md border border-input bg-background pl-1.5 pr-4 py-0.5 text-center text-xs sm:text-sm",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...props}
        />
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col">
          <button
            type="button"
            onClick={handleIncrement}
            className="h-2 w-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <ChevronUp className="h-2 w-2" />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className="h-2 w-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <ChevronDown className="h-2 w-2" />
          </button>
        </div>
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
