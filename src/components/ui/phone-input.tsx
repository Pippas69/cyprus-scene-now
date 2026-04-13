import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRY_CODES, getCountryByCode, parseE164Phone, buildE164Phone } from '@/lib/countries';
import { cn } from '@/lib/utils';

export interface PhoneInputProps {
  /** Full E.164 value, e.g. "+35799123456" */
  value: string;
  /** Called with E.164 formatted phone */
  onChange: (e164: string) => void;
  /** Language for country names */
  language?: 'el' | 'en';
  /** Placeholder override — if not set, shows country-specific example */
  placeholder?: string;
  /** Additional className for the wrapper */
  className?: string;
  /** Additional className for the input */
  inputClassName?: string;
  /** Additional className for the select trigger */
  selectClassName?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Input id */
  id?: string;
}

/**
 * International phone input with country code selector.
 * Default: Cyprus (+357). Stores and returns full E.164 format.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, language = 'el', placeholder, className, inputClassName, selectClassName, disabled, id }, ref) => {
    // Parse the incoming E.164 value to determine country and local number
    const parsed = useMemo(() => parseE164Phone(value), [value]);
    const [countryCode, setCountryCode] = useState(parsed?.countryCode || 'CY');
    const [localNumber, setLocalNumber] = useState(parsed?.localNumber || '');
    const [searchQuery, setSearchQuery] = useState('');

    // Sync from external value changes
    useEffect(() => {
      if (!value) {
        setLocalNumber('');
        return;
      }
      const p = parseE164Phone(value);
      if (p) {
        setCountryCode(p.countryCode);
        setLocalNumber(p.localNumber);
      } else {
        // If value doesn't start with +, treat as raw local number
        const digits = value.replace(/\D/g, '');
        setLocalNumber(digits);
      }
    }, [value]);

    const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/[^\d]/g, '');
      setLocalNumber(digits);
      onChange(buildE164Phone(countryCode, digits));
    };

    const handleCountryChange = (newCode: string) => {
      setCountryCode(newCode);
      setSearchQuery('');
      onChange(buildE164Phone(newCode, localNumber));
    };

    const country = getCountryByCode(countryCode);
    const displayLabel = country ? `${country.flag} ${country.dial}` : '🇨🇾 +357';

    const filteredCountries = useMemo(() => {
      if (!searchQuery.trim()) return COUNTRY_CODES;
      const q = searchQuery.toLowerCase();
      return COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.nameEl.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
      );
    }, [searchQuery]);

    return (
      <div className={cn('flex gap-2', className)}>
        <Select value={countryCode} onValueChange={handleCountryChange} disabled={disabled}>
          <SelectTrigger className={cn('w-[120px] shrink-0', selectClassName)}>
            <SelectValue>{displayLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[280px]">
            <div className="px-2 pb-2 pt-1">
              <Input
                placeholder={language === 'el' ? 'Αναζήτηση χώρας...' : 'Search country...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            {filteredCountries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {language === 'el' ? c.nameEl : c.name} ({c.dial})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          id={id}
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={handleLocalChange}
          placeholder={placeholder || (country?.code === 'CY' ? '99123456' : country?.code === 'GR' ? '6912345678' : '...')}
          disabled={disabled}
          className={cn('flex-1', inputClassName)}
        />
      </div>
    );
  }
);
PhoneInput.displayName = 'PhoneInput';
