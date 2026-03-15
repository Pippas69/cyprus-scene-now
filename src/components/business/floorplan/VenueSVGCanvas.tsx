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
  section_label?: string | null;
  combined_with?: string[];
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
  selectedItemIds?: string[];
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
  showSections?: boolean;
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
  grid: 'hsl(var(--floorplan-wall) / 0.18)',
  fixtureFill: 'hsl(var(--floorplan-fixture) / 0.06)',
  fixtureStroke: 'hsl(var(--floorplan-fixture) / 0.55)',
  fixtureText: 'hsl(var(--floorplan-fixture))',
  tableStroke: 'hsl(var(--floorplan-neon) / 0.7)',
  tableFill: 'hsl(var(--floorplan-neon) / 0.04)',
  tableSelectedStroke: 'hsl(var(--floorplan-neon))',
  tableSelectedFill: 'hsl(var(--floorplan-neon) / 0.1)',
  tableText: 'hsl(var(--floorplan-neon) / 0.85)',
  occupiedStroke: 'hsl(0 72% 55%)',
  occupiedFill: 'hsl(0 72% 55% / 0.08)',
  selfStroke: 'hsl(var(--floorplan-accent))',
  selfFill: 'hsl(var(--floorplan-accent) / 0.08)',
  selectionGlow: 'hsl(var(--floorplan-neon) / 0.25)',
  combinedLine: 'hsl(var(--floorplan-accent) / 0.4)',
  sectionFill: 'hsl(var(--floorplan-neon) / 0.02)',
  sectionStroke: 'hsl(var(--floorplan-neon) / 0.12)',
  sectionText: 'hsl(var(--floorplan-neon) / 0.3)',
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
      <line key={`v${i}`} x1={i} y1={0} x2={i} y2={100} stroke={THEME.grid} strokeWidth={0.12} />,
      <line key={`h${i}`} x1={0} y1={i} x2={100} y2={i} stroke={THEME.grid} strokeWidth={0.12} />,
    );
  }
  return <g>{lines}</g>;
}

// Premium minimal resize handles — thin corner lines, no dots
function ResizeHandles({ g, itemId, onResizeStart }: {
  g: Geometry;
  itemId: string;
  onResizeStart: (e: React.MouseEvent, id: string, handle: string) => void;
}) {
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;
  const pad = 0.6;
  const x1 = g.x - pad;
  const y1 = g.y - pad;
  const x2 = g.x + g.w + pad;
  const y2 = g.y + g.h + pad;
  const corner = Math.min(g.w, g.h) * 0.25;
  const handleSize = 1.2;
  const accent = 'hsl(var(--floorplan-neon) / 0.6)';

  const handles = [
    { id: 'nw', x: x1, y: y1, cursor: 'nw-resize' },
    { id: 'n', x: cx, y: y1, cursor: 'n-resize' },
    { id: 'ne', x: x2, y: y1, cursor: 'ne-resize' },
    { id: 'e', x: x2, y: cy, cursor: 'e-resize' },
    { id: 'se', x: x2, y: y2, cursor: 'se-resize' },
    { id: 's', x: cx, y: y2, cursor: 's-resize' },
    { id: 'sw', x: x1, y: y2, cursor: 'sw-resize' },
    { id: 'w', x: x1, y: cy, cursor: 'w-resize' },
  ];

  return (
    <g className="pointer-events-none">
      {/* Corner accents */}
      {/* Top-left */}
      <polyline points={`${x1},${y1 + corner} ${x1},${y1} ${x1 + corner},${y1}`} fill="none" stroke={accent} strokeWidth={0.22} />
      {/* Top-right */}
      <polyline points={`${x2 - corner},${y1} ${x2},${y1} ${x2},${y1 + corner}`} fill="none" stroke={accent} strokeWidth={0.22} />
      {/* Bottom-right */}
      <polyline points={`${x2},${y2 - corner} ${x2},${y2} ${x2 - corner},${y2}`} fill="none" stroke={accent} strokeWidth={0.22} />
      {/* Bottom-left */}
      <polyline points={`${x1 + corner},${y2} ${x1},${y2} ${x1},${y2 - corner}`} fill="none" stroke={accent} strokeWidth={0.22} />

      {/* Invisible hit areas for resize handles */}
      {handles.map(h => (
        <rect
          key={h.id}
          x={h.x - handleSize / 2} y={h.y - handleSize / 2}
          width={handleSize} height={handleSize}
          fill="transparent"
          style={{ cursor: h.cursor }}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, itemId, h.id); }}
          className="pointer-events-auto"
        />
      ))}
    </g>
  );
}

