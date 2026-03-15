import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Upload, Trash2, MapPin, MousePointer, Eye, EyeOff,
  Wand2, Loader2, ImageOff, Magnet, Undo2, Redo2,
  PanelRightOpen, PanelRightClose, X, Users, Circle, Square, RectangleHorizontal,
  Sofa, Beer, Music, Landmark,
} from 'lucide-react';
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
    analysis_hash?: string;
    image_width?: number;
    image_height?: number;
    fixture_bboxes?: Record<string, { w: number; h: number }>;
    table_bboxes?: Record<string, { w: number; h: number }>;
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

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 900 }); URL.revokeObjectURL(url); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot read image')); };
    img.src = url;
  });

const hashDataUrl = async (dataUrl: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Shape presets for toolbar
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
  { id: 'circle', icon: <Circle className="h-3.5 w-3.5" />, label_el: 'Κύκλος', label_en: 'Circle', shape: 'round', seats: 4, width_percent: 5, height_percent: 5, fixture_type: null, item_type: 'table' },
  { id: 'square', icon: <Square className="h-3.5 w-3.5" />, label_el: 'Τετράγωνο', label_en: 'Square', shape: 'square', seats: 4, width_percent: 5, height_percent: 5, fixture_type: null, item_type: 'table' },
  { id: 'rect', icon: <RectangleHorizontal className="h-3.5 w-3.5" />, label_el: 'Ορθογώνιο', label_en: 'Rectangle', shape: 'rectangle', seats: 6, width_percent: 8, height_percent: 4, fixture_type: null, item_type: 'table' },
  { id: 'booth', icon: <Sofa className="h-3.5 w-3.5" />, label_el: 'Booth', label_en: 'Booth', shape: 'rectangle', seats: 6, width_percent: 7, height_percent: 5, fixture_type: 'booth', item_type: 'seating' },
  { id: 'bar', icon: <Beer className="h-3.5 w-3.5" />, label_el: 'Bar', label_en: 'Bar', shape: 'rect', seats: 0, width_percent: 18, height_percent: 4, fixture_type: 'bar', item_type: 'fixture' },
  { id: 'dj', icon: <Music className="h-3.5 w-3.5" />, label_el: 'DJ', label_en: 'DJ', shape: 'rect', seats: 0, width_percent: 6, height_percent: 4, fixture_type: 'dj_booth', item_type: 'fixture' },
  { id: 'stage', icon: <Landmark className="h-3.5 w-3.5" />, label_el: 'Stage', label_en: 'Stage', shape: 'rect', seats: 0, width_percent: 16, height_percent: 7, fixture_type: 'stage', item_type: 'fixture' },
];

const translations = {
  el: {
    title: 'Layout Studio',
    subtitle: 'Σχεδιάστε το ψηφιακό δίδυμο του χώρου σας',
    uploadImage: 'Ανέβασμα κάτοψης',
    analyzing: 'Η AI αναλύει...',
    reAnalyze: 'AI Ανάλυση',
    clickToPlace: 'Κάντε κλικ στο σχεδιάγραμμα',
    uploadFirst: 'Ανεβάστε την κάτοψη του χώρου σας',
    uploadHint: 'Η AI θα αναγνωρίσει αυτόματα τα τραπέζια & fixtures',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Διαγράφηκε',
    cancel: 'Ακύρωση',
    totalCapacity: 'Χωρητικότητα',
    aiSuccess: 'Η AI δημιούργησε το floor plan! Σύρετε τα στοιχεία στη σωστή θέση.',
    aiError: 'Σφάλμα AI ανάλυσης',
    sameImage: 'Η ίδια κάτοψη — κρατάω το υπάρχον.',
    opacity: 'Αδιαφάνεια',
    gridSnap: 'Πλέγμα',
    deleteReference: 'Διαγραφή εικόνας',
    referenceDeleted: 'Εικόνα αναφοράς διαγράφηκε',
    duplicated: 'Αντιγράφηκε',
    noItems: 'Προσθέστε ένα σχήμα από τη γραμμή εργαλείων',
    startBlank: 'Ξεκινήστε κενό',
    saveLayout: 'Αποθήκευση',
    editLayout: 'Επεξεργασία',
    layoutSaved: 'Το σχεδιάγραμμα αποθηκεύτηκε',
    assignMode: 'Διαχείριση θέσεων',
    assignHint: 'Πατήστε σε μια θέση για ανάθεση κράτησης',
  },
  en: {
    title: 'Layout Studio',
    subtitle: 'Design the digital twin of your venue',
    uploadImage: 'Upload layout',
    analyzing: 'AI analyzing...',
    reAnalyze: 'AI Analysis',
    clickToPlace: 'Click on the layout to place',
    uploadFirst: 'Upload your venue layout',
    uploadHint: 'AI will detect tables & fixtures — you refine positions',
    saved: 'Saved',
    deleted: 'Deleted',
    cancel: 'Cancel',
    totalCapacity: 'Capacity',
    aiSuccess: 'AI generated the floor plan! Drag items to position.',
    aiError: 'AI analysis error',
    sameImage: 'Same layout — keeping existing.',
    opacity: 'Opacity',
    gridSnap: 'Snap to grid',
    deleteReference: 'Delete image',
    referenceDeleted: 'Reference image deleted',
    duplicated: 'Duplicated',
    noItems: 'Add a shape from the toolbar above',
    startBlank: 'Start blank',
    saveLayout: 'Save',
    editLayout: 'Edit',
    layoutSaved: 'Layout saved',
    assignMode: 'Manage seats',
    assignHint: 'Click a seat to assign a reservation',
  },
};

