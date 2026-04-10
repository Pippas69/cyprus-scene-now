// Shared constants and helpers for the theatre horseshoe layout

export const CX = 300;
export const CY = 340;
export const INNER_R = 100;
export const OUTER_R = 260;

// Arc spans proportional to actual seat counts (Α:206 Β:269 Γ:267 Δ:234 | Ε:270 Ζ:261 Η:278 Θ:217)
export const ZONE_ARCS: Record<string, { startDeg: number; endDeg: number; inner?: number; outer?: number }> = {
  'Τμήμα Α': { startDeg: 184, endDeg: 200 },
  'Τμήμα Β': { startDeg: 202, endDeg: 222 },
  'Τμήμα Γ': { startDeg: 224, endDeg: 244 },
  'Τμήμα Δ': { startDeg: 246, endDeg: 264 },
  'Τμήμα Ε': { startDeg: 270, endDeg: 291 },
  'Τμήμα Ζ': { startDeg: 293, endDeg: 313 },
  'Τμήμα Η': { startDeg: 315, endDeg: 336 },
  'Τμήμα Θ': { startDeg: 338, endDeg: 354 },
};

// Greek row labels in order (innermost to outermost)
export const ROW_ORDER = ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ'];

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function annularSectorPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number
): string {
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;

  const ox1 = cx + outerR * Math.cos(s);
  const oy1 = cy + outerR * Math.sin(s);
  const ox2 = cx + outerR * Math.cos(e);
  const oy2 = cy + outerR * Math.sin(e);
  const ix1 = cx + innerR * Math.cos(e);
  const iy1 = cy + innerR * Math.sin(e);
  const ix2 = cx + innerR * Math.cos(s);
  const iy2 = cy + innerR * Math.sin(s);

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

export function midPoint(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const mid = ((startDeg + endDeg) / 2) * (Math.PI / 180);
  return { x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid) };
}
