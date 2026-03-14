import { useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────
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
  // Assignment mode
  assignments?: TableAssignment[];
  currentReservationId?: string;
  // Interaction
  onTableClick?: (id: string) => void;
  onItemMouseDown?: (e: React.MouseEvent, id: string) => void;
  onItemDoubleClick?: (id: string) => void;
  interactive?: boolean;
}

// ─── Theme ──────────────────────────────────────────────────────────────────────
const THEME = {
  // Walls & architecture
  wallStroke: 'hsl(var(--primary) / 0.35)',
  wallFill: 'transparent',
  wallWidth: 1.2,
  // Fixtures
  barFill: 'hsl(var(--primary) / 0.08)',
  barStroke: 'hsl(var(--primary) / 0.45)',
  barText: 'hsl(var(--primary) / 0.7)',
  djFill: 'hsl(var(--accent) / 0.08)',
  djStroke: 'hsl(var(--accent) / 0.45)',
  djText: 'hsl(var(--accent) / 0.7)',
  entranceFill: 'hsl(var(--muted) / 0.1)',
  entranceStroke: 'hsl(var(--muted-foreground) / 0.25)',
  entranceText: 'hsl(var(--muted-foreground) / 0.5)',
  // Tables
  tableStroke: '#00E5FF',
  tableFill: 'rgba(0, 229, 255, 0.08)',
  tableHover: 'rgba(0, 229, 255, 0.18)',
  tableSelected: 'rgba(0, 229, 255, 0.25)',
  tableText: '#00E5FF',
  tableMetaText: 'hsl(var(--muted-foreground) / 0.6)',
  // States
  occupiedStroke: 'hsl(var(--destructive))',
  occupiedFill: 'rgba(255, 60, 60, 0.12)',
  selfStroke: 'hsl(var(--accent))',
  selfFill: 'rgba(0, 229, 255, 0.15)',
  // Canvas
  gridDot: 'hsl(var(--primary) / 0.04)',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getTableSize = (item: VenueItem, bbox: VenueBBox | undefined) => {
  const raw = bbox || { w: 5, h: 5 };
  // Scale up sizes for better visibility
  const scale = 1.3;
  let w = clamp(raw.w * scale, 3, 22);
  let h = clamp(raw.h * scale, 3, 22);

  if (item.shape === 'round') {
    const d = clamp((w + h) / 2, 3.5, 20);
    return { w: d, h: d };
  }
  if (item.shape === 'square') {
    const side = clamp((w + h) / 2, 3.5, 20);
    return { w: side, h: side };
  }
  return { w, h };
};

// ─── Venue Architecture (SVG Paths) ─────────────────────────────────────────────
function VenueWalls() {
  // Outer perimeter of the venue — clean architectural lines
  return (
    <g className="venue-walls">
      {/* Outer walls */}
      <rect
        x={0.5} y={0.5} width={99} height={99}
        rx={1.5} ry={1.5}
        fill="none"
        stroke={THEME.wallStroke}
        strokeWidth={THEME.wallWidth}
      />
      {/* Interior wall segments — left alcove area */}
      <line x1={20} y1={0.5} x2={20} y2={10} stroke={THEME.wallStroke} strokeWidth={0.5} strokeDasharray="2 1.5" />
      <line x1={20} y1={95} x2={20} y2={99.5} stroke={THEME.wallStroke} strokeWidth={0.5} strokeDasharray="2 1.5" />
      {/* Separator line between booth area and main floor */}
      <line x1={20} y1={10} x2={20} y2={95} stroke={THEME.wallStroke} strokeWidth={0.35} strokeDasharray="1.5 2" opacity={0.4} />
    </g>
  );
}

function FixtureElement({ item, bbox }: { item: VenueItem; bbox: VenueBBox }) {
  const fixtureType = item.fixture_type || 'other';
  const w = clamp(bbox.w * 1.1, 6, 40);
  const h = clamp(bbox.h * 1.1, 4, 45);
  const x = item.x_percent;
  const y = item.y_percent;

  const isBar = fixtureType === 'bar';
  const isDJ = fixtureType === 'dj';
  const isEntrance = fixtureType === 'entrance';

  const fill = isBar ? THEME.barFill : isDJ ? THEME.djFill : THEME.entranceFill;
  const stroke = isBar ? THEME.barStroke : isDJ ? THEME.djStroke : THEME.entranceStroke;
  const textColor = isBar ? THEME.barText : isDJ ? THEME.djText : THEME.entranceText;
  const rx = isBar ? 1.5 : isDJ ? 2 : 0.8;

  // Determine if this is the main central bar (large)
  const isMainBar = isBar && w > 20;

  return (
    <g className="fixture-element">
      {/* Shadow / glow for main bar */}
      {isMainBar && (
        <rect
          x={x - 0.5} y={y - 0.5}
          width={w + 1} height={h + 1}
          rx={rx + 0.5}
          fill="none"
          stroke={stroke}
          strokeWidth={0.15}
          opacity={0.3}
        />
      )}

      {/* Main shape */}
      <rect
        x={x} y={y}
        width={w} height={h}
        rx={rx}
        fill={fill}
        stroke={stroke}
        strokeWidth={isMainBar ? 0.6 : 0.35}
      />

      {/* Interior detail for bars */}
      {isBar && (
        <rect
          x={x + w * 0.08} y={y + h * 0.08}
          width={w * 0.84} height={h * 0.84}
          rx={rx * 0.6}
          fill="none"
          stroke={stroke}
          strokeWidth={0.15}
          strokeDasharray={isMainBar ? 'none' : '1.5 1'}
        />
      )}

      {/* DJ booth interior circle */}
      {isDJ && (
        <>
          <circle
            cx={x + w / 2} cy={y + h / 2}
            r={Math.min(w, h) * 0.28}
            fill="none"
            stroke={THEME.djStroke}
            strokeWidth={0.25}
          />
          <circle
            cx={x + w / 2} cy={y + h / 2}
            r={Math.min(w, h) * 0.1}
            fill={THEME.djStroke}
            opacity={0.4}
          />
        </>
      )}

      {/* Label */}
      <text
        x={x + w / 2}
        y={y + h / 2 + (isMainBar ? 0.3 : 0.5)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={isMainBar ? 3 : 2}
        fontWeight="700"
        letterSpacing="0.08em"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', textTransform: 'uppercase' }}
        className="pointer-events-none select-none"
      >
        {item.label}
      </text>
    </g>
  );
}

function TableElement({
  item,
  size,
  isSelected,
  isOccupied,
  isSelf,
  showLabel,
  onClick,
  onMouseDown,
  onDoubleClick,
  interactive,
}: {
  item: VenueItem;
  size: { w: number; h: number };
  isSelected: boolean;
  isOccupied: boolean;
  isSelf: boolean;
  showLabel: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  interactive: boolean;
}) {
  const { w, h } = size;
  const cx = item.x_percent + w / 2;
  const cy = item.y_percent + h / 2;

  let fill = THEME.tableFill;
  let stroke = THEME.tableStroke;
  let strokeWidth = 0.35;

  if (isOccupied) {
    fill = THEME.occupiedFill;
    stroke = THEME.occupiedStroke;
  } else if (isSelf) {
    fill = THEME.selfFill;
    stroke = THEME.selfStroke;
  }

  if (isSelected) {
    fill = THEME.tableSelected;
    strokeWidth = 0.55;
  }

  const fontSize = Math.min(w, h) > 5 ? 2.2 : Math.min(w, h) > 3.5 ? 1.6 : 1.2;
  const seatsFontSize = fontSize * 0.55;

  return (
    <g
      className={`table-element ${interactive ? 'cursor-pointer' : ''}`}
      style={{ transition: 'all 0.15s ease' }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick ? (e) => { e.stopPropagation(); onDoubleClick(); } : undefined}
    >
      {/* Glow effect for selected */}
      {isSelected && (
        item.shape === 'round' ? (
          <circle
            cx={cx} cy={cy} r={w / 2 + 0.8}
            fill="none" stroke={THEME.tableStroke}
            strokeWidth={0.15} opacity={0.5}
          />
        ) : (
          <rect
            x={item.x_percent - 0.8} y={item.y_percent - 0.8}
            width={w + 1.6} height={h + 1.6}
            rx={item.shape === 'rectangle' ? 0.8 : 1}
            fill="none" stroke={THEME.tableStroke}
            strokeWidth={0.15} opacity={0.5}
          />
        )
      )}

      {/* Table shape */}
      {item.shape === 'round' ? (
        <circle
          cx={cx} cy={cy} r={w / 2}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={item.x_percent} y={item.y_percent}
          width={w} height={h}
          rx={item.shape === 'rectangle' ? 0.4 : 0.8}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        />
      )}

      {/* Seat indicators */}
      {item.seats > 0 && item.seats <= 10 && (
        Array.from({ length: item.seats }).map((_, si) => {
          const angle = (si / item.seats) * Math.PI * 2 - Math.PI / 2;
          const seatDist = item.shape === 'round'
            ? w / 2 + 1.2
            : Math.max(w, h) / 2 + 1.2;
          const sx = cx + Math.cos(angle) * seatDist;
          const sy = cy + Math.sin(angle) * seatDist;
          return (
            <circle
              key={si}
              cx={sx} cy={sy}
              r={0.5}
              fill={isOccupied ? THEME.occupiedStroke : THEME.tableStroke}
              opacity={0.35}
              className="pointer-events-none"
            />
          );
        })
      )}

      {/* Label */}
      {showLabel && (
        <>
          <text
            x={cx} y={cy - (item.seats > 0 ? seatsFontSize * 0.3 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={isOccupied ? THEME.occupiedStroke : THEME.tableText}
            fontSize={fontSize}
            fontWeight="700"
            className="pointer-events-none select-none"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {item.label}
          </text>
          {item.seats > 0 && (
            <text
              x={cx} y={cy + fontSize * 0.55}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={THEME.tableMetaText}
              fontSize={seatsFontSize}
              fontWeight="500"
              className="pointer-events-none select-none"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {item.seats}p
            </text>
          )}
        </>
      )}
    </g>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
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
  const fixtureItems = items.filter(i => !!i.fixture_type);
  const tableItems = items.filter(i => !i.fixture_type);

  const isOccupied = useCallback((item: VenueItem) => {
    if (!item.zone_id || assignments.length === 0) return false;
    return assignments.some(a => a.zone_id === item.zone_id && a.reservation_id !== currentReservationId);
  }, [assignments, currentReservationId]);

  const isSelf = useCallback((item: VenueItem) => {
    if (!item.zone_id || !currentReservationId || assignments.length === 0) return false;
    return assignments.some(a => a.zone_id === item.zone_id && a.reservation_id === currentReservationId);
  }, [assignments, currentReservationId]);

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="-2 -2 104 104"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Grid pattern */}
        <pattern id="venue-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="0.15" fill={THEME.gridDot} />
        </pattern>
        {/* Glow filter */}
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid */}
      <rect x={-2} y={-2} width={104} height={104} fill="url(#venue-grid)" />

      {/* Venue architecture */}
      <VenueWalls />

      {/* Fixtures (bars, DJ, entrances) */}
      {fixtureItems.map((item) => {
        const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
        return (
          <FixtureElement key={item.id} item={item} bbox={bbox} />
        );
      })}

      {/* Tables */}
      {tableItems.map((item) => {
        const size = getTableSize(item, tableBboxes[item.label]);
        return (
          <TableElement
            key={item.id}
            item={item}
            size={size}
            isSelected={selectedItemId === item.id}
            isOccupied={isOccupied(item)}
            isSelf={isSelf(item)}
            showLabel={showLabels}
            onClick={onTableClick ? () => onTableClick(item.id) : undefined}
            onMouseDown={onItemMouseDown ? (e) => { e.stopPropagation(); onItemMouseDown(e, item.id); } : undefined}
            onDoubleClick={onItemDoubleClick ? () => onItemDoubleClick(item.id) : undefined}
            interactive={interactive}
          />
        );
      })}
    </svg>
  );
}
