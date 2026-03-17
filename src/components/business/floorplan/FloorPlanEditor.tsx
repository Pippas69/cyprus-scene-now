import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Upload, Trash2, MapPin, MousePointer, Eye, EyeOff,
  ImageOff, Magnet, Undo2, Redo2,
  X, Circle, Square, RectangleHorizontal,
  Sofa, Beer, Music, Landmark, Save, Pencil, Eraser,
  Plus, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { VenueSVGCanvas } from './VenueSVGCanvas';
import { ItemPropertiesPanel, EmptyPropertiesPanel, type FloorPlanItemFull } from './ItemPropertiesPanel';
import { useFloorPlanHistory } from './useFloorPlanHistory';
import { useLanguage } from '@/hooks/useLanguage';

interface FloorPlanZone {
  id: string;
  label: string;
  zone_type: string;
  shape: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  capacity: number;
  sort_order: number;
  metadata?: {
    reference_image_url?: string;
    [key: string]: unknown;
  } | null;
}

interface FloorPlanEditorProps {
  businessId: string;
}

const SNAP_INCREMENT = 2;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snapValue = (v: number, snap: number) => Math.round(v / snap) * snap;

type PlaceShape = {
  id: string;
  icon: React.ReactNode;
  label_el: string;
  label_en: string;
  shape: string;
  seats: number;
  width_percent: number;
  height_percent: number;
  fixture_type: string | null;
  item_type: string;
};

const TOOLBAR_SHAPES: PlaceShape[] = [
  { id: 'circle', icon: <Circle className="h-4 w-4" />, label_el: 'Κύκλος', label_en: 'Circle', shape: 'round', seats: 4, width_percent: 5, height_percent: 5, fixture_type: null, item_type: 'table' },
  { id: 'square', icon: <Square className="h-4 w-4" />, label_el: 'Τετράγωνο', label_en: 'Square', shape: 'square', seats: 4, width_percent: 5, height_percent: 5, fixture_type: null, item_type: 'table' },
  { id: 'rect', icon: <RectangleHorizontal className="h-4 w-4" />, label_el: 'Ορθογώνιο', label_en: 'Rectangle', shape: 'rectangle', seats: 6, width_percent: 8, height_percent: 4, fixture_type: null, item_type: 'table' },
  { id: 'booth', icon: <Sofa className="h-4 w-4" />, label_el: 'Booth', label_en: 'Booth', shape: 'rectangle', seats: 6, width_percent: 7, height_percent: 5, fixture_type: 'booth', item_type: 'seating' },
  { id: 'bar', icon: <Beer className="h-4 w-4" />, label_el: 'Bar', label_en: 'Bar', shape: 'rect', seats: 0, width_percent: 18, height_percent: 4, fixture_type: 'bar', item_type: 'fixture' },
  { id: 'dj', icon: <Music className="h-4 w-4" />, label_el: 'DJ', label_en: 'DJ', shape: 'rect', seats: 0, width_percent: 6, height_percent: 4, fixture_type: 'dj_booth', item_type: 'fixture' },
  { id: 'stage', icon: <Landmark className="h-4 w-4" />, label_el: 'Stage', label_en: 'Stage', shape: 'rect', seats: 0, width_percent: 16, height_percent: 7, fixture_type: 'stage', item_type: 'fixture' },
];