// Section overlays
function SectionOverlays({ items, resolveGeometry }: { 
  items: VenueItem[]; 
  resolveGeometry: (item: VenueItem, isFixture: boolean) => Geometry;
}) {
  const sections = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
  
  for (const item of items) {
    if (!item.section_label || item.fixture_type) continue;
    const g = resolveGeometry(item, false);
    const existing = sections.get(item.section_label);
    const padding = 2;
    if (existing) {
      existing.minX = Math.min(existing.minX, g.x - padding);
      existing.minY = Math.min(existing.minY, g.y - padding);
      existing.maxX = Math.max(existing.maxX, g.x + g.w + padding);
      existing.maxY = Math.max(existing.maxY, g.y + g.h + padding);
    } else {
      sections.set(item.section_label, {
        minX: g.x - padding, minY: g.y - padding,
        maxX: g.x + g.w + padding, maxY: g.y + g.h + padding,
      });
    }
  }

  return (
    <g className="pointer-events-none">
      {Array.from(sections.entries()).map(([label, bounds]) => (
        <g key={label}>
          <rect
            x={bounds.minX} y={bounds.minY}
            width={bounds.maxX - bounds.minX} height={bounds.maxY - bounds.minY}
            rx={0.8}
            fill={THEME.sectionFill} stroke={THEME.sectionStroke}
            strokeWidth={0.15} strokeDasharray="1.2 0.6"
          />
          <text
            x={bounds.minX + 0.8} y={bounds.minY + 1.6}
            fill={THEME.sectionText} fontSize={1.2} fontWeight={600}
            style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.06em' }}
          >
            {label.toUpperCase()}
          </text>
        </g>
      ))}
    </g>
  );
}

// Combined table link lines
function CombinedLinks({ items, resolveGeometry }: {
  items: VenueItem[];
  resolveGeometry: (item: VenueItem, isFixture: boolean) => Geometry;
}) {
  const lines: JSX.Element[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.combined_with?.length) continue;
    const g1 = resolveGeometry(item, false);
    const c1x = g1.x + g1.w / 2;
    const c1y = g1.y + g1.h / 2;

    for (const linkedId of item.combined_with) {
      const key = [item.id, linkedId].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);

      const linked = items.find(i => i.id === linkedId);
      if (!linked) continue;
      const g2 = resolveGeometry(linked, false);
      const c2x = g2.x + g2.w / 2;
      const c2y = g2.y + g2.h / 2;

      lines.push(
        <line
          key={key}
          x1={c1x} y1={c1y} x2={c2x} y2={c2y}
          stroke={THEME.combinedLine} strokeWidth={0.2} strokeDasharray="0.5 0.3"
          className="pointer-events-none"
        />
      );
    }
  }
  return <g>{lines}</g>;
}

