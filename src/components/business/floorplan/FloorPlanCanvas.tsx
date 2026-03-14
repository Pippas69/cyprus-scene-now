import { useRef, useCallback, useState } from 'react';
import { FloorPlanItem, TableReservationStatus } from './floorPlanTypes';
import { FIXTURE_COLORS, SVG_THEME, DEFAULT_TABLE_SIZE, getRenderTableBox, clamp } from './floorPlanTheme';

interface FloorPlanCanvasProps {
  items: FloorPlanItem[];
  canvasAspect: number;
  fixtureBboxes: Record<string, { w: number; h: number }>;
  tableBboxes: Record<string, { w: number; h: number }>;
  selectedItem: string | null;
  showLabels: boolean;
  placingMode: 'table' | null;
  blueprintUrl: string | null;
  showBlueprint: boolean;
  reservationStatuses: Map<string, TableReservationStatus>;
  onCanvasClick: (xPercent: number, yPercent: number) => void;
  onItemSelect: (id: string | null) => void;
  onItemDoubleClick: (item: FloorPlanItem) => void;
  onItemDragEnd: (item: FloorPlanItem) => void;
  onItemDrag: (id: string, xPercent: number, yPercent: number) => void;
}

export function FloorPlanCanvas({
  items, canvasAspect, fixtureBboxes, tableBboxes,
  selectedItem, showLabels, placingMode, blueprintUrl, showBlueprint,
  reservationStatuses,
  onCanvasClick, onItemSelect, onItemDoubleClick, onItemDragEnd, onItemDrag,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    id: string; startX: number; startY: number; origX: number; origY: number;
  } | null>(null);

  const tableItems = items.filter(i => !i.fixture_type);
  const fixtureItems = items.filter(i => !!i.fixture_type);

  // Convert mouse event to % coordinates relative to the container
  const eventToPercent = useCallback((e: React.MouseEvent | MouseEvent): { xPct: number; yPct: number } | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    return { xPct: clamp(xPct, 0, 100), yPct: clamp(yPct, 0, 100) };
  }, []);

  // Click on empty canvas area
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return; // ignore click after drag
    const target = e.target as HTMLElement;
    // Only respond if clicking on the background, not on a table element
    if (target.closest('[data-table-hit]') || target.closest('[data-fixture-hit]')) return;

    if (placingMode) {
      const pos = eventToPercent(e);
      if (pos) onCanvasClick(pos.xPct, pos.yPct);
    } else {
      onItemSelect(null);
    }
  }, [placingMode, dragging, eventToPercent, onCanvasClick, onItemSelect]);

  // Drag start
  const handleItemMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (placingMode) return;
    e.preventDefault();
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item) return;
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: item.x_percent, origY: item.y_percent });
    onItemSelect(id);
  }, [placingMode, items, onItemSelect]);

  // Drag move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragging.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragging.startY) / rect.height) * 100;
    const newX = clamp(dragging.origX + dxPct, 0, 100);
    const newY = clamp(dragging.origY + dyPct, 0, 100);
    onItemDrag(dragging.id, newX, newY);
  }, [dragging, onItemDrag]);

  // Drag end
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const item = items.find(i => i.id === dragging.id);
      if (item) onItemDragEnd(item);
      setDragging(null);
    }
  }, [dragging, items, onItemDragEnd]);

  const getTableTheme = (item: FloorPlanItem) => {
    if (selectedItem === item.id) return SVG_THEME.selected;
    const status = reservationStatuses.get(item.id);
    if (status?.status === 'occupied') return SVG_THEME.occupied;
    if (status?.status === 'reserved') return SVG_THEME.reserved;
    return SVG_THEME.available;
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/30 bg-muted/20 shadow-2xl">
      <div
        ref={containerRef}
        className={`relative select-none w-full ${placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ aspectRatio: `${canvasAspect}`, maxHeight: 'calc(100vh - 240px)' }}
        onClick={handleContainerClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Blueprint background image — fixed, no zoom, preserves aspect ratio */}
        {showBlueprint && blueprintUrl && (
          <img
            src={blueprintUrl}
            alt="Floor plan blueprint"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: 0.35 }}
            draggable={false}
          />
        )}

        {/* Fallback grid when no blueprint */}
        {(!showBlueprint || !blueprintUrl) && (
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.06) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }} />
        )}

        {/* Transparent SVG overlay — exact same dimensions as the container */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ pointerEvents: 'none' }}
        >
          {/* Fixtures */}
          {fixtureItems.map((item) => {
            const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
            const colors = FIXTURE_COLORS[item.fixture_type || 'other'] || FIXTURE_COLORS.other;
            const isSelected = selectedItem === item.id;
            return (
              <g key={item.id}>
                <rect
                  x={item.x_percent} y={item.y_percent}
                  width={bbox.w} height={bbox.h}
                  rx={0.4}
                  fill={isSelected ? colors.bg : 'transparent'}
                  stroke={colors.border}
                  strokeWidth={isSelected ? 0.35 : 0.2}
                  strokeDasharray="1.2 0.6"
                />
                {showLabels && (
                  <text
                    x={item.x_percent + bbox.w / 2}
                    y={item.y_percent + bbox.h / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fill={colors.text}
                    fontSize="1.3" fontWeight="600"
                    className="pointer-events-none"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {item.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Tables — clean 1.5px outline style */}
          {tableItems.map((item) => {
            const rawBox = tableBboxes[item.label] || DEFAULT_TABLE_SIZE;
            const { w, h } = getRenderTableBox(item.shape, rawBox);
            const theme = getTableTheme(item);
            const isSelected = selectedItem === item.id;
            const status = reservationStatuses.get(item.id);
            const isOccupied = status?.status === 'occupied';
            const isReserved = status?.status === 'reserved';

            // Clean fill: transparent when available, subtle color when reserved/occupied
            const fillColor = isOccupied
              ? 'hsl(var(--destructive) / 0.15)'
              : isReserved
                ? 'hsl(var(--accent) / 0.12)'
                : isSelected
                  ? 'hsl(var(--primary) / 0.1)'
                  : 'transparent';

            // 1.5px stroke (in SVG viewBox 0-100, 0.15 ≈ 1.5px on a 1000px container)
            const strokeW = isSelected ? 0.22 : 0.15;

            return (
              <g key={item.id}>
                {item.shape === 'round' ? (
                  <ellipse
                    cx={item.x_percent + w / 2} cy={item.y_percent + h / 2}
                    rx={w / 2} ry={h / 2}
                    fill={fillColor} stroke={theme.stroke}
                    strokeWidth={strokeW}
                  />
                ) : (
                  <rect
                    x={item.x_percent} y={item.y_percent}
                    width={w} height={h}
                    rx={item.shape === 'square' ? 0.3 : 0.2}
                    fill={fillColor} stroke={theme.stroke}
                    strokeWidth={strokeW}
                  />
                )}

                {/* Centered label */}
                {showLabels && (
                  <>
                    <text
                      x={item.x_percent + w / 2}
                      y={item.y_percent + h / 2 - (status?.reservationName ? 0.4 : 0)}
                      textAnchor="middle" dominantBaseline="central"
                      fill={theme.text}
                      fontSize={Math.min(w, h) > 3 ? '1.1' : '0.8'}
                      fontWeight="700"
                      className="pointer-events-none"
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                      {item.label}
                    </text>
                    {status?.status === 'reserved' && status.reservationName && (
                      <text
                        x={item.x_percent + w / 2}
                        y={item.y_percent + h / 2 + 0.9}
                        textAnchor="middle" dominantBaseline="central"
                        fill={theme.text}
                        fontSize="0.65" fontWeight="500"
                        opacity={0.75}
                        className="pointer-events-none"
                      >
                        {status.reservationName.length > 10 ? status.reservationName.slice(0, 10) + '…' : status.reservationName}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hit areas for fixtures — HTML layer for pointer events */}
        {fixtureItems.map((item) => {
          const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
          return (
            <div
              key={`hit-fix-${item.id}`}
              data-fixture-hit="true"
              className={`absolute rounded transition-all duration-150 ${
                placingMode ? 'pointer-events-none' :
                `cursor-grab active:cursor-grabbing ${selectedItem === item.id ? 'ring-1 ring-primary/40' : 'hover:ring-1 hover:ring-primary/15'}`
              }`}
              style={{ left: `${item.x_percent}%`, top: `${item.y_percent}%`, width: `${bbox.w}%`, height: `${bbox.h}%` }}
              onMouseDown={(e) => handleItemMouseDown(e, item.id)}
              onDoubleClick={(e) => { e.stopPropagation(); onItemDoubleClick(item); }}
            />
          );
        })}

        {/* Hit areas for tables — HTML layer for pointer events */}
        {tableItems.map((item) => {
          const rawBox = tableBboxes[item.label] || DEFAULT_TABLE_SIZE;
          const bbox = getRenderTableBox(item.shape, rawBox);
          const pad = 0.8; // small padding for easier grab
          return (
            <div
              key={`hit-tbl-${item.id}`}
              data-table-hit="true"
              className={`absolute z-10 ${item.shape === 'round' ? 'rounded-full' : 'rounded-sm'} transition-all duration-150 ${
                placingMode ? 'pointer-events-none' :
                `cursor-grab active:cursor-grabbing ${selectedItem === item.id ? 'ring-1 ring-primary/50' : 'hover:ring-1 hover:ring-primary/20'}`
              }`}
              style={{
                left: `${item.x_percent - pad}%`,
                top: `${item.y_percent - pad}%`,
                width: `${bbox.w + pad * 2}%`,
                height: `${bbox.h + pad * 2}%`,
              }}
              onMouseDown={(e) => handleItemMouseDown(e, item.id)}
              onDoubleClick={(e) => { e.stopPropagation(); onItemDoubleClick(item); }}
            />
          );
        })}
      </div>
    </div>
  );
}