const translations = {
  el: {
    title: 'Layout Studio',
    subtitle: 'Σχεδιάστε το ψηφιακό δίδυμο του χώρου σας',
    uploadReference: 'Εικόνα αναφοράς',
    clickToPlace: 'Κάντε κλικ στο σχεδιάγραμμα',
    startDesign: 'Ξεκινήστε το σχεδιασμό',
    startDesignHint: 'Τοποθετήστε τραπέζια, bar, σκηνή και άλλα στοιχεία στον χώρο σας',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Διαγράφηκε',
    cancel: 'Ακύρωση',
    opacity: 'Αδιαφάνεια',
    gridSnap: 'Πλέγμα',
    deleteReference: 'Διαγραφή',
    referenceDeleted: 'Εικόνα αναφοράς διαγράφηκε',
    duplicated: 'Αντιγράφηκε',
    noItems: 'Επιλέξτε ένα σχήμα από τη γραμμή εργαλείων',
    startBlank: 'Σχεδιάστε τον χώρο',
    saveLayout: 'Αποθήκευση',
    editLayout: 'Επεξεργασία',
    layoutSaved: 'Το σχεδιάγραμμα αποθηκεύτηκε',
    clearAll: 'Καθαρισμός',
    clearAllConfirm: 'Σίγουρα; Θα διαγραφούν όλα τα στοιχεία.',
    cleared: 'Ο χώρος καθαρίστηκε',
  },
  en: {
    title: 'Layout Studio',
    subtitle: 'Design the digital twin of your venue',
    uploadReference: 'Reference image',
    clickToPlace: 'Click on the layout to place',
    startDesign: 'Start designing',
    startDesignHint: 'Place tables, bar, stage and other elements in your venue',
    saved: 'Saved',
    deleted: 'Deleted',
    cancel: 'Cancel',
    opacity: 'Opacity',
    gridSnap: 'Snap to grid',
    deleteReference: 'Delete',
    referenceDeleted: 'Reference image deleted',
    duplicated: 'Duplicated',
    noItems: 'Pick a shape from the toolbar',
    startBlank: 'Design your venue',
    saveLayout: 'Save',
    editLayout: 'Edit',
    layoutSaved: 'Layout saved',
    clearAll: 'Clear',
    clearAllConfirm: 'Are you sure? All items will be deleted.',
    cleared: 'Canvas cleared',
  },
};

