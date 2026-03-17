import { useCallback, forwardRef } from 'react';

export interface VenueItem {
  id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
  fixture_type: string | null;
  zone_id: string | null;
  rotation?: number;
  width_percent?: number;
  height_percent?: number;
  color?: string | null;
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
  onItemMouseDown?: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  onItemDoubleClick?: (id: string) => void;
  onResizeStart?: (e: React.MouseEvent | React.TouchEvent, id: string, handle: string) => void;
  interactive?: boolean;
  showGrid?: boolean;
  gridSnap?: number;
  svgRef?: React.Ref<SVGSVGElement>;
}

type RenderShape = 'round' | 'square' | 'rectangle';

type Geometry = {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: RenderShape;
  rotation: number;
};

/* ═══ Canva/Figma-inspired theme ═══ */
const THEME = {
  grid: 'rgba(255,255,255,0.06)',
  // Fixtures
  fixtureFill: 'rgba(255,255,255,0.04)',
  fixtureStroke: 'rgba(255,255,255,0.35)',
  fixtureText: 'rgba(255,255,255,0.5)',
  // Tables
  tableStroke: 'rgba(255,255,255,0.4)',
  tableFill: 'rgba(255,255,255,0.05)',
  tableSelectedStroke: 'hsl(var(--primary))',
  tableSelectedFill: 'hsl(var(--primary) / 0.12)',
  tableText: 'rgba(255,255,255,0.6)',
  // Reservation states
  occupiedStroke: 'hsl(0 72% 55%)',
  occupiedFill: 'hsl(0 72% 55% / 0.12)',
  selfStroke: 'hsl(var(--floorplan-accent))',
  selfFill: 'hsl(var(--floorplan-accent) / 0.12)',
  // Selection handles — Canva blue
  selectionStroke: 'hsl(var(--primary))',
  handleFill: 'hsl(var(--primary))',
  handleBorder: '#fff',
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function inferShape(shape: string): RenderShape {
  if (shape === 'round') return 'round';
  if (shape === 'rectangle') return 'rectangle';
  return 'square';
}

function GridOverlay({ snap }: { snap: number }) {
  const lines: JSX.Element[] = [];
  for (let i = snap; i < 100; i += snap) {
    lines.push(
      <line key={`v${i}`} x1={i} y1={0} x2={i} y2={100} stroke={THEME.grid} strokeWidth={0.15} />,
      <line key={`h${i}`} x1={0} y1={i} x2={100} y2={i} stroke={THEME.grid} strokeWidth={0.15} />,
    );
  }
  return <g>{lines}</g>;
}

/* ═══ Canva-style resize handles ═══ */
function ResizeHandles({ g, itemId, onResizeStart }: {
  g: Geometry;
  itemId: string;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, id: string, handle: string) => void;
}) {
  const hs = 0.85;
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;

  const handles = [
    { id: 'nw', x: g.x, y: g.y, cursor: 'nw-resize' },
    { id: 'ne', x: g.x + g.w, y: g.y, cursor: 'ne-resize' },
    { id: 'se', x: g.x + g.w, y: g.y + g.h, cursor: 'se-resize' },
    { id: 'sw', x: g.x, y: g.y + g.h, cursor: 'sw-resize' },
  ];

  const edgeHandles = [
    { id: 'n', x: cx, y: g.y, cursor: 'n-resize' },
    { id: 'e', x: g.x + g.w, y: cy, cursor: 'e-resize' },
    { id: 's', x: cx, y: g.y + g.h, cursor: 's-resize' },
    { id: 'w', x: g.x, y: cy, cursor: 'w-resize' },
  ];

  return (
    <g>
      {/* Selection bounding box */}
      {g.shape === 'round' ? (
        <circle
          cx={cx} cy={cy} r={g.w / 2 + 0.4}
          fill="none" stroke={THEME.selectionStroke} strokeWidth={0.26}
        />
      ) : (
        <rect
          x={g.x - 0.4} y={g.y - 0.4}
          width={g.w + 0.8} height={g.h + 0.8}
          rx={0.15} fill="none"
          stroke={THEME.selectionStroke} strokeWidth={0.26}
        />
      )}

      {/* Edge handles */}
      {edgeHandles.map(h => (
        <rect
          key={h.id}
          x={h.x - (h.id === 'n' || h.id === 's' ? 1.7 : 0.45)}
          y={h.y - (h.id === 'e' || h.id === 'w' ? 1.7 : 0.45)}
          width={h.id === 'n' || h.id === 's' ? 3.4 : 0.9}
          height={h.id === 'e' || h.id === 'w' ? 3.4 : 0.9}
          rx={0.2}
          fill={THEME.handleFill}
          stroke={THEME.handleBorder}
          strokeWidth={0.12}
          style={{ cursor: h.cursor }}
          onMouseDown={(e) => onResizeStart(e, itemId, h.id)}
          onTouchStart={(e) => { e.stopPropagation(); onResizeStart(e, itemId, h.id); }}
          className="pointer-events-auto"
        />
      ))}

      {/* Corner handles */}
      {handles.map(h => (
        <circle
          key={h.id}
          cx={h.x} cy={h.y}
          r={hs}
          fill={THEME.handleFill}
          stroke={THEME.handleBorder}
          strokeWidth={0.15}
          style={{ cursor: h.cursor }}
          onMouseDown={(e) => onResizeStart(e, itemId, h.id)}
          onTouchStart={(e) => { e.stopPropagation(); onResizeStart(e, itemId, h.id); }}
          className="pointer-events-auto"
        />
      ))}
    </g>
  );
}

