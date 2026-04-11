// Constants for Θέατρο «Πεύκιος Γεωργιάδης» (336 seats, 3 sections)

export const PEFKIOS_ZONE_NAMES = ['Αριστερά', 'Κέντρο', 'Δεξιά'] as const;

export type PefkiosSectionKey = typeof PEFKIOS_ZONE_NAMES[number];

// Section definitions with visual properties
export const PEFKIOS_SECTIONS: Record<PefkiosSectionKey, {
  /** CSS rotation in degrees applied to the section block */
  rotationDeg: number;
  /** Default color (overridden by DB zone color) */
  fallbackColor: string;
  /** Label alignment in overview */
  labelAnchor: 'start' | 'middle' | 'end';
}> = {
  'Αριστερά': {
    rotationDeg: -15,
    fallbackColor: '#3b82f6',
    labelAnchor: 'end',
  },
  'Κέντρο': {
    rotationDeg: 0,
    fallbackColor: '#ef4444',
    labelAnchor: 'middle',
  },
  'Δεξιά': {
    rotationDeg: 15,
    fallbackColor: '#22c55e',
    labelAnchor: 'start',
  },
};

// Row order from stage (front) to back
export const PEFKIOS_ROW_ORDER = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν'] as const;

/**
 * Check whether a set of zone names matches the Pefkios theatre layout.
 */
export function isPefkiosVenue(zoneNames: string[]): boolean {
  return PEFKIOS_ZONE_NAMES.every((name) => zoneNames.includes(name));
}
