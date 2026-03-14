import { useRef, useCallback, useState, useEffect } from 'react';
import { FloorPlanItem, TableReservationStatus, ViewTransform } from './floorPlanTypes';
import { FIXTURE_COLORS, SVG_THEME, DEFAULT_TABLE_SIZE, TABLE_HIT_PADDING, getRenderTableBox, clamp } from './floorPlanTheme';

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

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

export function FloorPlanCanvas({
  items, canvasAspect, fixtureBboxes, tableBboxes,
  selectedItem, showLabels, placingMode, blueprintUrl, showBlueprint,
  reservationStatuses,
  onCanvasClick, onItemSelect, onItemDoubleClick, onItemDragEnd, onItemDrag,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState<{
    id: string; startX: number; startY: number; origX: number; origY: number;
  } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; origTx: number; origTy: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const lastPinchDist = useRef(0);

  const tableItems = items.filter(i => !i.fixture_type);
  const fixtureItems = items.filter(i => !!i.fixture_type);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setTransform(prev => {
      const newScale = clamp(prev.scale + delta, MIN_ZOOM, MAX_ZOOM);
      // Zoom toward cursor
      if (!containerRef.current) return { ...prev, scale: newScale };
      const rect = containerRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      };
    });
  }, []);

  // Pan with middle mouse or space+click
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button or alt key for pan
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, origTx: transform.x, origTy: transform.y });
      return;
    }

    // Left click on canvas background
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.canvasBg) {
      if (placingMode && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const rawX = (e.clientX - rect.left - transform.x) / transform.scale;
        const rawY = (e.clientY - rect.top - transform.y) / transform.scale;
        const canvasW = rect.width;
        const canvasH = rect.width / canvasAspect;
        const xPct = (rawX / canvasW) * 100;
        const yPct = (rawY / canvasH) * 100;
        onCanvasClick(clamp(xPct, 0, 100), clamp(yPct, 0, 100));
      } else {
        onItemSelect(null);
      }
    }
  }, [placingMode, transform, canvasAspect, onCanvasClick, onItemSelect]);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      const dx = e.clientX - panning.startX;
      const dy = e.clientY - panning.startY;
      setTransform(prev => ({ ...prev, x: panning.origTx + dx, y: panning.origTy + dy }));
      return;
    }

    if (dragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - transform.x) / transform.scale;
      const rawY = (e.clientY - rect.top - transform.y) / transform.scale;
      const canvasW = rect.width;
      const canvasH = rect.width / canvasAspect;
      const xPct = clamp((rawX / canvasW) * 100, 0, 100);
      const yPct = clamp((rawY / canvasH) * 100, 0, 100);
      onItemDrag(dragging.id, xPct, yPct);
    }
  }, [panning, dragging, transform, canvasAspect, onItemDrag]);

  const handleContainerMouseUp = useCallback(() => {
    if (panning) {
      setPanning(null);
      return;
    }
    if (dragging) {
      const item = items.find(i => i.id === dragging.id);
      if (item) onItemDragEnd(item);
      setDragging(null);
    }
  }, [panning, dragging, items, onItemDragEnd]);

  // Touch zoom (pinch)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (!isPinching) {
        setIsPinching(true);
        lastPinchDist.current = dist;
        return;
      }
      const delta = (dist - lastPinchDist.current) * 0.005;
      lastPinchDist.current = dist;
      setTransform(prev => ({
        ...prev,
        scale: clamp(prev.scale + delta, MIN_ZOOM, MAX_ZOOM),
      }));
    }
  }, [isPinching]);

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
  }, []);

  // Item drag start
  const handleItemMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (placingMode) return;
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item) return;
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: item.x_percent, origY: item.y_percent });
    onItemSelect(id);
  }, [placingMode, items, onItemSelect]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: clamp(prev.scale + ZOOM_STEP * 2, MIN_ZOOM, MAX_ZOOM) }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: clamp(prev.scale - ZOOM_STEP * 2, MIN_ZOOM, MAX_ZOOM) }));
  }, []);

  const getTableTheme = (item: FloorPlanItem) => {
    if (selectedItem === item.id) return SVG_THEME.selected;
    const status = reservationStatuses.get(item.id);
    if (status?.status === 'occupied') return SVG_THEME.occupied;
    if (status?.status === 'reserved') return SVG_THEME.reserved;
    return SVG_THEME.available;
  };

  const zoomPercent = Math.round(transform.scale * 100);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/30 bg-background shadow-2xl">
      {/* Zoom controls overlay */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border/40 rounded-lg px-1.5 py-1 shadow-lg">
        <button onClick={zoomOut} className="h-6 w-6 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50" title="Zoom out">−</button>
        <button onClick={resetZoom} className="h-6 px-1.5 flex items-center justify-center text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50 tabular-nums">{zoomPercent}%</button>
        <button onClick={zoomIn} className="h-6 w-6 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50" title="Zoom in">+</button>
      </div>

      <div
        ref={containerRef}
        className={`relative select-none w-full overflow-hidden ${placingMode ? 'cursor-crosshair' : panning ? 'cursor-grabbing' : 'cursor-default'}`}
        style={{ aspectRatio: `${canvasAspect}`, maxHeight: 'calc(100vh - 260px)' }}
        onWheel={handleWheel}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Transformable layer */}
        <div
          className="absolute inset-0 origin-top-left transition-none"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            willChange: 'transform',
          }}
          data-canvas-bg="true"
        >
          {/* Canvas background */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: SVG_THEME.canvasBg }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${SVG_THEME.gridDot} 1px, transparent 0)`,
            backgroundSize: `${SVG_THEME.gridSize}px ${SVG_THEME.gridSize}px`,
          }} />

          {/* Blueprint overlay */}
          {showBlueprint && blueprintUrl && (
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `url(${blueprintUrl})`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.18,
              mixBlendMode: 'screen',
            }} />
          )}

          {/* SVG Layer */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {/* Glow filters */}
              <filter id="glow-available" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-reserved" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Fixtures */}
            {fixtureItems.map((item) => {
              const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
              const colors = FIXTURE_COLORS[item.fixture_type || 'other'] || FIXTURE_COLORS.other;
              const isSelected = selectedItem === item.id;
              return (
                <g key={item.id} className="transition-opacity duration-200">
                  <rect
                    x={item.x_percent} y={item.y_percent}
                    width={bbox.w} height={bbox.h}
                    rx={0.5}
                    fill={colors.bg} stroke={colors.border}
                    strokeWidth={isSelected ? 0.3 : 0.18}
                    strokeDasharray="1.5 0.8"
                    style={{ filter: isSelected ? SVG_THEME.selected.glow : 'none' }}
                  />
                  {showLabels && (
                    <text
                      x={item.x_percent + bbox.w / 2}
                      y={item.y_percent + bbox.h / 2 + 0.4}
                      textAnchor="middle" fill={colors.text}
                      fontSize="1.4" fontWeight="700"
                      className="pointer-events-none"
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                      {item.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Tables */}
            {tableItems.map((item) => {
              const rawBox = tableBboxes[item.label] || DEFAULT_TABLE_SIZE;
              const { w, h } = getRenderTableBox(item.shape, rawBox);
              const theme = getTableTheme(item);
              const isSelected = selectedItem === item.id;
              const status = reservationStatuses.get(item.id);
              const filterRef = isSelected ? 'url(#glow-selected)' : status?.status === 'reserved' ? 'url(#glow-reserved)' : 'none';

              return (
                <g key={item.id} style={{ filter: filterRef }} className="transition-all duration-300">
                  {/* Table shape */}
                  {item.shape === 'round' ? (
                    <ellipse
                      cx={item.x_percent + w / 2} cy={item.y_percent + h / 2}
                      rx={w / 2} ry={h / 2}
                      fill={theme.fill} stroke={theme.stroke}
                      strokeWidth={isSelected ? 0.28 : 0.18}
                    />
                  ) : (
                    <rect
                      x={item.x_percent} y={item.y_percent}
                      width={w} height={h}
                      rx={item.shape === 'round' ? w / 2 : 0.35}
                      fill={theme.fill} stroke={theme.stroke}
                      strokeWidth={isSelected ? 0.28 : 0.18}
                    />
                  )}

                  {/* Seat dots around table */}
                  {Array.from({ length: Math.min(item.seats, 10) }).map((_, si) => {
                    const angle = (si / Math.min(item.seats, 10)) * Math.PI * 2 - Math.PI / 2;
                    const cx = item.x_percent + w / 2;
                    const cy = item.y_percent + h / 2;
                    const seatDistX = w / 2 + 0.7;
                    const seatDistY = h / 2 + 0.7;
                    return (
                      <circle key={si}
                        cx={cx + Math.cos(angle) * seatDistX}
                        cy={cy + Math.sin(angle) * seatDistY}
                        r={0.3}
                        fill={theme.stroke}
                        opacity={0.5}
                        className="pointer-events-none"
                      />
                    );
                  })}

                  {/* Label */}
                  {showLabels && (
                    <>
                      <text
                        x={item.x_percent + w / 2}
                        y={item.y_percent + h / 2 - (status ? 0.3 : 0)}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={theme.text}
                        fontSize={Math.min(w, h) > 3 ? '1.2' : '0.9'}
                        fontWeight="700"
                        className="pointer-events-none"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                      >
                        {item.label}
                      </text>
                      {/* Status or seat count */}
                      {status?.status === 'reserved' && status.reservationName && (
                        <text
                          x={item.x_percent + w / 2}
                          y={item.y_percent + h / 2 + 1}
                          textAnchor="middle" dominantBaseline="middle"
                          fill={theme.text}
                          fontSize="0.7" fontWeight="500"
                          opacity={0.8}
                          className="pointer-events-none"
                        >
                          {status.reservationName.length > 8 ? status.reservationName.slice(0, 8) + '…' : status.reservationName}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hit areas for fixtures */}
          {fixtureItems.map((item) => {
            const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
            return (
              <div
                key={`hit-fix-${item.id}`}
                className={`absolute rounded transition-all duration-200 ${
                  placingMode ? 'pointer-events-none' :
                  `cursor-grab active:cursor-grabbing ${selectedItem === item.id ? 'ring-1 ring-primary/50' : 'hover:ring-1 hover:ring-primary/20'}`
                }`}
                style={{ left: `${item.x_percent}%`, top: `${item.y_percent}%`, width: `${bbox.w}%`, height: `${bbox.h}%` }}
                onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                onDoubleClick={(e) => { e.stopPropagation(); onItemDoubleClick(item); }}
                onClick={(e) => { e.stopPropagation(); onItemSelect(item.id === selectedItem ? null : item.id); }}
              />
            );
          })}

          {/* Hit areas for tables */}
          {tableItems.map((item) => {
            const rawBox = tableBboxes[item.label] || DEFAULT_TABLE_SIZE;
            const bbox = getRenderTableBox(item.shape, rawBox);
            return (
              <div
                key={`hit-tbl-${item.id}`}
                className={`absolute transition-all duration-200 z-10 ${item.shape === 'round' ? 'rounded-full' : 'rounded-[2px]'} ${
                  placingMode ? 'pointer-events-none' :
                  `cursor-grab active:cursor-grabbing ${selectedItem === item.id ? 'ring-1 ring-accent/70 bg-accent/5' : 'hover:ring-1 hover:ring-accent/25'}`
                }`}
                style={{
                  left: `${item.x_percent - TABLE_HIT_PADDING}%`,
                  top: `${item.y_percent - TABLE_HIT_PADDING}%`,
                  width: `${bbox.w + TABLE_HIT_PADDING * 2}%`,
                  height: `${bbox.h + TABLE_HIT_PADDING * 2}%`,
                }}
                onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                onDoubleClick={(e) => { e.stopPropagation(); onItemDoubleClick(item); }}
                onClick={(e) => { e.stopPropagation(); onItemSelect(item.id === selectedItem ? null : item.id); }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