export function VenueSVGCanvas({
  items,
  fixtureBboxes,
  tableBboxes,
  selectedItemId,
  showLabels = false,
  assignments = [],
  currentReservationId,
  onTableClick,
  onItemMouseDown,
  onItemDoubleClick,
  onResizeStart,
  interactive = true,
  showGrid = false,
  gridSnap = 2,
  svgRef,
}: VenueSVGCanvasProps) {
  const fixtureItems = items.filter((i) => !!i.fixture_type);
  const tableItems = items.filter((i) => !i.fixture_type);

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

  const resolveGeometry = (item: VenueItem, isFixture: boolean): Geometry => {
    const bboxMap = isFixture ? fixtureBboxes : tableBboxes;
    const bbox = bboxMap[item.label];
    const rotation = item.rotation || 0;

    let w = item.width_percent || bbox?.w || (isFixture ? 8 : 5);
    let h = item.height_percent || bbox?.h || (isFixture ? 5 : 5);

    // Allow free resizing — no forced square constraint
    w = clamp(w, 1, 80);
    h = clamp(h, 1, 80);

    return {
      x: item.x_percent,
      y: item.y_percent,
      w, h,
      shape: isFixture ? 'rectangle' : inferShape(item.shape),
      rotation,
    };
  };

  const allowDrag = interactive && !!onItemMouseDown;
  const showHandles = interactive && !!onResizeStart;

  return (
    <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox="-5 -5 110 110" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision">
      <rect x={-5} y={-5} width={110} height={110} fill="transparent" onMouseDown={() => { if (interactive && onTableClick) onTableClick(''); }} />
      {showGrid && <GridOverlay snap={gridSnap} />}

      {/* Fixtures */}
      {fixtureItems.map((item) => {
        const g = resolveGeometry(item, true);
        const cx = g.x + g.w / 2;
        const cy = g.y + g.h / 2;
        const isDj = item.fixture_type === 'dj_booth' || item.label.toUpperCase().includes('DJ');
        const isBar = item.fixture_type === 'bar' || item.label.toUpperCase().includes('BAR');
        const selected = selectedItemId === item.id;

        const fixtureHandleMouseDown = allowDrag
          ? (e: React.MouseEvent) => { e.stopPropagation(); onItemMouseDown!(e, item.id); }
          : undefined;

        return (
          <g
            key={item.id}
            transform={g.rotation ? `rotate(${g.rotation} ${cx} ${cy})` : undefined}
            onClick={interactive && onTableClick ? () => onTableClick(item.id) : undefined}
            onMouseDown={fixtureHandleMouseDown}
            onDoubleClick={onItemDoubleClick ? (e) => { e.stopPropagation(); onItemDoubleClick(item.id); } : undefined}
            className={interactive ? 'cursor-pointer' : ''}
          >
            <rect
              x={g.x} y={g.y} width={g.w} height={g.h}
              rx={isDj ? 0.6 : 0.35}
              fill={item.color ? `${item.color}08` : THEME.fixtureFill}
              stroke={selected ? THEME.selectionStroke : (item.color || THEME.fixtureStroke)}
              strokeWidth={selected ? 0.5 : 0.35}
            />
            {isBar && (
              <rect
                x={g.x + g.w * 0.07} y={g.y + g.h * 0.05}
                width={g.w * 0.86} height={g.h * 0.9}
                rx={0.28} fill="none" stroke={THEME.fixtureStroke}
                strokeWidth={0.12} opacity={0.4}
              />
            )}
            {isDj && (
              <circle
                cx={cx} cy={cy} r={Math.min(g.w, g.h) * 0.18}
                fill="none" stroke={THEME.fixtureStroke}
                strokeWidth={0.15} opacity={0.6}
              />
            )}
            {showLabels && (
              <text
                x={cx} y={cy}
                textAnchor="middle" dominantBaseline="central"
                transform={g.h > g.w * 1.3 ? `rotate(-90 ${cx} ${cy})` : undefined}
                fill={item.color || THEME.fixtureText}
                fontSize={Math.min(g.h > g.w * 1.3 ? g.h * 0.28 : g.w * 0.28, g.h > g.w * 1.3 ? g.w * 0.7 : g.h * 0.7, 6)}
                fontWeight={700}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.08em' }}
                className="pointer-events-none"
              >
                {item.label.toUpperCase()}
              </text>
            )}

            {selected && showHandles && onResizeStart && (
              <ResizeHandles g={g} itemId={item.id} onResizeStart={onResizeStart} />
            )}
          </g>
        );
      })}

      {/* Tables */}
      {tableItems.map((item) => {
        const g = resolveGeometry(item, false);
        const cx = g.x + g.w / 2;
        const cy = g.y + g.h / 2;
        const selected = selectedItemId === item.id;
        const occupied = isOccupied(item);
        const self = isSelf(item);

        const customColor = item.color || null;
        let fill = customColor ? `${customColor}0A` : THEME.tableFill;
        let stroke = customColor || THEME.tableStroke;
        let strokeWidth = 0.35;

        if (occupied) {
          fill = THEME.occupiedFill;
          stroke = THEME.occupiedStroke;
          strokeWidth = 0.45;
        } else if (self) {
          fill = THEME.selfFill;
          stroke = THEME.selfStroke;
        } else if (selected) {
          fill = THEME.tableSelectedFill;
          stroke = THEME.tableSelectedStroke;
          strokeWidth = 0.45;
        }

        const handleMouseDown = allowDrag
          ? (e: React.MouseEvent) => { e.stopPropagation(); onItemMouseDown!(e, item.id); }
          : undefined;

        return (
          <g
            key={item.id}
            transform={g.rotation ? `rotate(${g.rotation} ${cx} ${cy})` : undefined}
            onClick={interactive && onTableClick ? () => onTableClick(item.id) : undefined}
            onMouseDown={handleMouseDown}
            onDoubleClick={onItemDoubleClick ? (e) => { e.stopPropagation(); onItemDoubleClick(item.id); } : undefined}
            className={interactive ? 'cursor-pointer' : ''}
          >
            {g.shape === 'round' ? (
              <circle cx={cx} cy={cy} r={g.w / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            ) : (
              <rect
                x={g.x} y={g.y} width={g.w} height={g.h}
                rx={g.shape === 'rectangle' ? 0.25 : 0.5}
                fill={fill} stroke={stroke} strokeWidth={strokeWidth}
              />
            )}

            {showLabels && (
              <text
                x={cx} y={cy}
                textAnchor="middle" dominantBaseline="central"
                transform={g.shape !== 'round' && g.h > g.w * 1.3 ? `rotate(-90 ${cx} ${cy})` : undefined}
                fill={occupied ? THEME.occupiedStroke : (item.color || THEME.tableText)}
                fontSize={Math.min(
                  g.shape === 'round' ? g.w * 0.35 : (g.h > g.w * 1.3 ? g.h * 0.3 : g.w * 0.3),
                  g.shape === 'round' ? g.w * 0.35 : (g.h > g.w * 1.3 ? g.w * 0.7 : g.h * 0.65),
                  5
                )}
                fontWeight={700}
                className="pointer-events-none"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.04em' }}
              >
                {item.label}
              </text>
            )}

            {selected && showHandles && onResizeStart && (
              <ResizeHandles g={g} itemId={item.id} onResizeStart={onResizeStart} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
