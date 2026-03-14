import { useCallback, useMemo } from 'react';

export interface VenueItem {
  id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
  fixture_type: string | null;
  zone_id: string | null;
}

export interface VenueBBox {
  w: number;
  h: number;
}

export interface TableAssignment {
  zone_id: string;
  reservation_id: string;
  reservation_name: string;
  party_size: number;
}

interface VenueSVGCanvasProps {
  items: VenueItem[];
  fixtureBboxes: Record<string, VenueBBox>;
  tableBboxes: Record<string, VenueBBox>;
  selectedItemId?: string | null;
  showLabels?: boolean;
  assignments?: TableAssignment[];
  currentReservationId?: string;
  onTableClick?: (id: string) => void;
  onItemMouseDown?: (e: React.MouseEvent, id: string) => void;
  onItemDoubleClick?: (id: string) => void;
  interactive?: boolean;
}

type RenderShape = 'round' | 'square' | 'rectangle';

type Geometry = {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: RenderShape;
};

const THEME = {
  canvasGrid: 'hsl(var(--floorplan-neon) / 0.06)',
  wall: 'hsl(var(--floorplan-wall) / 0.75)',
  wallSecondary: 'hsl(var(--floorplan-wall) / 0.45)',

  fixtureFill: 'hsl(var(--floorplan-neon) / 0.08)',
  fixtureStroke: 'hsl(var(--floorplan-neon) / 0.55)',
  fixtureText: 'hsl(var(--floorplan-neon) / 0.85)',

  tableStroke: 'hsl(var(--floorplan-neon))',
  tableFill: 'hsl(var(--floorplan-neon) / 0.1)',
  tableSelectedFill: 'hsl(var(--floorplan-neon) / 0.22)',
  tableText: 'hsl(var(--floorplan-neon))',
  tableMeta: 'hsl(var(--foreground) / 0.6)',

  occupiedStroke: 'hsl(var(--destructive))',
  occupiedFill: 'hsl(var(--destructive) / 0.18)',
  selfStroke: 'hsl(var(--accent))',
  selfFill: 'hsl(var(--accent) / 0.18)',
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const normalizeKey = (label: string) => label.trim().toUpperCase().replace(/\s+/g, '');

const buildBlueprintTableGeometry = (): Record<string, Geometry> => {
  const map: Record<string, Geometry> = {};

  // 101-110 (left architectural column)
  for (let i = 0; i < 10; i += 1) {
    map[String(101 + i)] = {
      x: 2.2,
      y: 12.5 + i * 8.0,
      w: 6.7,
      h: 6.2,
      shape: 'rectangle',
    };
  }

  // P1-P9 (booths next to 101-110)
  for (let i = 0; i < 9; i += 1) {
    map[`P${i + 1}`] = {
      x: 16.2,
      y: 10.8 + i * 9.4,
      w: 10.4,
      h: 3.1,
      shape: 'rectangle',
    };
  }

  // 23-29 (parallel line right of P-series)
  for (let i = 0; i < 7; i += 1) {
    map[String(23 + i)] = {
      x: 29.1,
      y: 11.4 + i * 10.1,
      w: 5.7,
      h: 5.0,
      shape: 'square',
    };
  }

  // Top cluster 20-22
  map['20'] = { x: 42.3, y: 10.8, w: 5.9, h: 4.9, shape: 'square' };
  map['21'] = { x: 35.5, y: 15.8, w: 5.9, h: 4.9, shape: 'square' };
  map['22'] = { x: 28.7, y: 10.8, w: 5.9, h: 4.9, shape: 'square' };

  // Around central BAR (requested: 7-10)
  map['10'] = { x: 49.8, y: 36.2, w: 6.0, h: 5.7, shape: 'square' };
  map['9'] = { x: 49.8, y: 46.5, w: 6.0, h: 5.7, shape: 'square' };
  map['8'] = { x: 49.8, y: 56.8, w: 6.0, h: 5.7, shape: 'square' };
  map['7'] = { x: 49.8, y: 67.1, w: 6.0, h: 5.7, shape: 'square' };

  // Remaining front line
  map['6'] = { x: 58.2, y: 81.9, w: 8.1, h: 4.1, shape: 'rectangle' };
  map['5'] = { x: 68.5, y: 80.8, w: 6.1, h: 5.0, shape: 'square' };
  map['4'] = { x: 78.4, y: 80.8, w: 6.1, h: 5.0, shape: 'square' };

  // Right side near DJ zone
  map['1'] = { x: 69.6, y: 19.2, w: 4.3, h: 10.8, shape: 'rectangle' };
  map['2'] = { x: 83.2, y: 23.2, w: 10.0, h: 4.2, shape: 'rectangle' };
  map['3'] = { x: 83.2, y: 55.4, w: 10.0, h: 4.2, shape: 'rectangle' };

  return map;
};

const BLUEPRINT_TABLES = buildBlueprintTableGeometry();

const BLUEPRINT_FIXTURES: Record<string, Geometry> = {
  BAR: { x: 56.1, y: 21.0, w: 25.8, h: 53.0, shape: 'rectangle' },
  BAR1: { x: 24.2, y: 5.3, w: 10.2, h: 6.0, shape: 'rectangle' },
  BAR2: { x: 24.2, y: 90.5, w: 10.2, h: 6.0, shape: 'rectangle' },
  DJ: { x: 76.6, y: 44.0, w: 14.6, h: 18.0, shape: 'rectangle' },
};

function inferShape(shape: string): RenderShape {
  if (shape === 'round') return 'round';
  if (shape === 'rectangle') return 'rectangle';
  return 'square';
}

function ArchitecturalWalls({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <rect
        x={1.2}
        y={1.2}
        width={97.6}
        height={97.6}
        rx={1.4}
        fill="none"
        stroke={THEME.wall}
        strokeWidth={0.6}
      />
    );
  }

  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {/* Outer architectural border */}
      <rect x={1.5} y={1.5} width={97} height={97} rx={1.2} fill="none" stroke={THEME.wall} strokeWidth={0.7} />

      {/* Left seating corridor boundaries */}
      <line x1={14.1} y1={3.8} x2={14.1} y2={96.1} stroke={THEME.wall} strokeWidth={0.5} />
      <line x1={27.2} y1={7.2} x2={27.2} y2={95.4} stroke={THEME.wallSecondary} strokeWidth={0.45} />

      {/* Left corridor service ticks (n1..n9 equivalent) */}
      <line x1={14.1} y1={16.6} x2={20.1} y2={16.6} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={25.9} x2={20.1} y2={25.9} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={35.2} x2={20.1} y2={35.2} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={44.5} x2={20.1} y2={44.5} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={53.8} x2={20.1} y2={53.8} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={63.1} x2={20.1} y2={63.1} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={72.4} x2={20.1} y2={72.4} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={81.7} x2={20.1} y2={81.7} stroke={THEME.wallSecondary} strokeWidth={0.32} />
      <line x1={14.1} y1={91.0} x2={20.1} y2={91.0} stroke={THEME.wallSecondary} strokeWidth={0.32} />

      {/* Top right architecture lines */}
      <line x1={53.2} y1={16.7} x2={98.2} y2={16.7} stroke={THEME.wall} strokeWidth={0.46} />
      <line x1={53.2} y1={22.1} x2={88.9} y2={22.1} stroke={THEME.wallSecondary} strokeWidth={0.36} />

      {/* Right zone frame around bar + DJ */}
      <rect x={65.4} y={14.1} width={31.4} height={62.5} rx={2.1} fill="none" stroke={THEME.wallSecondary} strokeWidth={0.48} />

      {/* Lower right L-shape wall */}
      <line x1={74.6} y1={84.6} x2={98.1} y2={84.6} stroke={THEME.wall} strokeWidth={0.5} />
      <line x1={74.6} y1={84.6} x2={74.6} y2={98.2} stroke={THEME.wall} strokeWidth={0.5} />

      {/* Subtle central divider */}
      <line x1={48.2} y1={30.2} x2={48.2} y2={75.8} stroke={THEME.wallSecondary} strokeWidth={0.34} />
    </g>
  );
}

