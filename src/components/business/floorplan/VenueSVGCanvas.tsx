import { useCallback } from 'react';

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
  onItemMouseDown?: (e: React.MouseEvent, id: string) => void;
  onItemDoubleClick?: (id: string) => void;
  onResizeStart?: (e: React.MouseEvent, id: string, handle: string) => void;
  interactive?: boolean;
  showGrid?: boolean;
  gridSnap?: number;
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

const THEME = {
  // Canvas
  grid: 'hsl(var(--floorplan-wall) / 0.18)',
  // Fixtures — premium white
  fixtureFill: 'hsl(var(--floorplan-fixture) / 0.06)',
  fixtureStroke: 'hsl(var(--floorplan-fixture) / 0.55)',
  fixtureText: 'hsl(var(--floorplan-fixture) / 0.9)',
  // Tables — premium white
  tableStroke: 'hsl(var(--floorplan-neon))',
  tableFill: 'hsl(var(--floorplan-neon) / 0.06)',
  tableSelectedFill: 'hsl(var(--floorplan-neon) / 0.15)',
  tableText: 'hsl(var(--floorplan-neon))',
  tableMeta: 'hsl(var(--foreground) / 0.45)',
  // Reservation states
  occupiedStroke: 'hsl(0 72% 55%)',
  occupiedFill: 'hsl(0 72% 55% / 0.12)',
  selfStroke: 'hsl(var(--floorplan-accent))',
  selfFill: 'hsl(var(--floorplan-accent) / 0.12)',
  // Handles
  handleFill: 'hsl(0 0% 100%)',
  handleStroke: 'hsl(var(--floorplan-canvas))',
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

// Resize handles component
function ResizeHandles({ g, itemId, onResizeStart }: {
  g: Geometry;
  itemId: string;
  onResizeStart: (e: React.MouseEvent, id: string, handle: string) => void;
}) {
  const hs = 0.7; // handle size (half)
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;

  const handles = [
    { id: 'nw', x: g.x, y: g.y, cursor: 'nw-resize' },
    { id: 'n', x: cx, y: g.y, cursor: 'n-resize' },
    { id: 'ne', x: g.x + g.w, y: g.y, cursor: 'ne-resize' },
    { id: 'e', x: g.x + g.w, y: cy, cursor: 'e-resize' },
    { id: 'se', x: g.x + g.w, y: g.y + g.h, cursor: 'se-resize' },
    { id: 's', x: cx, y: g.y + g.h, cursor: 's-resize' },
    { id: 'sw', x: g.x, y: g.y + g.h, cursor: 'sw-resize' },
    { id: 'w', x: g.x, y: cy, cursor: 'w-resize' },
  ];

  return (
    <g>
      {/* Selection outline */}
      {g.shape === 'round' ? (
        <circle
          cx={cx} cy={cy} r={g.w / 2 + 0.3}
          fill="none" stroke={THEME.handleFill} strokeWidth={0.25}
          strokeDasharray="0.8 0.4"
        />
      ) : (
        <rect
          x={g.x - 0.3} y={g.y - 0.3}
          width={g.w + 0.6} height={g.h + 0.6}
          rx={0.2} fill="none"
          stroke={THEME.handleFill} strokeWidth={0.25}
          strokeDasharray="0.8 0.4"
        />
      )}

      {/* Handles */}
      {handles.map(h => (
        <rect
          key={h.id}
          x={h.x - hs} y={h.y - hs}
          width={hs * 2} height={hs * 2}
          rx={0.15}
          fill={THEME.handleFill}
          stroke={THEME.handleStroke}
          strokeWidth={0.2}
          style={{ cursor: h.cursor }}
          onMouseDown={(e) => onResizeStart(e, itemId, h.id)}
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
  showLabels = true,
  assignments = [],
  currentReservationId,
  onTableClick,
  onItemMouseDown,
  onItemDoubleClick,
  onResizeStart,
  interactive = true,
  showGrid = false,
  gridSnap = 2,
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

    if (isFixture) {
      w = clamp(w, 2, 45);
      h = clamp(h, 1, 50);
    } else {
      const shape = inferShape(item.shape);
      w = clamp(w, 2, 25);
      h = clamp(h, 2, 25);
      if (shape === 'square' || shape === 'round') {
        const side = (w + h) / 2;
        w = side;
        h = side;
      }
    }

    return {
      x: item.x_percent,
      y: item.y_percent,
      w,
      h,
      shape: isFixture ? 'rectangle' : inferShape(item.shape),
      rotation,
    };
  };

  const allowDrag = interactive && !!onItemMouseDown;
  const showHandles = interactive && !!onResizeStart;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="-5 -5 110 110" preserveAspectRatio="none">
      <rect x={-5} y={-5} width={110} height={110} fill="transparent" />

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
              rx={isDj ? 0.7 : 0.45}
              fill={item.color ? `${item.color}10` : THEME.fixtureFill}
              stroke={selected ? (item.color || THEME.tableStroke) : (item.color || THEME.fixtureStroke)}
              strokeWidth={selected ? 0.65 : (isBar ? 0.55 : 0.38)}
            />
            {isBar && (
              <rect
                x={g.x + g.w * 0.07} y={g.y + g.h * 0.05}
                width={g.w * 0.86} height={g.h * 0.9}
                rx={0.32} fill="none" stroke={THEME.fixtureStroke}
                strokeWidth={0.16} opacity={0.55}
              />
            )}
            {isDj && (
              <circle
                cx={cx} cy={cy} r={Math.min(g.w, g.h) * 0.21}
                fill="none" stroke={THEME.fixtureStroke}
                strokeWidth={0.2} opacity={0.8}
              />
            )}
            {showLabels && (
              <text
                x={cx} y={cy + 0.28}
                textAnchor="middle" dominantBaseline="middle"
                fill={THEME.fixtureText}
                fontSize={isBar && g.w > 15 ? 5.7 : 2.9}
                fontWeight={isBar ? 800 : 700}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.03em' }}
                className="pointer-events-none"
              >
                {item.label.toUpperCase()}
              </text>
            )}

            {/* Resize handles for selected fixture */}
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
        let fill = customColor ? `${customColor}12` : THEME.tableFill;
        let stroke = customColor || THEME.tableStroke;
        let strokeWidth = selected ? 0.56 : 0.38;

        if (occupied) {
          fill = THEME.occupiedFill;
          stroke = THEME.occupiedStroke;
          strokeWidth = selected ? 0.56 : 0.42;
        } else if (self) {
          fill = THEME.selfFill;
          stroke = THEME.selfStroke;
        } else if (selected) {
          fill = customColor ? `${customColor}28` : THEME.tableSelectedFill;
        }

        const mainFont = Math.min(g.w, g.h) > 5 ? 2.1 : 1.65;
        const seatsFont = Math.max(0.88, mainFont * 0.56);

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
                rx={g.shape === 'rectangle' ? 0.28 : 0.62}
                fill={fill} stroke={stroke} strokeWidth={strokeWidth}
              />
            )}

            {showLabels && (
              <>
                <text
                  x={cx}
                  y={cy - (item.seats > 0 ? seatsFont * 0.4 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={occupied ? THEME.occupiedStroke : THEME.tableText}
                  fontSize={mainFont} fontWeight={700}
                  className="pointer-events-none"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {item.label}
                </text>
                {item.seats > 0 && (
                  <text
                    x={cx} y={cy + mainFont * 0.55}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={THEME.tableMeta} fontSize={seatsFont} fontWeight={600}
                    className="pointer-events-none"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {item.seats}p
                  </text>
                )}
              </>
            )}

            {/* Resize handles for selected table */}
            {selected && showHandles && onResizeStart && (
              <ResizeHandles g={g} itemId={item.id} onResizeStart={onResizeStart} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
