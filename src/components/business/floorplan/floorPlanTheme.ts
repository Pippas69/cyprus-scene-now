export const FIXTURE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bar: { bg: 'hsl(var(--primary) / 0.10)', border: 'hsl(var(--primary) / 0.45)', text: 'hsl(var(--primary))' },
  dj: { bg: 'hsl(var(--accent) / 0.10)', border: 'hsl(var(--accent) / 0.45)', text: 'hsl(var(--accent))' },
  stage: { bg: 'hsl(var(--accent) / 0.08)', border: 'hsl(var(--accent) / 0.35)', text: 'hsl(var(--accent))' },
  entrance: { bg: 'hsl(var(--muted) / 0.15)', border: 'hsl(var(--muted-foreground) / 0.25)', text: 'hsl(var(--muted-foreground))' },
  kitchen: { bg: 'hsl(var(--muted) / 0.12)', border: 'hsl(var(--muted-foreground) / 0.2)', text: 'hsl(var(--muted-foreground))' },
  restroom: { bg: 'hsl(var(--muted) / 0.12)', border: 'hsl(var(--muted-foreground) / 0.2)', text: 'hsl(var(--muted-foreground))' },
  other: { bg: 'hsl(var(--muted) / 0.12)', border: 'hsl(var(--muted-foreground) / 0.2)', text: 'hsl(var(--muted-foreground))' },
};

export const SVG_THEME = {
  // Table states
  available: {
    fill: 'hsl(var(--primary) / 0.08)',
    stroke: 'hsl(var(--primary) / 0.6)',
    text: 'hsl(var(--primary))',
    glow: 'none',
  },
  reserved: {
    fill: 'hsl(var(--accent) / 0.15)',
    stroke: 'hsl(var(--accent))',
    text: 'hsl(var(--accent))',
    glow: 'drop-shadow(0 0 6px hsl(var(--accent) / 0.4))',
  },
  occupied: {
    fill: 'hsl(var(--destructive) / 0.12)',
    stroke: 'hsl(var(--destructive) / 0.7)',
    text: 'hsl(var(--destructive))',
    glow: 'drop-shadow(0 0 4px hsl(var(--destructive) / 0.3))',
  },
  selected: {
    fill: 'hsl(var(--primary) / 0.25)',
    stroke: 'hsl(var(--primary))',
    text: 'hsl(var(--primary))',
    glow: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))',
  },
  // Seats
  seatFill: 'hsl(var(--primary) / 0.5)',
  seatStroke: 'hsl(var(--primary) / 0.3)',
  // Canvas
  canvasBg: 'radial-gradient(circle at 12% 14%, hsl(var(--primary) / 0.08) 0%, transparent 52%), linear-gradient(145deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.2) 100%)',
  gridDot: 'hsl(var(--primary) / 0.05)',
  gridSize: 20,
};

export const DEFAULT_CANVAS_ASPECT = 4 / 3;
export const DEFAULT_TABLE_SIZE = { w: 4, h: 4 };
export const TABLE_HIT_PADDING = 1.2; // Extra % around bbox for easier clicking

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const getRenderTableBox = (
  shape: string,
  rawBox: { w: number; h: number }
) => {
  const safeW = clamp(rawBox.w || DEFAULT_TABLE_SIZE.w, 1.2, 18);
  const safeH = clamp(rawBox.h || DEFAULT_TABLE_SIZE.h, 1.2, 18);

  if (shape === 'round') {
    const size = clamp((safeW + safeH) / 2, 1.4, 18);
    return { w: size, h: size };
  }
  if (shape === 'square') {
    const side = clamp((safeW + safeH) / 2, 1.2, 18);
    return { w: side, h: side };
  }
  return { w: safeW, h: safeH };
};