export function VenueSVGCanvas({
  items,
  fixtureBboxes,
  tableBboxes,
  selectedItemId,
  showLabels = true,
  assignments = [],
  currentReservationId,
  onTableClick,
  onItemMouseDown,
  onItemDoubleClick,
  interactive = true,
}: VenueSVGCanvasProps) {
  const fixtureItems = items.filter((i) => !!i.fixture_type);
  const tableItems = items.filter((i) => !i.fixture_type);

  const hasBlueprintSignature = useMemo(() => {
    const labels = new Set(items.map((i) => normalizeKey(i.label)));
    return (
      labels.has('BAR') &&
      labels.has('DJ') &&
      labels.has('101') &&
      labels.has('110') &&
      labels.has('P1') &&
      labels.has('P9') &&
      labels.has('23') &&
      labels.has('29')
    );
  }, [items]);

  const isOccupied = useCallback(
    (item: VenueItem) => {
      if (!item.zone_id || assignments.length === 0) return false;
      return assignments.some((a) => a.zone_id === item.zone_id && a.reservation_id !== currentReservationId);
    },
    [assignments, currentReservationId],
  );

  const isSelf = useCallback(
    (item: VenueItem) => {
      if (!item.zone_id || !currentReservationId || assignments.length === 0) return false;
      return assignments.some((a) => a.zone_id === item.zone_id && a.reservation_id === currentReservationId);
    },
    [assignments, currentReservationId],
  );

  const resolveFixtureGeometry = (item: VenueItem): Geometry => {
    if (hasBlueprintSignature) {
      const mapped = BLUEPRINT_FIXTURES[normalizeKey(item.label)];
      if (mapped) return mapped;
    }

    const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
    return {
      x: item.x_percent,
      y: item.y_percent,
      w: clamp(bbox.w * 1.1, 5, 40),
      h: clamp(bbox.h * 1.1, 4, 45),
      shape: 'rectangle',
    };
  };

  const resolveTableGeometry = (item: VenueItem): Geometry => {
    const key = normalizeKey(item.label);
    if (hasBlueprintSignature && BLUEPRINT_TABLES[key]) {
      return BLUEPRINT_TABLES[key];
    }

    const bbox = tableBboxes[item.label] || { w: 4.8, h: 4.8 };
    const shape = inferShape(item.shape);
    let w = clamp(bbox.w * 1.22, 3.2, 20);
    let h = clamp(bbox.h * 1.22, 3.2, 20);

    if (shape === 'square' || shape === 'round') {
      const side = clamp((w + h) / 2, 3.6, 20);
      w = side;
      h = side;
    }

    return { x: item.x_percent, y: item.y_percent, w, h, shape };
  };

  const allowDrag = interactive && !hasBlueprintSignature && !!onItemMouseDown;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="floor-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.1" fill={THEME.canvasGrid} />
        </pattern>
      </defs>

      <rect x={0} y={0} width={100} height={100} fill="url(#floor-grid)" />
      <ArchitecturalWalls enabled={hasBlueprintSignature} />

      {/* Fixtures */}
      {fixtureItems.map((item) => {
        const g = resolveFixtureGeometry(item);
        const centerX = g.x + g.w / 2;
        const centerY = g.y + g.h / 2;
        const isDj = normalizeKey(item.label) === 'DJ';

        return (
          <g key={item.id}>
            <rect
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              rx={isDj ? 0.7 : 0.45}
              fill={THEME.fixtureFill}
              stroke={THEME.fixtureStroke}
              strokeWidth={normalizeKey(item.label) === 'BAR' ? 0.55 : 0.38}
            />

            {normalizeKey(item.label) === 'BAR' && (
              <rect
                x={g.x + g.w * 0.07}
                y={g.y + g.h * 0.05}
                width={g.w * 0.86}
                height={g.h * 0.9}
                rx={0.32}
                fill="none"
                stroke={THEME.fixtureStroke}
                strokeWidth={0.16}
                opacity={0.55}
              />
            )}

            {isDj && (
              <circle
                cx={centerX}
                cy={centerY}
                r={Math.min(g.w, g.h) * 0.21}
                fill="none"
                stroke={THEME.fixtureStroke}
                strokeWidth={0.2}
                opacity={0.8}
              />
            )}

            {showLabels && (
              <text
                x={centerX}
                y={centerY + 0.28}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={THEME.fixtureText}
                fontSize={normalizeKey(item.label) === 'BAR' ? 5.7 : 2.9}
                fontWeight={normalizeKey(item.label) === 'BAR' ? 800 : 700}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.03em' }}
                className="pointer-events-none"
              >
                {item.label.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}

      {/* Tables */}
      {tableItems.map((item) => {
        const g = resolveTableGeometry(item);
        const cx = g.x + g.w / 2;
        const cy = g.y + g.h / 2;

        const selected = selectedItemId === item.id;
        const occupied = isOccupied(item);
        const self = isSelf(item);

        let fill = THEME.tableFill;
        let stroke = THEME.tableStroke;
        let strokeWidth = selected ? 0.56 : 0.38;

        if (occupied) {
          fill = THEME.occupiedFill;
          stroke = THEME.occupiedStroke;
          strokeWidth = selected ? 0.56 : 0.42;
        } else if (self) {
          fill = THEME.selfFill;
          stroke = THEME.selfStroke;
        } else if (selected) {
          fill = THEME.tableSelectedFill;
        }

        const mainFont = Math.min(g.w, g.h) > 5 ? 2.1 : 1.65;
        const seatsFont = Math.max(0.88, mainFont * 0.56);

        const handleMouseDown = allowDrag && onItemMouseDown
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onItemMouseDown(e, item.id);
            }
          : undefined;

        return (
          <g
            key={item.id}
            onClick={interactive && onTableClick ? () => onTableClick(item.id) : undefined}
            onMouseDown={handleMouseDown}
            onDoubleClick={
              onItemDoubleClick
                ? (e) => {
                    e.stopPropagation();
                    onItemDoubleClick(item.id);
                  }
                : undefined
            }
            className={interactive ? 'cursor-pointer' : ''}
          >
            {g.shape === 'round' ? (
              <circle cx={cx} cy={cy} r={g.w / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            ) : (
              <rect
                x={g.x}
                y={g.y}
                width={g.w}
                height={g.h}
                rx={g.shape === 'rectangle' ? 0.28 : 0.62}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            )}

            {showLabels && (
              <>
                <text
                  x={cx}
                  y={cy - (item.seats > 0 ? seatsFont * 0.4 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={occupied ? THEME.occupiedStroke : THEME.tableText}
                  fontSize={mainFont}
                  fontWeight={700}
                  className="pointer-events-none"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {item.label}
                </text>
                {item.seats > 0 && (
                  <text
                    x={cx}
                    y={cy + mainFont * 0.55}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={THEME.tableMeta}
                    fontSize={seatsFont}
                    fontWeight={600}
                    className="pointer-events-none"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {item.seats}p
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