export function VenueSVGCanvas({
  items,
  fixtureBboxes,
  tableBboxes,
  selectedItemId,
  selectedItemIds = [],
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
  showSections = true,
}: VenueSVGCanvasProps) {
  const fixtureItems = items.filter((i) => !!i.fixture_type);
  const tableItems = items.filter((i) => !i.fixture_type);

  const isSelected = useCallback(
    (id: string) => id === selectedItemId || selectedItemIds.includes(id),
    [selectedItemId, selectedItemIds],
  );

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

  const resolveGeometry = useCallback((item: VenueItem, isFixture: boolean): Geometry => {
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

    return { x: item.x_percent, y: item.y_percent, w, h, shape: isFixture ? 'rectangle' : inferShape(item.shape), rotation };
  }, [fixtureBboxes, tableBboxes]);

  const allowDrag = interactive && !!onItemMouseDown;
  const showHandles = interactive && !!onResizeStart;

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="-5 -5 110 110" preserveAspectRatio="none" shapeRendering="geometricPrecision">
      <rect x={-5} y={-5} width={110} height={110} fill="transparent" />
      {showGrid && <GridOverlay snap={gridSnap} />}

      {/* Section overlays */}
      {showSections && <SectionOverlays items={items} resolveGeometry={resolveGeometry} />}

      {/* Combined table links */}
      <CombinedLinks items={items} resolveGeometry={resolveGeometry} />

      {/* Fixtures */}
      {fixtureItems.map((item) => {
        const g = resolveGeometry(item, true);
        const cx = g.x + g.w / 2;
        const cy = g.y + g.h / 2;
        const isDj = item.fixture_type === 'dj_booth' || item.label.toUpperCase().includes('DJ');
        const isBar = item.fixture_type === 'bar' || item.label.toUpperCase().includes('BAR');
        const selected = isSelected(item.id);

        const handleMD = allowDrag
          ? (e: React.MouseEvent) => { e.stopPropagation(); onItemMouseDown!(e, item.id); }
          : undefined;

        return (
          <g
            key={item.id}
            transform={g.rotation ? `rotate(${g.rotation} ${cx} ${cy})` : undefined}
            onClick={interactive && onTableClick ? (e) => { e.stopPropagation(); onTableClick(item.id); } : undefined}
            onMouseDown={handleMD}
            className={interactive ? 'cursor-pointer' : ''}
          >
            {/* Selection glow */}
            {selected && (
              <rect
                x={g.x - 0.5} y={g.y - 0.5}
                width={g.w + 1} height={g.h + 1}
                rx={isDj ? 1 : 0.6}
                fill="none" stroke={THEME.selectionGlow} strokeWidth={1.5}
                opacity={0.4}
              />
            )}
            <rect
              x={g.x} y={g.y} width={g.w} height={g.h}
              rx={isDj ? 0.7 : 0.45}
              fill={item.color ? `${item.color}08` : THEME.fixtureFill}
              stroke={selected ? (item.color || THEME.tableSelectedStroke) : (item.color || THEME.fixtureStroke)}
              strokeWidth={selected ? 0.5 : (isBar ? 0.45 : 0.35)}
            />
            {isBar && (
              <rect
                x={g.x + g.w * 0.07} y={g.y + g.h * 0.08}
                width={g.w * 0.86} height={g.h * 0.84}
                rx={0.3} fill="none" stroke={THEME.fixtureStroke}
                strokeWidth={0.12} opacity={0.4}
              />
            )}
            {isDj && (
              <circle cx={cx} cy={cy} r={Math.min(g.w, g.h) * 0.2} fill="none" stroke={THEME.fixtureStroke} strokeWidth={0.15} opacity={0.6} />
            )}
            {showLabels && (
              <text
                x={cx} y={cy + 0.25}
                textAnchor="middle" dominantBaseline="middle"
                fill={item.color || THEME.fixtureText}
                fontSize={isBar && g.w > 15 ? 4.5 : 2.5}
                fontWeight={700}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.04em' }}
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

        const selected = isSelected(item.id);
        const occupied = isOccupied(item);
        const self = isSelf(item);

        const customColor = item.color || null;
        let fill = customColor ? `${customColor}08` : THEME.tableFill;
        let stroke = customColor || THEME.tableStroke;
        let strokeWidth = 0.35;

        if (occupied) {
          fill = THEME.occupiedFill;
          stroke = THEME.occupiedStroke;
          strokeWidth = 0.4;
        } else if (self) {
          fill = THEME.selfFill;
          stroke = THEME.selfStroke;
        } else if (selected) {
          fill = customColor ? `${customColor}18` : THEME.tableSelectedFill;
          stroke = customColor || THEME.tableSelectedStroke;
          strokeWidth = 0.45;
        }

        const mainFont = Math.min(g.w, g.h) > 5 ? 2 : 1.5;

        const handleMD = allowDrag
          ? (e: React.MouseEvent) => { e.stopPropagation(); onItemMouseDown!(e, item.id); }
          : undefined;

        return (
          <g
            key={item.id}
            transform={g.rotation ? `rotate(${g.rotation} ${cx} ${cy})` : undefined}
            onClick={interactive && onTableClick ? (e) => { e.stopPropagation(); onTableClick(item.id); } : undefined}
            onMouseDown={handleMD}
            className={interactive ? 'cursor-pointer' : ''}
          >
            {/* Selection glow — soft outer ring */}
            {selected && (
              g.shape === 'round' ? (
                <circle cx={cx} cy={cy} r={g.w / 2 + 0.8} fill="none" stroke={THEME.selectionGlow} strokeWidth={1.2} opacity={0.35} />
              ) : (
                <rect
                  x={g.x - 0.6} y={g.y - 0.6}
                  width={g.w + 1.2} height={g.h + 1.2}
                  rx={g.shape === 'rectangle' ? 0.5 : 0.8}
                  fill="none" stroke={THEME.selectionGlow} strokeWidth={1.2} opacity={0.35}
                />
              )
            )}

            {g.shape === 'round' ? (
              <circle cx={cx} cy={cy} r={g.w / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            ) : (
              <rect
                x={g.x} y={g.y} width={g.w} height={g.h}
                rx={g.shape === 'rectangle' ? 0.28 : 0.5}
                fill={fill} stroke={stroke} strokeWidth={strokeWidth}
              />
            )}

            {showLabels && (
              <text
                x={cx} y={cy}
                textAnchor="middle" dominantBaseline="central"
                fill={occupied ? THEME.occupiedStroke : (item.color || THEME.tableText)}
                fontSize={mainFont} fontWeight={600}
                className="pointer-events-none"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.02em' }}
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