export function FloorPlanEditor({ businessId }: FloorPlanEditorProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<FloorPlanItemFull[]>([]);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [placingMode, setPlacingMode] = useState<PlaceShape | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{
    id: string;
    handle: string;
    // World-space anchor point (opposite edge/corner) that stays fixed during resize
    anchorX: number;
    anchorY: number;
    // Local basis vectors in world space (item rotation aware)
    uxX: number;
    uxY: number;
    uyX: number;
    uyY: number;
    // Starting dimensions (avoid drift while dragging)
    startW: number;
    startH: number;
    // Which edges this handle controls
    movesLeft: boolean;
    movesRight: boolean;
    movesTop: boolean;
    movesBottom: boolean;
  } | null>(null);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);

  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [showReferenceImage, setShowReferenceImage] = useState(true);
  const [referenceOpacity, setReferenceOpacity] = useState(40);
  const [gridSnap, setGridSnap] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [dragCoords, setDragCoords] = useState<{ x: number; y: number } | null>(null);

  const [isDesignMode, setIsDesignMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const history = useFloorPlanHistory<FloorPlanItemFull>(items);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadFloorPlan(); }, [businessId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItem) { e.preventDefault(); deleteItem(selectedItem); }
      }
      if (e.key === 'Escape') { setSelectedItem(null); setPlacingMode(null); }
      if (e.key === 'r' || e.key === 'R') {
        if (selectedItem) {
          const item = items.find((i) => i.id === selectedItem);
          if (item && !item.is_locked) {
            const updated = { ...item, rotation: (item.rotation + 45) % 360 };
            updateItemLocal(updated);
            debouncedSave(updated);
          }
        }
      }
      if (e.key === 'l' || e.key === 'L') {
        if (selectedItem) {
          const item = items.find((i) => i.id === selectedItem);
          if (item) {
            const updated = { ...item, is_locked: !item.is_locked };
            updateItemLocal(updated);
            debouncedSave(updated);
          }
        }
      }
      if (e.key === 'g' || e.key === 'G') {
        setGridSnap((prev) => !prev);
        setShowGrid((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const prev = history.undo();
        if (prev) setItems(prev);
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        const next = history.redo();
        if (next) setItems(next);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedItem) {
          const item = items.find((i) => i.id === selectedItem);
          if (item) duplicateItem(item);
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedItem) {
        e.preventDefault();
        const item = items.find((i) => i.id === selectedItem);
        if (item && !item.is_locked) {
          const step = e.shiftKey ? 5 : 1;
          let { x_percent, y_percent } = item;
          if (e.key === 'ArrowUp') y_percent = clamp(y_percent - step, -5, 105);
          if (e.key === 'ArrowDown') y_percent = clamp(y_percent + step, -5, 105);
          if (e.key === 'ArrowLeft') x_percent = clamp(x_percent - step, -5, 105);
          if (e.key === 'ArrowRight') x_percent = clamp(x_percent + step, -5, 105);
          const updated = { ...item, x_percent, y_percent };
          updateItemLocal(updated);
          debouncedSave(updated);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedItem, items, history]);

  const loadFloorPlan = async () => {
    setLoading(true);
    const [itemsResult, zonesResult] = await Promise.all([
      supabase.from('floor_plan_tables').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order').limit(1),
    ]);

    const loadedItems = ((itemsResult.data || []) as unknown as FloorPlanItemFull[]).map((i) => ({
      ...i,
      rotation: (i as any).rotation ?? 0,
      width_percent: (i as any).width_percent ?? 5,
      height_percent: (i as any).height_percent ?? 5,
      is_locked: (i as any).is_locked ?? false,
      item_type: (i as any).item_type ?? 'table',
      color: (i as any).color ?? null,
    }));
    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    setItems(loadedItems);
    setZones(loadedZones);
    setHasFloorPlan(loadedItems.length > 0);
    history.reset(loadedItems);

    const meta = loadedZones[0]?.metadata;
    if (meta?.reference_image_url) setReferenceImageUrl(meta.reference_image_url as string);
    setLoading(false);
  };

  const uploadReferenceImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${businessId}/reference.${ext}`;
    await supabase.storage.from('floor-plan-references').remove([path]);
    const { error } = await supabase.storage.from('floor-plan-references').upload(path, file, { upsert: true, contentType: file.type });
    if (error) return null;
    const { data: signedData } = await supabase.storage.from('floor-plan-references').createSignedUrl(path, 60 * 60 * 24 * 30);
    return signedData?.signedUrl || null;
  };

  const deleteReferenceImage = async () => {
    const ext = referenceImageUrl?.split('.').pop()?.split('?')[0] || 'png';
    const path = `${businessId}/reference.${ext}`;
    await supabase.storage.from('floor-plan-references').remove([path]);
    if (zones[0]) {
      const meta = { ...(zones[0].metadata || {}), reference_image_url: null };
      await supabase.from('floor_plan_zones').update({ metadata: meta as any }).eq('id', zones[0].id);
    }
    setReferenceImageUrl(null);
    setShowReferenceImage(false);
    toast.success(t.referenceDeleted);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const refUrl = await uploadReferenceImage(file);
    if (refUrl) {
      if (zones[0]) {
        const meta = { ...(zones[0].metadata || {}), reference_image_url: refUrl };
        await supabase.from('floor_plan_zones').update({ metadata: meta as any }).eq('id', zones[0].id);
      } else {
        await supabase.from('floor_plan_zones').insert({
          business_id: businessId, label: '_metadata', zone_type: 'other', shape: 'rect',
          x_percent: 0, y_percent: 0, width_percent: 0, height_percent: 0, capacity: 0, sort_order: 0,
          metadata: { reference_image_url: refUrl } as any,
        });
        await loadFloorPlan();
      }
      setReferenceImageUrl(refUrl);
      setShowReferenceImage(true);
      toast.success(t.saved);
    }
  };

  const debouncedSave = useCallback((item: FloorPlanItemFull) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      supabase.from('floor_plan_tables').update({
        label: item.label, x_percent: item.x_percent, y_percent: item.y_percent,
        seats: item.seats, shape: item.shape, rotation: item.rotation,
        width_percent: item.width_percent, height_percent: item.height_percent,
        is_locked: item.is_locked, item_type: item.item_type, color: item.color,
      } as any).eq('id', item.id).then(({ error }) => {
        if (error) console.error('Save error:', error);
      });
    }, 800);
  }, []);

  const updateItemLocal = (item: FloorPlanItemFull) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  };

  const saveItemToDB = async (item: Partial<FloorPlanItemFull>) => {
    const { data, error } = await supabase.from('floor_plan_tables').insert({
      business_id: businessId, zone_id: zones[0]?.id || null,
      label: item.label!, x_percent: item.x_percent!, y_percent: item.y_percent!,
      seats: item.seats || 0, shape: item.shape || 'square', sort_order: items.length,
      fixture_type: item.fixture_type || null, rotation: item.rotation || 0,
      width_percent: item.width_percent || 5, height_percent: item.height_percent || 5,
      is_locked: false, item_type: item.item_type || 'table',
    } as any).select().single();
    if (error) { toast.error(error.message); return null; }
    return {
      ...(data as unknown as FloorPlanItemFull),
      rotation: item.rotation || 0, width_percent: item.width_percent || 5,
      height_percent: item.height_percent || 5, is_locked: false,
      item_type: item.item_type || 'table', color: item.color || null,
    };
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!placingMode) return;
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;
    const svgPt = screenToSVG(clientX, clientY);
    let x = svgPt.x;
    let y = svgPt.y;
    if (gridSnap) { x = snapValue(x, SNAP_INCREMENT); y = snapValue(y, SNAP_INCREMENT); }

    const existingTables = items.filter((i) => !i.fixture_type).length;
    const label = placingMode.fixture_type
      ? placingMode.label_en.toUpperCase()
      : `T${existingTables + 1}`;

    const newItem: Partial<FloorPlanItemFull> = {
      label,
      x_percent: clamp(x, -3, 103),
      y_percent: clamp(y, -3, 103),
      seats: placingMode.seats,
      shape: placingMode.shape,
      fixture_type: placingMode.fixture_type,
      rotation: 0,
      width_percent: placingMode.width_percent,
      height_percent: placingMode.height_percent,
      item_type: placingMode.item_type,
    };
    saveItemToDB(newItem).then((saved) => {
      if (saved) {
        history.pushState(items, 'add item');
        setItems((prev) => [...prev, saved]);
        setHasFloorPlan(true);
        setSelectedItem(saved.id);
        toast.success(t.saved);
      }
    });
    setPlacingMode(null);
  }, [placingMode, items, gridSnap, zones]);

  const handlePropertyChange = useCallback((updated: FloorPlanItemFull) => {
    history.pushState(items, 'edit properties');
    updateItemLocal(updated);
    debouncedSave(updated);
  }, [items, debouncedSave]);

  const deleteItem = async (itemId: string) => {
    history.pushState(items, 'delete');
    const { error } = await supabase.from('floor_plan_tables').delete().eq('id', itemId);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSelectedItem(null);
    toast.success(t.deleted);
  };

  const duplicateItem = async (item: FloorPlanItemFull) => {
    const newItem: Partial<FloorPlanItemFull> = {
      ...item,
      label: item.label + ' (copy)',
      x_percent: item.x_percent,
      y_percent: clamp(item.y_percent + item.height_percent + 1, -5, 100),
    };
    const saved = await saveItemToDB(newItem);
    if (saved) {
      history.pushState(items, 'duplicate');
      setItems((prev) => [...prev, saved]);
      setSelectedItem(saved.id);
      toast.success(t.duplicated);
    }
  };

  const bringForward = useCallback((itemId: string) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === itemId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((item, i) => ({ ...item, sort_order: i }));
    });
  }, []);

  const sendBackward = useCallback((itemId: string) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === itemId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      return next.map((item, i) => ({ ...item, sort_order: i }));
    });
  }, []);

  const clearAllItems = async () => {
    if (!window.confirm(t.clearAllConfirm)) return;
    const { error } = await supabase.from('floor_plan_tables').delete().eq('business_id', businessId);
    if (error) { toast.error(error.message); return; }
    history.pushState(items, 'clear all');
    setItems([]);
    setSelectedItem(null);
    toast.success(t.cleared);
  };

  const captureCanvasScreenshot = useCallback(async (): Promise<string | null> => {
    const el = canvasRef.current;
    if (!el) return null;
    try {
      // Temporarily hide selection handles & overlays for clean screenshot
      setSelectedItem(null);
      setPlacingMode(null);
      // Wait for re-render
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
      if (!blob) return null;

      const path = `${businessId}/floor-plan-screenshot.png`;
      await supabase.storage.from('floor-plan-references').remove([path]);
      const { error } = await supabase.storage.from('floor-plan-references').upload(path, blob, {
        upsert: true,
        contentType: 'image/png',
      });
      if (error) { console.error('Screenshot upload error:', error); return null; }

      const { data: urlData } = supabase.storage.from('floor-plan-references').getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Screenshot capture error:', err);
      return null;
    }
  }, [businessId]);

  const handleSaveLayout = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setIsSaving(true);

    try {
      const updateResults = await Promise.all(items.map((item) =>
        supabase.from('floor_plan_tables').update({
          label: item.label, x_percent: item.x_percent, y_percent: item.y_percent,
          seats: item.seats, shape: item.shape, rotation: item.rotation,
          width_percent: item.width_percent, height_percent: item.height_percent,
          is_locked: item.is_locked, item_type: item.item_type, color: item.color,
          sort_order: item.sort_order,
        } as any).eq('id', item.id),
      ));

      const failedUpdate = updateResults.find((r) => r.error);
      if (failedUpdate?.error) {
        toast.error(failedUpdate.error.message);
        return;
      }

      const screenshotUrl = await captureCanvasScreenshot();
      if (screenshotUrl) {
        const { error: businessSaveError } = await supabase.from('businesses').update({
          floor_plan_image_url: screenshotUrl,
        }).eq('id', businessId);
        if (businessSaveError) console.error('Business screenshot save error:', businessSaveError);
      }

      setSelectedItem(null);
      setPlacingMode(null);
      setIsDesignMode(false);
      toast.success(t.layoutSaved);
    } finally {
      setIsSaving(false);
    }
  }, [items, t.layoutSaved, captureCanvasScreenshot, businessId]);

  const screenToSVG = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    if (placingMode) return;
    e.stopPropagation();
    setSelectedItem(id); // Single click/tap selects immediately
    const item = items.find((i) => i.id === id);
    if (!item || item.is_locked) return;
    history.pushState(items, 'move');
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const svgPt = screenToSVG(clientX, clientY);
    setDragging({ id, startX: svgPt.x, startY: svgPt.y, origX: item.x_percent, origY: item.y_percent });
  };

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, id: string, handle: string) => {
    e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();

    const item = items.find((i) => i.id === id);
    if (!item || item.is_locked) return;
    history.pushState(items, 'resize');

    const startW = clamp(item.width_percent, 1, 80);
    const startH = clamp(item.height_percent, 1, 80);

    // Determine which edges this handle moves
    const movesLeft = handle.includes('w');
    const movesRight = handle.includes('e');
    const movesTop = handle.includes('n');
    const movesBottom = handle.includes('s');

    const angle = ((item.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Local basis vectors (x-axis and y-axis in world coordinates)
    const uxX = cos;
    const uxY = sin;
    const uyX = -sin;
    const uyY = cos;

    const centerX = item.x_percent + startW / 2;
    const centerY = item.y_percent + startH / 2;

    // Opposite edge/corner local coordinates (fixed anchor)
    const anchorLocalX = movesRight ? -startW / 2 : (movesLeft ? startW / 2 : 0);
    const anchorLocalY = movesBottom ? -startH / 2 : (movesTop ? startH / 2 : 0);

    const anchorX = centerX + anchorLocalX * uxX + anchorLocalY * uyX;
    const anchorY = centerY + anchorLocalX * uxY + anchorLocalY * uyY;

    setResizing({
      id,
      handle,
      anchorX,
      anchorY,
      uxX,
      uxY,
      uyX,
      uyY,
      startW,
      startH,
      movesLeft,
      movesRight,
      movesTop,
      movesBottom,
    });
  }, [items, history]);

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    const svgPt = screenToSVG(clientX, clientY);

    if (dragging) {
      const dx = svgPt.x - dragging.startX;
      const dy = svgPt.y - dragging.startY;
      let newX = clamp(dragging.origX + dx, -5, 105);
      let newY = clamp(dragging.origY + dy, -5, 105);
      if (gridSnap) {
        newX = snapValue(newX, SNAP_INCREMENT);
        newY = snapValue(newY, SNAP_INCREMENT);
      }
      setDragCoords({ x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
      setItems((prev) => prev.map((i) => (i.id === dragging.id ? { ...i, x_percent: newX, y_percent: newY } : i)));
    }

    if (resizing) {
      const worldDx = svgPt.x - resizing.anchorX;
      const worldDy = svgPt.y - resizing.anchorY;

      // Convert pointer to item-local coordinates relative to fixed anchor
      const localX = worldDx * resizing.uxX + worldDy * resizing.uxY;
      const localY = worldDx * resizing.uyX + worldDy * resizing.uyY;

      let newW = resizing.startW;
      let newH = resizing.startH;

      if (resizing.movesRight) newW = clamp(localX, 1, 80);
      if (resizing.movesLeft) newW = clamp(-localX, 1, 80);
      if (resizing.movesBottom) newH = clamp(localY, 1, 80);
      if (resizing.movesTop) newH = clamp(-localY, 1, 80);

      if (gridSnap) {
        newW = snapValue(newW, SNAP_INCREMENT);
        newH = snapValue(newH, SNAP_INCREMENT);
      }

      const offsetLocalX = resizing.movesRight ? newW / 2 : (resizing.movesLeft ? -newW / 2 : 0);
      const offsetLocalY = resizing.movesBottom ? newH / 2 : (resizing.movesTop ? -newH / 2 : 0);

      const centerX = resizing.anchorX + offsetLocalX * resizing.uxX + offsetLocalY * resizing.uyX;
      const centerY = resizing.anchorY + offsetLocalX * resizing.uxY + offsetLocalY * resizing.uyY;

      const newX = centerX - newW / 2;
      const newY = centerY - newH / 2;

      setItems((prev) => prev.map((i) =>
        i.id === resizing.id
          ? { ...i, width_percent: newW, height_percent: newH, x_percent: newX, y_percent: newY }
          : i,
      ));
    }
  }, [dragging, resizing, gridSnap, screenToSVG]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    updatePointer(e.clientX, e.clientY);
  }, [updatePointer]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const item = items.find((i) => i.id === dragging.id);
      if (item) debouncedSave(item);
      setDragging(null);
      setDragCoords(null);
    }
    if (resizing) {
      const item = items.find((i) => i.id === resizing.id);
      if (item) debouncedSave(item);
      setResizing(null);
    }
  }, [dragging, resizing, items, debouncedSave]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const onMove = (e: MouseEvent) => updatePointer(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // prevent scroll while dragging/resizing
      updatePointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onUp = () => handleMouseUp();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [dragging, resizing, updatePointer, handleMouseUp]);

  const selectedItemData = selectedItem ? items.find((i) => i.id === selectedItem) || null : null;
  const meta = zones[0]?.metadata as any;
  const fixtureBboxes: Record<string, { w: number; h: number }> = meta?.fixture_bboxes || {};
  const tableBboxes: Record<string, { w: number; h: number }> = meta?.table_bboxes || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Welcome screen
  if (!hasFloorPlan) {
    return (
      <div className="space-y-5">
        <div className="relative border-2 border-dashed border-border/60 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 hover:border-primary/40 transition-all">
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-primary/60" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-xs text-muted-foreground">{t.startDesignHint}</p>
            </div>
            <Button variant="default" size="sm" onClick={() => { setHasFloorPlan(true); setIsDesignMode(true); }}>
              {t.startBlank}
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      {isDesignMode && (
        <div className="relative z-20">
          <div className="flex items-center justify-center py-2 px-2">
            <div className="inline-flex items-center gap-1 bg-[hsl(var(--floorplan-canvas))] border border-white/10 rounded-full px-2 py-1.5 shadow-xl backdrop-blur-xl">
              {placingMode ? (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1">
                    <MousePointer className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="text-xs font-medium text-primary">{t.clickToPlace}</span>
                  </div>
                  <button onClick={() => setPlacingMode(null)} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <ToolbarButton icon={<Undo2 className="h-4 w-4" />} disabled={!history.canUndo} onClick={() => { const prev = history.undo(); if (prev) setItems(prev); }} title="Undo" />
                  <ToolbarButton icon={<Redo2 className="h-4 w-4" />} disabled={!history.canRedo} onClick={() => { const next = history.redo(); if (next) setItems(next); }} title="Redo" />
                  <ToolbarDivider />
                  {TOOLBAR_SHAPES.map((shape) => (
                    <ToolbarButton key={shape.id} icon={shape.icon} onClick={() => setPlacingMode(shape)} title={language === 'el' ? shape.label_el : shape.label_en} />
                  ))}
                  <ToolbarDivider />
                  <ToolbarButton icon={<Magnet className="h-4 w-4" />} active={gridSnap} onClick={() => { setGridSnap(!gridSnap); setShowGrid(!showGrid); }} title={t.gridSnap} />
                  {referenceImageUrl && (
                    <ToolbarButton icon={showReferenceImage ? <Eye className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />} active={showReferenceImage} onClick={() => setShowReferenceImage(!showReferenceImage)} title={t.uploadReference} />
                  )}
                  {!referenceImageUrl && (
                    <ToolbarButton icon={<Upload className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()} title={t.uploadReference} />
                  )}
                  {items.length > 0 && (
                    <>
                      <ToolbarDivider />
                      <ToolbarButton icon={<Eraser className="h-4 w-4" />} onClick={clearAllItems} title={t.clearAll} destructive />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {/* Reference opacity */}
      {isDesignMode && referenceImageUrl && showReferenceImage && (
        <div className="flex items-center gap-2 justify-center pb-2 px-4 relative z-20">
          <span className="text-[10px] text-muted-foreground/60">{t.opacity}</span>
          <Slider value={[referenceOpacity]} onValueChange={([v]) => setReferenceOpacity(v)} min={5} max={90} step={5} className="w-[140px]" />
          <span className="text-[10px] text-muted-foreground/60 w-7">{referenceOpacity}%</span>
          <button onClick={deleteReferenceImage} className="text-destructive/60 hover:text-destructive text-[10px] ml-2">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ═══ CANVAS — always full width, never changes with sidebars ═══ */}
      <div className="relative overflow-hidden border border-border/20 shadow-2xl rounded-lg w-full touch-none" style={{ aspectRatio: '4 / 3' }}>
        <div
          ref={canvasRef}
          className={`absolute inset-0 select-none touch-none ${isDesignMode && placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
          onClick={(e) => {
            if (isDesignMode && placingMode) {
              handleCanvasClick(e);
            }
          }}
          onTouchEnd={(e) => {
            if (isDesignMode && placingMode) {
              handleCanvasClick(e);
            }
          }}
          onMouseDown={(e) => {
            if (isDesignMode && !placingMode && e.target === e.currentTarget) {
              setSelectedItem(null);
            }
          }}
          onTouchStart={(e) => {
            if (isDesignMode && !placingMode && e.target === e.currentTarget) {
              setSelectedItem(null);
            }
          }}
          onMouseMove={isDesignMode ? handleMouseMove : undefined}
          onMouseUp={isDesignMode ? handleMouseUp : undefined}
        >
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 30% 20%, hsl(var(--floorplan-canvas-elevated)) 0%, hsl(var(--floorplan-canvas)) 60%, hsl(220 32% 5%) 100%)',
          }} />
          <div className="absolute inset-0 border border-white/[0.03] pointer-events-none" />

          {isDesignMode && referenceImageUrl && showReferenceImage && (
            <img src={referenceImageUrl} alt="" className="absolute inset-0 w-full h-full object-fill pointer-events-none" style={{ opacity: referenceOpacity / 100 }} draggable={false} />
          )}

          {items.length === 0 && isDesignMode && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full border border-white/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-white/20" />
                </div>
                <p className="text-sm text-white/20">{t.noItems}</p>
              </div>
            </div>
          )}

          <VenueSVGCanvas
            svgRef={svgRef}
            items={items}
            fixtureBboxes={fixtureBboxes}
            tableBboxes={tableBboxes}
            selectedItemId={isDesignMode ? selectedItem : null}
            showLabels={true}
            showGrid={isDesignMode && showGrid}
            gridSnap={SNAP_INCREMENT}
            onTableClick={(id) => {
              if (isDesignMode && !placingMode) setSelectedItem(id || null);
            }}
            onItemMouseDown={isDesignMode ? (e, id) => handleMouseDown(e, id) : undefined}
            onResizeStart={isDesignMode ? handleResizeStart : undefined}
            interactive={isDesignMode && !placingMode}
          />

          {isDesignMode && dragging && dragCoords && (
            <div
              className="absolute bg-black/80 backdrop-blur-sm rounded-md px-2 py-1 text-[10px] text-white/80 pointer-events-none z-20 font-mono"
              style={{ left: `${dragCoords.x}%`, top: `${Math.max(0, dragCoords.y - 5)}%`, transform: 'translate(-50%, -100%)' }}
            >
              {dragCoords.x}%, {dragCoords.y}%
            </div>
          )}
        </div>

        {/* Save / Edit button — bottom right inside canvas */}
        {isDesignMode ? (
          <div className="absolute bottom-3 right-3 z-10">
            <Button size="sm" className="h-9 px-5 text-xs gap-2 rounded-lg shadow-lg bg-primary hover:bg-primary/90" onClick={handleSaveLayout} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}{isSaving ? 'Saving...' : t.saveLayout}
            </Button>
          </div>
        ) : (
          <div className="absolute bottom-3 right-3 z-10">
            <Button variant="outline" size="sm" className="h-9 px-5 text-xs gap-2 rounded-lg shadow-lg bg-card/90 backdrop-blur-sm border-border/40" onClick={() => setIsDesignMode(true)}>
              <Pencil className="h-3.5 w-3.5" />{t.editLayout}
            </Button>
          </div>
        )}

        {/* Properties panel — OVERLAY on desktop/tablet, doesn't affect canvas */}
        {isDesignMode && selectedItemData && (
          <div className="absolute top-0 right-0 bottom-0 w-[180px] z-10 hidden md:block bg-card/95 backdrop-blur-md border-l border-border/30 overflow-y-auto">
            <ItemPropertiesPanel
              item={selectedItemData}
              onChange={handlePropertyChange}
              onDelete={deleteItem}
              onDuplicate={duplicateItem}
              onBringForward={bringForward}
              onSendBackward={sendBackward}
            />
          </div>
        )}
      </div>

      {/* MOBILE: Properties below canvas */}
      {isDesignMode && selectedItemData && (
        <div className="md:hidden mt-3 rounded-xl overflow-hidden border border-border/20 bg-card/80 backdrop-blur-sm">
          <ItemPropertiesPanel
            item={selectedItemData}
            onChange={handlePropertyChange}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
          />
        </div>
      )}
    </div>
  );
}

/* ═══ Toolbar Sub-components (Canva-style) ═══ */

function ToolbarButton({ icon, onClick, title, active, disabled, destructive, label }: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        h-8 min-w-[32px] px-2 rounded-full flex items-center justify-center gap-1.5 transition-all duration-150
        ${active
          ? 'bg-white/15 text-white'
          : destructive
            ? 'text-red-400/70 hover:text-red-400 hover:bg-red-400/10'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }
        ${disabled ? 'opacity-30 pointer-events-none' : ''}
      `}
    >
      {icon}
      {label && <span className="text-[11px] font-medium">{label}</span>}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-white/10 mx-0.5" />;
}
