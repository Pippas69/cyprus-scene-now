import { useRef, useCallback, useState } from 'react';
import { FloorPlanItem, TableReservationStatus } from './floorPlanTypes';
import { DEFAULT_TABLE_SIZE, SVG_THEME, clamp } from './floorPlanTheme';

interface FloorPlanCanvasProps {
  items: FloorPlanItem[];
  canvasAspect: number;
  fixtureBboxes: Record<string, { w: number; h: number }>;
  tableBboxes: Record<string, { w: number; h: number }>;
  selectedItem: string | null;
  showLabels: boolean;
  setupMode: boolean;
  placingMode: 'table' | null;
  blueprintUrl: string | null;
  reservationStatuses: Map<string, TableReservationStatus>;
  onCanvasClick: (xPercent: number, yPercent: number) => void;
  onTableDrop: (id: string, xPercent: number, yPercent: number) => void;
  onItemSelect: (id: string | null) => void;
  onItemDoubleClick: (item: FloorPlanItem) => void;
  onItemDragEnd: (item: FloorPlanItem) => void;
  onItemDrag: (id: string, xPercent: number, yPercent: number) => void;
  onTableResize: (id: string, w: number, h: number) => void;
  onTableResizeEnd: (id: string, w: number, h: number) => void;
}

type PresetShape = 'round' | 'square' | 'rectangle';

type TablePreset = {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: PresetShape;
};

