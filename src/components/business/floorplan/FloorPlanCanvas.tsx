import { useRef, useCallback, useState } from 'react';
import { FloorPlanItem, TableReservationStatus } from './floorPlanTypes';
import { FIXTURE_COLORS, SVG_THEME, DEFAULT_TABLE_SIZE, clamp } from './floorPlanTheme';

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

export function FloorPlanCanvas({
  items,
  canvasAspect,
  fixtureBboxes,
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
  const fixtureItems = items.filter((i) => !!i.fixture_type);

  const getPointerPercent = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPercent = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    return { xPercent, yPercent, rect };
  }, []);

  const getTableBox = useCallback((item: FloorPlanItem) => {
    const byId = tableBboxes[item.id];
    const byLabel = tableBboxes[item.label];
    const box = byId || byLabel || DEFAULT_TABLE_SIZE;
    return {
      w: clamp(box.w || DEFAULT_TABLE_SIZE.w, 1.2, 30),
      h: clamp(box.h || DEFAULT_TABLE_SIZE.h, 1.2, 30),
    };
  }, [tableBboxes]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragging || resizing) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-table-hit]') || target.closest('[data-fixture-hit]') || target.closest('[data-resize-handle]')) {
      return;
    }

    if (placingMode && setupMode) {
      const coords = getPointerPercent(e.clientX, e.clientY);
      if (!coords) return;
      onCanvasClick(coords.xPercent, coords.yPercent);
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
    if (!coords) return;

    onTableDrop(tableId, coords.xPercent, coords.yPercent);
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

    const box = getTableBox(item);

    setResizing({
      id,
      startX: e.clientX,
      startY: e.clientY,
      origW: box.w,
      origH: box.h,
    });

    onItemSelect(id);
  }, [setupMode, placingMode, items, getTableBox, onItemSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (resizing) {
      const coords = getPointerPercent(e.clientX, e.clientY);
      if (!coords) return;
      const dxPercent = ((e.clientX - resizing.startX) / coords.rect.width) * 100;
      const dyPercent = ((e.clientY - resizing.startY) / coords.rect.height) * 100;
      const nextW = clamp(resizing.origW + dxPercent, 1.2, 30);
      const nextH = clamp(resizing.origH + dyPercent, 1.2, 30);
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
        const box = getTableBox(item);
        onTableResizeEnd(resizing.id, box.w, box.h);
      }
      setResizing(null);
      return;
    }

    if (dragging) {
      const item = items.find((i) => i.id === dragging.id);
      if (item) onItemDragEnd(item);
      setDragging(null);
    }
  }, [resizing, dragging, items, getTableBox, onTableResizeEnd, onItemDragEnd]);

  const getTableTheme = (item: FloorPlanItem) => {
    const status = reservationStatuses.get(item.id);
    if (status?.status === 'occupied') return SVG_THEME.occupied;
    if (status?.status === 'reserved') return SVG_THEME.reserved;
    if (selectedItem === item.id) return SVG_THEME.selected;
    return SVG_THEME.available;
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/30 bg-background shadow-2xl">
      <div
        ref={containerRef}
        className={`relative w-full select-none ${setupMode && placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ aspectRatio: `${canvasAspect}`, maxHeight: 'calc(100vh - 245px)' }}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Sacred static blueprint background */}
        {blueprintUrl ? (
          <img
            src={blueprintUrl}
            alt="Venue blueprint"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-muted/30" />
        )}

        {/* Transparent SVG overlay */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
          {fixtureItems.map((item) => {
            const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
            const colors = FIXTURE_COLORS[item.fixture_type || 'other'] || FIXTURE_COLORS.other;
            return (
              <g key={item.id}>
                <rect
                  x={item.x_percent}
                  y={item.y_percent}
                  width={bbox.w}
                  height={bbox.h}
                  rx={0.3}
                  fill="transparent"
                  stroke={colors.border}
                  strokeWidth={0.1}
                  strokeDasharray="1.4 0.8"
                  opacity={0.8}
                />
                {showLabels && (
                  <text
                    x={item.x_percent + bbox.w / 2}
                    y={item.y_percent + bbox.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={colors.text}
                    fontSize="1"
                    fontWeight="600"
                    className="pointer-events-none"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {item.label}
                  </text>
                )}
              </g>
            );
          })}

          {tableItems.map((item) => {
            const box = getTableBox(item);
            const theme = getTableTheme(item);
            const status = reservationStatuses.get(item.id);
            const isReserved = status?.status === 'reserved';
            const isOccupied = status?.status === 'occupied';

            const fill = setupMode
              ? isOccupied
                ? 'hsl(var(--destructive) / 0.2)'
                : isReserved
                  ? 'hsl(var(--accent) / 0.16)'
                  : selectedItem === item.id
                    ? 'hsl(var(--primary) / 0.14)'
                    : 'hsl(var(--primary) / 0.08)'
              : isOccupied
                ? 'hsl(var(--destructive) / 0.16)'
                : 'transparent';

            const stroke = selectedItem === item.id ? 'hsl(var(--primary))' : theme.stroke;
            const strokeWidth = setupMode ? 0.15 : 0.08;

            return (
              <g key={item.id}>
                {item.shape === 'round' ? (
                  <ellipse
                    cx={item.x_percent + box.w / 2}
                    cy={item.y_percent + box.h / 2}
                    rx={box.w / 2}
                    ry={box.h / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                ) : (
                  <rect
                    x={item.x_percent}
                    y={item.y_percent}
                    width={box.w}
                    height={box.h}
                    rx={0.25}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                )}

                {showLabels && (
                  <text
                    x={item.x_percent + box.w / 2}
                    y={item.y_percent + box.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={selectedItem === item.id ? 'hsl(var(--primary))' : theme.text}
                    fontSize={Math.min(box.w, box.h) > 3 ? '1.05' : '0.82'}
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
        </svg>

        {/* Hitbox interaction layer */}
        {tableItems.map((item) => {
          const box = getTableBox(item);
          return (
            <div
              key={`table-hit-${item.id}`}
              data-table-hit="true"
              className={`absolute z-10 ${item.shape === 'round' ? 'rounded-full' : 'rounded-sm'} ${
                setupMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              } ${selectedItem === item.id ? 'ring-1 ring-primary/50' : 'hover:ring-1 hover:ring-primary/25'}`}
              style={{
                left: `${item.x_percent}%`,
                top: `${item.y_percent}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
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

        {/* Fixture interaction layer */}
        {fixtureItems.map((item) => {
          const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
          return (
            <div
              key={`fixture-hit-${item.id}`}
              data-fixture-hit="true"
              className={`absolute z-10 rounded-sm ${setupMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
                selectedItem === item.id ? 'ring-1 ring-primary/40' : 'hover:ring-1 hover:ring-primary/20'
              }`}
              style={{ left: `${item.x_percent}%`, top: `${item.y_percent}%`, width: `${bbox.w}%`, height: `${bbox.h}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onItemSelect(item.id === selectedItem ? null : item.id);
              }}
              onMouseDown={(e) => handleItemMouseDown(e, item.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onItemDoubleClick(item);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