export function FloorPlanEditor({ businessId }: FloorPlanEditorProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<FloorPlanItemFull[]>([]);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [placingMode, setPlacingMode] = useState<PlaceShape | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; handle: string; startX: number; startY: number; origW: number; origH: number; origXP: number; origYP: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [analysisHash, setAnalysisHash] = useState<string | null>(null);

  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [showReferenceImage, setShowReferenceImage] = useState(true);
  const [referenceOpacity, setReferenceOpacity] = useState(40);
  const [gridSnap, setGridSnap] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [dragCoords, setDragCoords] = useState<{ x: number; y: number } | null>(null);

  const [showRightPanel, setShowRightPanel] = useState(true);

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
          const item = items.find(i => i.id === selectedItem);
          if (item && !item.is_locked) {
            const updated = { ...item, rotation: (item.rotation + 45) % 360 };
            updateItemLocal(updated);
            debouncedSave(updated);
          }
        }
      }
      if (e.key === 'l' || e.key === 'L') {
        if (selectedItem) {
          const item = items.find(i => i.id === selectedItem);
          if (item) {
            const updated = { ...item, is_locked: !item.is_locked };
            updateItemLocal(updated);
            debouncedSave(updated);
          }
        }
      }
      if (e.key === 'g' || e.key === 'G') {
        setGridSnap(prev => !prev);
        setShowGrid(prev => !prev);
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
          const item = items.find(i => i.id === selectedItem);
          if (item) duplicateItem(item);
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedItem) {
        e.preventDefault();
        const item = items.find(i => i.id === selectedItem);
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

    const loadedItems = ((itemsResult.data || []) as unknown as FloorPlanItemFull[]).map(i => ({
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
    if (meta?.analysis_hash) setAnalysisHash(meta.analysis_hash as string);
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

  const handleAIAnalysis = async (file: File) => {
    setAiAnalyzing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const [{ width, height }, imageHash] = await Promise.all([getImageDimensions(file), hashDataUrl(base64)]);
      if (analysisHash && analysisHash === imageHash) { toast.info(t.sameImage); setAiAnalyzing(false); return; }

      const [aiResult, refUrl] = await Promise.all([
        supabase.functions.invoke('analyze-floor-plan', { body: { imageBase64: base64 } }),
        uploadReferenceImage(file),
      ]);
      const { data, error } = aiResult;
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fixtures = data?.fixtures || [];
      const tables = data?.tables || [];
      if (fixtures.length === 0 && tables.length === 0) throw new Error('AI did not detect any objects');

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      await Promise.all([
        supabase.from('floor_plan_tables').delete().eq('business_id', businessId),
        supabase.from('floor_plan_zones').delete().eq('business_id', businessId),
      ]);

      const fixtureBboxes: Record<string, { w: number; h: number }> = {};
      fixtures.forEach((f: any) => { fixtureBboxes[f.label] = { w: f.width_percent, h: f.height_percent }; });
      const tableBboxes: Record<string, { w: number; h: number }> = {};
      tables.forEach((tb: any) => { tableBboxes[tb.label] = { w: tb.width_percent, h: tb.height_percent }; });

      const { data: metaZone } = await supabase.from('floor_plan_zones').insert({
        business_id: businessId, label: '_metadata', zone_type: 'other', shape: 'rect',
        x_percent: 0, y_percent: 0, width_percent: 0, height_percent: 0, capacity: 0, sort_order: 0,
        metadata: { analysis_hash: imageHash, image_width: width, image_height: height, fixture_bboxes: fixtureBboxes, table_bboxes: tableBboxes, reference_image_url: refUrl },
      }).select().single();

      const fixtureRows = fixtures.map((f: any, i: number) => ({
        business_id: businessId, zone_id: metaZone?.id || null, label: f.label,
        x_percent: f.x_percent, y_percent: f.y_percent, seats: 0, shape: 'rect',
        sort_order: i, fixture_type: f.fixture_type,
        width_percent: f.width_percent, height_percent: f.height_percent,
        item_type: 'fixture',
      }));
      const tableRows = tables.map((tb: any, i: number) => ({
        business_id: businessId, zone_id: metaZone?.id || null, label: tb.label,
        x_percent: tb.x_percent, y_percent: tb.y_percent, seats: tb.seats, shape: tb.shape,
        sort_order: fixtures.length + i, fixture_type: null,
        width_percent: tb.width_percent, height_percent: tb.height_percent,
        item_type: 'table',
      }));

      const allRows = [...fixtureRows, ...tableRows];
      if (allRows.length > 0) {
        await supabase.from('floor_plan_tables').insert(allRows as any);
      }

      setAnalysisHash(imageHash);
      if (refUrl) { setReferenceImageUrl(refUrl); setShowReferenceImage(true); }
      await loadFloorPlan();
      toast.success(t.aiSuccess);
    } catch (err: any) {
      toast.error(t.aiError + ': ' + (err.message || 'Unknown'));
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleAIAnalysis(file);
    e.target.value = '';
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
    setItems(prev => prev.map(i => i.id === item.id ? item : i));
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
    return { ...(data as unknown as FloorPlanItemFull), rotation: item.rotation || 0, width_percent: item.width_percent || 5, height_percent: item.height_percent || 5, is_locked: false, item_type: item.item_type || 'table', color: item.color || null };
  };

  // Canvas click for placing
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !placingMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    if (gridSnap) { x = snapValue(x, SNAP_INCREMENT); y = snapValue(y, SNAP_INCREMENT); }

    const existingTables = items.filter(i => !i.fixture_type).length;
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
    saveItemToDB(newItem).then(saved => {
      if (saved) {
        history.pushState(items, 'add item');
        setItems(prev => [...prev, saved]);
        setHasFloorPlan(true);
        setSelectedItem(saved.id);
        toast.success(t.saved);
      }
    });
    setPlacingMode(null);
  }, [placingMode, items, gridSnap, zones]);

  // Properties panel change
  const handlePropertyChange = useCallback((updated: FloorPlanItemFull) => {
    history.pushState(items, 'edit properties');
    updateItemLocal(updated);
    debouncedSave(updated);
  }, [items, debouncedSave]);

  const deleteItem = async (itemId: string) => {
    history.pushState(items, 'delete');
    const { error } = await supabase.from('floor_plan_tables').delete().eq('id', itemId);
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.filter(i => i.id !== itemId));
    setSelectedItem(null);
    toast.success(t.deleted);
  };

  const duplicateItem = async (item: FloorPlanItemFull) => {
    const newItem: Partial<FloorPlanItemFull> = {
      ...item,
      label: item.label + ' (copy)',
      x_percent: clamp(item.x_percent + 3, -5, 100),
      y_percent: clamp(item.y_percent + 3, -5, 100),
    };
    const saved = await saveItemToDB(newItem);
    if (saved) {
      history.pushState(items, 'duplicate');
      setItems(prev => [...prev, saved]);
      setSelectedItem(saved.id);
      toast.success(t.duplicated);
    }
  };

  // Drag to move
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (placingMode) return;
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item || item.is_locked) return;
    history.pushState(items, 'move');
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: item.x_percent, origY: item.y_percent });
    setSelectedItem(id);
  };

  // Resize handle start
  const handleResizeStart = useCallback((e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    const item = items.find(i => i.id === id);
    if (!item || item.is_locked) return;
    history.pushState(items, 'resize');
    setResizing({
      id, handle,
      startX: e.clientX, startY: e.clientY,
      origW: item.width_percent, origH: item.height_percent,
      origXP: item.x_percent, origYP: item.y_percent,
    });
  }, [items, history]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (dragging) {
      const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
      let newX = clamp(dragging.origX + dx, -5, 105);
      let newY = clamp(dragging.origY + dy, -5, 105);
      if (gridSnap) { newX = snapValue(newX, SNAP_INCREMENT); newY = snapValue(newY, SNAP_INCREMENT); }
      setDragCoords({ x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
      setItems(prev => prev.map(i => i.id === dragging.id ? { ...i, x_percent: newX, y_percent: newY } : i));
    }

    if (resizing) {
      const dx = ((e.clientX - resizing.startX) / rect.width) * 100;
      const dy = ((e.clientY - resizing.startY) / rect.height) * 100;
      const h = resizing.handle;
      let newW = resizing.origW;
      let newH = resizing.origH;
      let newX = resizing.origXP;
      let newY = resizing.origYP;

      // Right handles
      if (h.includes('e')) newW = clamp(resizing.origW + dx, 1.5, 40);
      // Left handles
      if (h.includes('w')) {
        newW = clamp(resizing.origW - dx, 1.5, 40);
        newX = resizing.origXP + (resizing.origW - newW);
      }
      // Bottom handles
      if (h.includes('s')) newH = clamp(resizing.origH + dy, 1.5, 40);
      // Top handles
      if (h.includes('n')) {
        newH = clamp(resizing.origH - dy, 1.5, 40);
        newY = resizing.origYP + (resizing.origH - newH);
      }

      if (gridSnap) {
        newW = snapValue(newW, SNAP_INCREMENT);
        newH = snapValue(newH, SNAP_INCREMENT);
      }

      setItems(prev => prev.map(i =>
        i.id === resizing.id
          ? { ...i, width_percent: newW, height_percent: newH, x_percent: newX, y_percent: newY }
          : i
      ));
    }
  }, [dragging, resizing, gridSnap]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const item = items.find(i => i.id === dragging.id);
      if (item) debouncedSave(item);
      setDragging(null);
      setDragCoords(null);
    }
    if (resizing) {
      const item = items.find(i => i.id === resizing.id);
      if (item) debouncedSave(item);
      setResizing(null);
    }
  }, [dragging, resizing, items, debouncedSave]);

  const tableItems = items.filter(i => !i.fixture_type);
  const fixtureItems = items.filter(i => !!i.fixture_type);
  const totalCapacity = tableItems.reduce((sum, i) => sum + i.seats, 0);
  const selectedItemData = selectedItem ? items.find(i => i.id === selectedItem) || null : null;

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

  // Upload screen
  if (!hasFloorPlan && !aiAnalyzing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        <div
          className="relative border-2 border-dashed border-border/60 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 hover:border-primary/40 transition-all cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
              <Wand2 className="h-7 w-7 text-primary/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t.uploadFirst}</p>
              <p className="text-xs text-muted-foreground">{t.uploadHint}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="group-hover:border-primary/40 group-hover:text-primary">
                <Upload className="h-3.5 w-3.5 mr-1.5" />{t.uploadImage}
              </Button>
              <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); setHasFloorPlan(true); }}>
                {t.startBlank}
              </Button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>
    );
  }

  if (aiAnalyzing) {
    return (
      <div className="border-2 border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/[0.02] animate-pulse">
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">{t.analyzing}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
          <span>🪑 {tableItems.length}</span>
          <div className="w-px h-3 bg-border" />
          <span><Users className="h-3 w-3 inline mr-1" />{totalCapacity}</span>
          {fixtureItems.length > 0 && <>
            <div className="w-px h-3 bg-border" />
            <span>📍 {fixtureItems.length}</span>
          </>}
        </div>
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-md border border-border/40 rounded-xl px-3 py-2 flex-wrap">
        {placingMode ? (
          <>
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2.5 py-1.5">
              <MousePointer className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">{t.clickToPlace}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPlacingMode(null)}>
              <X className="h-3.5 w-3.5 mr-1" />{t.cancel}
            </Button>
          </>
        ) : (
          <>
            {/* Undo / Redo */}
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!history.canUndo} onClick={() => { const prev = history.undo(); if (prev) setItems(prev); }} title="Undo (Ctrl+Z)">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!history.canRedo} onClick={() => { const next = history.redo(); if (next) setItems(next); }} title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-5 bg-border/40 mx-1" />

            {/* Shape buttons */}
            {TOOLBAR_SHAPES.map(shape => (
              <Button
                key={shape.id}
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 px-2.5"
                onClick={() => setPlacingMode(shape)}
                title={language === 'el' ? shape.label_el : shape.label_en}
              >
                {shape.icon}
                <span className="hidden lg:inline">{language === 'el' ? shape.label_el : shape.label_en}</span>
              </Button>
            ))}

            <div className="w-px h-5 bg-border/40 mx-1" />

            {/* Grid & Labels */}
            <Button variant={gridSnap ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => { setGridSnap(!gridSnap); setShowGrid(!showGrid); }} title={t.gridSnap}>
              <Magnet className="h-3.5 w-3.5" />
            </Button>
            <Button variant={showLabels ? 'ghost' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setShowLabels(!showLabels)} title="Labels">
              {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
            {referenceImageUrl && (
              <Button variant={showReferenceImage ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setShowReferenceImage(!showReferenceImage)} title="Reference Image">
                {showReferenceImage ? <Eye className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />}
              </Button>
            )}

            <div className="flex-1" />

            {/* Right side */}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowRightPanel(!showRightPanel)} title="Properties">
              {showRightPanel ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={aiAnalyzing}>
              <Wand2 className="h-3.5 w-3.5 mr-1" />{t.reAnalyze}
            </Button>
          </>
        )}
      </div>

      {/* Reference image opacity */}
      {referenceImageUrl && showReferenceImage && (
        <div className="flex items-center gap-3 bg-card/60 border border-border/30 rounded-lg px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t.opacity}</span>
          <Slider value={[referenceOpacity]} onValueChange={([v]) => setReferenceOpacity(v)} min={5} max={90} step={5} className="flex-1 max-w-[200px]" />
          <span className="text-[10px] text-muted-foreground w-8 text-right">{referenceOpacity}%</span>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={deleteReferenceImage}>
            <Trash2 className="h-3 w-3 mr-1" />{t.deleteReference}
          </Button>
        </div>
      )}

      {/* ═══ CANVAS + PROPERTIES ═══ */}
      <div className="flex gap-0 rounded-xl overflow-hidden border border-border/30 bg-card shadow-2xl" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {/* Canvas */}
        <div className="flex-1 relative">
          <div
            ref={canvasRef}
            className={`relative select-none w-full h-full ${placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Premium dark background */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse at 30% 20%, hsl(var(--floorplan-canvas-elevated)) 0%, hsl(var(--floorplan-canvas)) 60%, hsl(220 32% 5%) 100%)',
            }} />
            <div className="absolute inset-0 border border-white/[0.03] rounded-none pointer-events-none" />

            {/* Reference image */}
            {referenceImageUrl && showReferenceImage && (
              <img src={referenceImageUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ opacity: referenceOpacity / 100 }} draggable={false} />
            )}

            {/* Empty state */}
            {items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground/40 text-center px-8">{t.noItems}</p>
              </div>
            )}

            {/* SVG Canvas */}
            <VenueSVGCanvas
              items={items}
              fixtureBboxes={fixtureBboxes}
              tableBboxes={tableBboxes}
              selectedItemId={selectedItem}
              showLabels={showLabels}
              showGrid={showGrid}
              gridSnap={SNAP_INCREMENT}
              onTableClick={(id) => { if (!placingMode) setSelectedItem(id === selectedItem ? null : id); }}
              onItemMouseDown={(e, id) => handleMouseDown(e, id)}
              onItemDoubleClick={(id) => setSelectedItem(id)}
              onResizeStart={handleResizeStart}
              interactive={!placingMode}
            />

            {/* Drag tooltip */}
            {dragging && dragCoords && (
              <div
                className="absolute bg-card/90 backdrop-blur-sm border border-border/50 rounded px-1.5 py-0.5 text-[10px] text-foreground pointer-events-none z-20"
                style={{ left: `${dragCoords.x}%`, top: `${Math.max(0, dragCoords.y - 5)}%`, transform: 'translate(-50%, -100%)' }}
              >
                {dragCoords.x}%, {dragCoords.y}%
              </div>
            )}
          </div>
        </div>

        {/* Right: Properties Panel */}
        {showRightPanel && (
          <div className="w-[260px] xl:w-[300px] flex-shrink-0">
            {selectedItemData ? (
              <ItemPropertiesPanel
                item={selectedItemData}
                onChange={handlePropertyChange}
                onDelete={deleteItem}
                onDuplicate={duplicateItem}
              />
            ) : (
              <EmptyPropertiesPanel />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