const ARCH_TABLE_PRESET: Record<string, TablePreset> = {
  '101': { x: 8, y: 12, w: 7, h: 4.8, shape: 'rectangle' },
  '102': { x: 8, y: 19, w: 7, h: 4.8, shape: 'rectangle' },
  '103': { x: 8, y: 26, w: 7, h: 4.8, shape: 'rectangle' },
  '104': { x: 8, y: 33, w: 7, h: 4.8, shape: 'rectangle' },
  '105': { x: 8, y: 40, w: 7, h: 4.8, shape: 'rectangle' },
  '106': { x: 8, y: 47, w: 7, h: 4.8, shape: 'rectangle' },
  '107': { x: 8, y: 54, w: 7, h: 4.8, shape: 'rectangle' },
  '108': { x: 8, y: 61, w: 7, h: 4.8, shape: 'rectangle' },
  '109': { x: 8, y: 68, w: 7, h: 4.8, shape: 'rectangle' },
  '110': { x: 8, y: 75, w: 7, h: 4.8, shape: 'rectangle' },

  P1: { x: 17, y: 12.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P2: { x: 17, y: 19.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P3: { x: 17, y: 26.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P4: { x: 17, y: 33.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P5: { x: 17, y: 40.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P6: { x: 17, y: 47.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P7: { x: 17, y: 54.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P8: { x: 17, y: 61.5, w: 6.4, h: 4.6, shape: 'rectangle' },
  P9: { x: 17, y: 68.5, w: 6.4, h: 4.6, shape: 'rectangle' },

  '23': { x: 31, y: 18, w: 6, h: 4.5, shape: 'rectangle' },
  '24': { x: 38, y: 18, w: 6, h: 4.5, shape: 'rectangle' },
  '25': { x: 45, y: 18, w: 6, h: 4.5, shape: 'rectangle' },
  '26': { x: 52, y: 18, w: 6, h: 4.5, shape: 'rectangle' },
  '27': { x: 59, y: 18, w: 6, h: 4.5, shape: 'rectangle' },
  '28': { x: 66, y: 18, w: 6, h: 4.5, shape: 'rectangle' },
  '29': { x: 73, y: 18, w: 6, h: 4.5, shape: 'rectangle' },

  '7': { x: 52, y: 36, w: 6.2, h: 6.2, shape: 'round' },
  '8': { x: 65, y: 36, w: 6.2, h: 6.2, shape: 'round' },
  '9': { x: 65, y: 49, w: 6.2, h: 6.2, shape: 'round' },
  '10': { x: 52, y: 49, w: 6.2, h: 6.2, shape: 'round' },
};

const normalizeLabel = (label: string) => label.trim().toUpperCase();

export function FloorPlanCanvas({
  items,
  canvasAspect,
  tableBboxes,
  selectedItem,
  showLabels,
  setupMode,
  placingMode,
  blueprintUrl,
  reservationStatuses,
  onCanvasClick,
  onTableDrop,
  onItemSelect,
  onItemDoubleClick,
  onItemDragEnd,
  onItemDrag,
  onTableResize,
  onTableResizeEnd,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [resizing, setResizing] = useState<{
    id: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const tableItems = items.filter((i) => !i.fixture_type);

  const getPointerPercent = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPercent = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    return { xPercent, yPercent, rect };
  }, []);

  const getTableGeometry = useCallback((item: FloorPlanItem) => {
    const key = normalizeLabel(item.label);
    const preset = !setupMode ? ARCH_TABLE_PRESET[key] : undefined;

    if (preset) {
      return {
        x: preset.x,
        y: preset.y,
        w: preset.w,
        h: preset.h,
        shape: preset.shape,
      };
    }

    const byId = tableBboxes[item.id];
    const byLabel = tableBboxes[item.label];
    const box = byId || byLabel || DEFAULT_TABLE_SIZE;

    return {
      x: item.x_percent,
      y: item.y_percent,
      w: clamp(box.w || DEFAULT_TABLE_SIZE.w, 1.8, 24),
      h: clamp(box.h || DEFAULT_TABLE_SIZE.h, 1.8, 24),
      shape: (item.shape as PresetShape) || 'square',
    };
  }, [setupMode, tableBboxes]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragging || resizing) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-table-hit]') || target.closest('[data-resize-handle]')) return;

    if (placingMode && setupMode) {
      const coords = getPointerPercent(e.clientX, e.clientY);
      if (coords) onCanvasClick(coords.xPercent, coords.yPercent);
      return;
    }

    onItemSelect(null);
  }, [dragging, resizing, placingMode, setupMode, getPointerPercent, onCanvasClick, onItemSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!setupMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [setupMode]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!setupMode) return;
    e.preventDefault();

    const tableId = e.dataTransfer.getData('text/floor-table-id') || e.dataTransfer.getData('text/plain');
    if (!tableId) return;

    const coords = getPointerPercent(e.clientX, e.clientY);
    if (coords) onTableDrop(tableId, coords.xPercent, coords.yPercent);
  }, [setupMode, getPointerPercent, onTableDrop]);

  const handleItemMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (!setupMode || placingMode) return;

    e.preventDefault();
    e.stopPropagation();

    const item = items.find((i) => i.id === id);
    if (!item) return;

    setDragging({
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x_percent,
      origY: item.y_percent,
    });

    onItemSelect(id);
  }, [setupMode, placingMode, items, onItemSelect]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (!setupMode || placingMode) return;

    e.preventDefault();
    e.stopPropagation();

    const item = items.find((i) => i.id === id);
    if (!item) return;

    const geometry = getTableGeometry(item);

    setResizing({
      id,
      startX: e.clientX,
      startY: e.clientY,
      origW: geometry.w,
      origH: geometry.h,
    });

    onItemSelect(id);
  }, [setupMode, placingMode, items, getTableGeometry, onItemSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (resizing) {
      const coords = getPointerPercent(e.clientX, e.clientY);
      if (!coords) return;

      const dxPercent = ((e.clientX - resizing.startX) / coords.rect.width) * 100;
      const dyPercent = ((e.clientY - resizing.startY) / coords.rect.height) * 100;

      const nextW = clamp(resizing.origW + dxPercent, 1.8, 24);
      const nextH = clamp(resizing.origH + dyPercent, 1.8, 24);
      onTableResize(resizing.id, nextW, nextH);
      return;
    }

    if (dragging) {
      const coords = getPointerPercent(e.clientX, e.clientY);
      if (!coords) return;

      const dxPercent = ((e.clientX - dragging.startX) / coords.rect.width) * 100;
      const dyPercent = ((e.clientY - dragging.startY) / coords.rect.height) * 100;

      const nextX = clamp(dragging.origX + dxPercent, 0, 100);
      const nextY = clamp(dragging.origY + dyPercent, 0, 100);
      onItemDrag(dragging.id, nextX, nextY);
    }
  }, [resizing, dragging, getPointerPercent, onTableResize, onItemDrag]);

  const handleMouseUp = useCallback(() => {
    if (resizing) {
      const item = items.find((i) => i.id === resizing.id);
      if (item) {
        const geometry = getTableGeometry(item);
        onTableResizeEnd(resizing.id, geometry.w, geometry.h);
      }
      setResizing(null);
      return;
    }

    if (dragging) {
      const item = items.find((i) => i.id === dragging.id);
      if (item) onItemDragEnd(item);
      setDragging(null);
    }
  }, [resizing, dragging, items, getTableGeometry, onTableResizeEnd, onItemDragEnd]);

  const getTableTheme = (item: FloorPlanItem) => {
    const status = reservationStatuses.get(item.id);
    if (status?.status === 'occupied') return SVG_THEME.occupied;
    if (status?.status === 'reserved') return SVG_THEME.reserved;
    if (selectedItem === item.id) return SVG_THEME.selected;
    return SVG_THEME.available;
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/30 bg-card/70 shadow-2xl">
      <div
        ref={containerRef}
        className={`relative w-full select-none ${setupMode && placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ aspectRatio: `${canvasAspect}`, minHeight: 'min(72vh, 820px)' }}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Vectorized architectural shell (no original blueprint shown) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="arch-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--card))" />
              <stop offset="55%" stopColor="hsl(var(--background))" />
              <stop offset="100%" stopColor="hsl(var(--muted) / 0.35)" />
            </linearGradient>
            <linearGradient id="bar-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--muted) / 0.52)" />
              <stop offset="100%" stopColor="hsl(var(--muted) / 0.3)" />
            </linearGradient>
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.45" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="100" height="100" fill="url(#arch-bg)" />

          <g strokeLinecap="round" strokeLinejoin="round">
            <rect
              x="2.5"
              y="3"
              width="95"
              height="94"
              rx="2.8"
              fill="transparent"
              stroke="hsl(var(--muted-foreground) / 0.38)"
              strokeWidth="0.42"
            />

            <path
              d="M 27 8 L 27 92 M 77 8 L 77 92"
              stroke="hsl(var(--muted-foreground) / 0.2)"
              strokeWidth="0.24"
              strokeDasharray="0.8 0.8"
            />

            <path
              d="M 24 72 C 32 67, 42 67, 50 72"
              fill="none"
              stroke="hsl(var(--primary) / 0.26)"
              strokeWidth="0.26"
            />

            {/* Entrances */}
            <path d="M 2.5 31 L 2.5 42" stroke="hsl(var(--primary) / 0.58)" strokeWidth="0.72" />
            <path d="M 97.5 58 L 97.5 70" stroke="hsl(var(--primary) / 0.58)" strokeWidth="0.72" />
            <text x="5" y="28.5" fontSize="1.05" fill="hsl(var(--muted-foreground) / 0.75)">Entrance</text>
            <text x="86.5" y="55.5" fontSize="1.05" fill="hsl(var(--muted-foreground) / 0.75)">Entrance</text>

            {/* Central BAR */}
            <rect
              x="57"
              y="40"
              width="11"
              height="11"
              rx="1"
              fill="url(#bar-fill)"
              stroke="hsl(var(--primary) / 0.75)"
              strokeWidth="0.34"
              filter="url(#neon-glow)"
            />
            <text x="62.5" y="45.7" textAnchor="middle" dominantBaseline="central" fontSize="1.4" fontWeight="700" fill="hsl(var(--primary))">BAR</text>

            {/* Bar 1 & Bar 2 */}
            <rect x="31.5" y="7" width="12" height="5.2" rx="0.8" fill="url(#bar-fill)" stroke="hsl(var(--accent) / 0.7)" strokeWidth="0.3" />
            <text x="37.5" y="9.8" textAnchor="middle" dominantBaseline="central" fontSize="1" fill="hsl(var(--accent))">Bar 1</text>

            <rect x="73.5" y="7" width="12" height="5.2" rx="0.8" fill="url(#bar-fill)" stroke="hsl(var(--accent) / 0.7)" strokeWidth="0.3" />
            <text x="79.5" y="9.8" textAnchor="middle" dominantBaseline="central" fontSize="1" fill="hsl(var(--accent))">Bar 2</text>

            {/* DJ */}
            <path
              d="M 81 79 L 87 76 L 92 79 L 92 86 L 81 86 Z"
              fill="hsl(var(--muted) / 0.3)"
              stroke="hsl(var(--accent) / 0.85)"
              strokeWidth="0.32"
            />
            <text x="86.5" y="81.9" textAnchor="middle" dominantBaseline="central" fontSize="1" fill="hsl(var(--accent))">DJ</text>
          </g>

          {/* Tables */}
          {tableItems.map((item) => {
            const geometry = getTableGeometry(item);
            const theme = getTableTheme(item);
            const status = reservationStatuses.get(item.id);

            const fill = status?.status === 'occupied'
              ? 'hsl(var(--destructive) / 0.22)'
              : status?.status === 'reserved'
                ? 'hsl(var(--accent) / 0.16)'
                : setupMode
                  ? 'hsl(var(--primary) / 0.08)'
                  : 'transparent';

            const stroke = selectedItem === item.id
              ? 'hsl(var(--primary))'
              : (setupMode ? 'hsl(var(--primary) / 0.88)' : 'hsl(var(--primary) / 0.75)');

            const strokeWidth = setupMode ? 0.17 : 0.12;

            return (
              <g key={item.id} style={{ filter: selectedItem === item.id ? 'url(#neon-glow)' : 'none' }}>
                {geometry.shape === 'round' ? (
                  <ellipse
                    cx={geometry.x + geometry.w / 2}
                    cy={geometry.y + geometry.h / 2}
                    rx={geometry.w / 2}
                    ry={geometry.h / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                ) : (
                  <rect
                    x={geometry.x}
                    y={geometry.y}
                    width={geometry.w}
                    height={geometry.h}
                    rx={0.28}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                )}

                {showLabels && (
                  <text
                    x={geometry.x + geometry.w / 2}
                    y={geometry.y + geometry.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={selectedItem === item.id ? 'hsl(var(--primary))' : theme.text}
                    fontSize={Math.min(geometry.w, geometry.h) > 4 ? '1.28' : '1.02'}
                    fontWeight="700"
                    className="pointer-events-none"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {item.label}
                  </text>
                )}
              </g>
            );
          })}

          {!blueprintUrl && (
            <text x="50" y="95" textAnchor="middle" fontSize="1.05" fill="hsl(var(--muted-foreground) / 0.6)">
              Upload blueprint to calibrate architecture guide
            </text>
          )}
        </svg>

        {/* Interactive hitboxes (clickable in display, draggable/resizable in setup) */}
        {tableItems.map((item) => {
          const geometry = getTableGeometry(item);

          return (
            <div
              key={`table-hit-${item.id}`}
              data-table-hit="true"
              className={`absolute z-10 ${geometry.shape === 'round' ? 'rounded-full' : 'rounded-sm'} ${
                setupMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              } ${selectedItem === item.id && setupMode ? 'ring-1 ring-primary/50' : ''}`}
              style={{
                left: `${geometry.x}%`,
                top: `${geometry.y}%`,
                width: `${geometry.w}%`,
                height: `${geometry.h}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onItemSelect(item.id === selectedItem ? null : item.id);
              }}
              onMouseDown={(e) => handleItemMouseDown(e, item.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onItemDoubleClick(item);
              }}
            >
              {setupMode && selectedItem === item.id && (
                <div
                  data-resize-handle="true"
                  className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary border border-primary-foreground cursor-nwse-resize"
                  onMouseDown={(e) => handleResizeMouseDown(e, item.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
