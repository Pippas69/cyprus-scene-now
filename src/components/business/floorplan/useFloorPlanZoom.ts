import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomPanState {
  scale: number;
  panX: number;
  panY: number;
}

export function useFloorPlanZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState<ZoomPanState>({ scale: 1, panX: 0, panY: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const zoomIn = useCallback(() => {
    setState(s => ({ ...s, scale: Math.min(s.scale + 0.25, 4) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(s => ({ ...s, scale: Math.max(s.scale - 0.25, 0.5) }));
  }, []);

  const resetZoom = useCallback(() => {
    setState({ scale: 1, panX: 0, panY: 0 });
  }, []);

  const setScale = useCallback((scale: number) => {
    setState(s => ({ ...s, scale: Math.min(4, Math.max(0.5, scale)) }));
  }, []);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setState(s => ({
          ...s,
          scale: Math.min(4, Math.max(0.5, s.scale + delta)),
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef]);

  // Middle mouse button pan
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // middle mouse
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
    }
  }, [state.panX, state.panY]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setState(s => ({
      ...s,
      panX: panStart.current.panX + dx,
      panY: panStart.current.panY + dy,
    }));
  }, []);

  const handlePanEnd = useCallback(() => {
    isPanning.current = false;
  }, []);

  const transformStyle: React.CSSProperties = {
    transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`,
    transformOrigin: 'center center',
    transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
  };

  return {
    scale: state.scale,
    panX: state.panX,
    panY: state.panY,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
    transformStyle,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    isPanning: isPanning.current,
  };
}
