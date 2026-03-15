import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Upload, Trash2, MapPin, MousePointer, Eye, EyeOff,
  ImageOff, Magnet, Undo2, Redo2,
  PanelRightOpen, PanelRightClose, X, Users, Circle, Square, RectangleHorizontal,
  Sofa, Beer, Music, Landmark, Save, Pencil, ZoomIn, ZoomOut, Maximize,
  LayoutTemplate, Layers
} from 'lucide-react';
import { VenueSVGCanvas } from './VenueSVGCanvas';
import { ItemPropertiesPanel, EmptyPropertiesPanel, type FloorPlanItemFull } from './ItemPropertiesPanel';
import { useFloorPlanHistory } from './useFloorPlanHistory';
import { useFloorPlanZoom } from './useFloorPlanZoom';
import { FloorPlanRoomTabs, type FloorPlanRoom } from './FloorPlanRoomTabs';
import { FloorPlanTemplates, type VenueTemplate } from './FloorPlanTemplates';
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
  metadata?: { reference_image_url?: string; [key: string]: unknown } | null;
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
    uploadReference: 'Ανέβασμα εικόνας αναφοράς',
    clickToPlace: 'Κάντε κλικ στο σχεδιάγραμμα',
    startDesign: 'Ξεκινήστε το σχεδιασμό',
    startDesignHint: 'Τοποθετήστε τραπέζια, bar, σκηνή και άλλα στοιχεία στον χώρο σας',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Διαγράφηκε',
    cancel: 'Ακύρωση',
    totalCapacity: 'Χωρητικότητα',
    opacity: 'Αδιαφάνεια',
    gridSnap: 'Πλέγμα',
    deleteReference: 'Διαγραφή εικόνας',
    referenceDeleted: 'Εικόνα αναφοράς διαγράφηκε',
    duplicated: 'Αντιγράφηκε',
    noItems: 'Προσθέστε ένα σχήμα από τη γραμμή εργαλείων',
    startBlank: 'Σχεδιάστε τον χώρο',
    withReference: 'Με εικόνα αναφοράς',
    withTemplate: 'Με πρότυπο',
    saveLayout: 'Αποθήκευση',
    editLayout: 'Επεξεργασία',
    layoutSaved: 'Το σχεδιάγραμμα αποθηκεύτηκε',
    assignMode: 'Διαχείριση θέσεων',
    assignHint: 'Πατήστε σε μια θέση για ανάθεση κράτησης',
    multiSelected: 'αντικείμενα επιλεγμένα',
    deleteAll: 'Διαγραφή όλων',
    selectHint: 'Shift+Click για πολλαπλή επιλογή',
    combined: 'Τραπέζια συνδέθηκαν',
    uncombined: 'Τραπέζια αποσυνδέθηκαν',
    templateApplied: 'Το πρότυπο εφαρμόστηκε',
  },
  en: {
    title: 'Layout Studio',
    subtitle: 'Design the digital twin of your venue',
    uploadReference: 'Upload reference image',
    clickToPlace: 'Click on the layout to place',
    startDesign: 'Start designing',
    startDesignHint: 'Place tables, bar, stage and other elements in your venue',
    saved: 'Saved',
    deleted: 'Deleted',
    cancel: 'Cancel',
    totalCapacity: 'Capacity',
    opacity: 'Opacity',
    gridSnap: 'Snap to grid',
    deleteReference: 'Delete image',
    referenceDeleted: 'Reference image deleted',
    duplicated: 'Duplicated',
    noItems: 'Add a shape from the toolbar above',
    startBlank: 'Design your venue',
    withReference: 'With reference image',
    withTemplate: 'From template',
    saveLayout: 'Save',
    editLayout: 'Edit',
    layoutSaved: 'Layout saved',
    assignMode: 'Manage seats',
    assignHint: 'Click a seat to assign a reservation',
    multiSelected: 'items selected',
    deleteAll: 'Delete all',
    selectHint: 'Shift+Click for multi-select',
    combined: 'Tables combined',
    uncombined: 'Tables uncombined',
    templateApplied: 'Template applied',
  },
};

export function FloorPlanEditor({ businessId }: FloorPlanEditorProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<FloorPlanItemFull[]>([]);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [rooms, setRooms] = useState<FloorPlanRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [placingMode, setPlacingMode] = useState<PlaceShape | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origPositions: Map<string, { x: number; y: number }> } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; handle: string; startX: number; startY: number; origW: number; origH: number; origXP: number; origYP: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showSeatDots, setShowSeatDots] = useState(true);
  const [showSections, setShowSections] = useState(true);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [showReferenceImage, setShowReferenceImage] = useState(true);
  const [referenceOpacity, setReferenceOpacity] = useState(40);
  const [gridSnap, setGridSnap] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [dragCoords, setDragCoords] = useState<{ x: number; y: number } | null>(null);
  const [isDesignMode, setIsDesignMode] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  const history = useFloorPlanHistory<FloorPlanItemFull>(items);
  const zoom = useFloorPlanZoom(zoomContainerRef);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter items by active room
  const visibleItems = activeRoomId
    ? items.filter(i => i.room_id === activeRoomId || !i.room_id)
    : items;

  useEffect(() => { loadFloorPlan(); }, [businessId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItems.length > 0) {
          e.preventDefault();
          deleteMultipleItems(selectedItems);
        } else if (selectedItem) {
          e.preventDefault();
          deleteItem(selectedItem);
        }
      }
      if (e.key === 'Escape') { setSelectedItem(null); setSelectedItems([]); setPlacingMode(null); }
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
      if (e.key === 'g' || e.key === 'G') { setGridSnap(p => !p); setShowGrid(p => !p); }
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
      // Arrow key nudge
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
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); zoom.zoomIn(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoom.zoomOut(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); zoom.resetZoom(); }
      // Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedItems(visibleItems.map(i => i.id));
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedItem, selectedItems, items, history, visibleItems, zoom]);

  const loadFloorPlan = async () => {
    setLoading(true);
    const [itemsResult, zonesResult, roomsResult] = await Promise.all([
      supabase.from('floor_plan_tables').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order').limit(1),
      supabase.from('floor_plan_rooms').select('*').eq('business_id', businessId).order('sort_order'),
    ]);

    const loadedItems = ((itemsResult.data || []) as unknown as FloorPlanItemFull[]).map(i => ({
      ...i,
      rotation: (i as any).rotation ?? 0,
      width_percent: (i as any).width_percent ?? 5,
      height_percent: (i as any).height_percent ?? 5,
      is_locked: (i as any).is_locked ?? false,
      item_type: (i as any).item_type ?? 'table',
      color: (i as any).color ?? null,
      room_id: (i as any).room_id ?? null,
      combined_with: (i as any).combined_with ?? [],
      section_label: (i as any).section_label ?? null,
    }));
    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    const loadedRooms = (roomsResult.data || []) as FloorPlanRoom[];

    setItems(loadedItems);
    setZones(loadedZones);
    setRooms(loadedRooms);
    setHasFloorPlan(loadedItems.length > 0);
    if (loadedItems.length > 0) setIsDesignMode(true);
    if (loadedRooms.length > 0) setActiveRoomId(loadedRooms[0].id);
    history.reset(loadedItems);

    const meta = loadedZones[0]?.metadata;
    if (meta?.reference_image_url) setReferenceImageUrl(meta.reference_image_url as string);
    setLoading(false);
  };

  // Room management
  const addRoom = async (label: string) => {
    const { data, error } = await supabase.from('floor_plan_rooms').insert({
      business_id: businessId,
      label,
      sort_order: rooms.length,
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    const newRoom = data as unknown as FloorPlanRoom;
    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(newRoom.id);
    toast.success(t.saved);
  };

  const renameRoom = async (roomId: string, label: string) => {
    await supabase.from('floor_plan_rooms').update({ label } as any).eq('id', roomId);
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, label } : r));
  };

  const deleteRoom = async (roomId: string) => {
    // Move items to null room
    await supabase.from('floor_plan_tables').update({ room_id: null } as any).eq('room_id', roomId);
    await supabase.from('floor_plan_rooms').delete().eq('id', roomId);
    setItems(prev => prev.map(i => i.room_id === roomId ? { ...i, room_id: null } : i));
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (activeRoomId === roomId) setActiveRoomId(rooms.length > 1 ? rooms.find(r => r.id !== roomId)?.id || null : null);
    toast.success(t.deleted);
  };

  // Table combining
  const combineTable = async (sourceId: string, targetId: string) => {
    const source = items.find(i => i.id === sourceId);
    const target = items.find(i => i.id === targetId);
    if (!source || !target) return;

    const newSourceCombined = [...(source.combined_with || []), targetId];
    const newTargetCombined = [...(target.combined_with || []), sourceId];

    await Promise.all([
      supabase.from('floor_plan_tables').update({ combined_with: newSourceCombined } as any).eq('id', sourceId),
      supabase.from('floor_plan_tables').update({ combined_with: newTargetCombined } as any).eq('id', targetId),
    ]);

    setItems(prev => prev.map(i => {
      if (i.id === sourceId) return { ...i, combined_with: newSourceCombined };
      if (i.id === targetId) return { ...i, combined_with: newTargetCombined };
      return i;
    }));
    toast.success(t.combined);
  };

  const uncombineTable = async (sourceId: string, targetId: string) => {
    const source = items.find(i => i.id === sourceId);
    const target = items.find(i => i.id === targetId);
    if (!source || !target) return;

    const newSourceCombined = (source.combined_with || []).filter(id => id !== targetId);
    const newTargetCombined = (target.combined_with || []).filter(id => id !== sourceId);

    await Promise.all([
      supabase.from('floor_plan_tables').update({ combined_with: newSourceCombined } as any).eq('id', sourceId),
      supabase.from('floor_plan_tables').update({ combined_with: newTargetCombined } as any).eq('id', targetId),
    ]);

    setItems(prev => prev.map(i => {
      if (i.id === sourceId) return { ...i, combined_with: newSourceCombined };
      if (i.id === targetId) return { ...i, combined_with: newTargetCombined };
      return i;
    }));
    toast.success(t.uncombined);
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
        section_label: item.section_label, room_id: item.room_id,
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
      room_id: activeRoomId || item.room_id || null,
      section_label: item.section_label || null,
    } as any).select().single();
    if (error) { toast.error(error.message); return null; }
    return {
      ...(data as unknown as FloorPlanItemFull),
      rotation: item.rotation || 0, width_percent: item.width_percent || 5,
      height_percent: item.height_percent || 5, is_locked: false,
      item_type: item.item_type || 'table', color: item.color || null,
      room_id: activeRoomId || item.room_id || null,
      combined_with: [], section_label: item.section_label || null,
    };
  };

  // Auto-label: generates next label based on existing items
  const getNextLabel = (fixtureType: string | null, labelPrefix?: string) => {
    if (fixtureType) return (labelPrefix || fixtureType).toUpperCase();
    const existingTables = visibleItems.filter(i => !i.fixture_type);
    const maxNum = existingTables.reduce((max, t) => {
      const match = t.label.match(/^T(\d+)$/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `T${maxNum + 1}`;
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !placingMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    if (gridSnap) { x = snapValue(x, SNAP_INCREMENT); y = snapValue(y, SNAP_INCREMENT); }

    const label = getNextLabel(placingMode.fixture_type, placingMode.label_en);
    const newItem: Partial<FloorPlanItemFull> = {
      label,
      x_percent: clamp(x, -3, 103), y_percent: clamp(y, -3, 103),
      seats: placingMode.seats, shape: placingMode.shape,
      fixture_type: placingMode.fixture_type, rotation: 0,
      width_percent: placingMode.width_percent, height_percent: placingMode.height_percent,
      item_type: placingMode.item_type,
    };
    saveItemToDB(newItem).then(saved => {
      if (saved) {
        history.pushState(items, 'add item');
        setItems(prev => [...prev, saved]);
        setHasFloorPlan(true);
        setSelectedItem(saved.id);
        setSelectedItems([]);
        toast.success(t.saved);
      }
    });
    setPlacingMode(null);
  }, [placingMode, items, gridSnap, zones, activeRoomId, visibleItems]);

  // Handle table click with multi-select support
  const handleTableClick = useCallback((id: string, e?: React.MouseEvent) => {
    if (!isDesignMode || placingMode) return;
    // Note: e is not available from SVG click handler, so we check window event
    const shiftKey = (window.event as KeyboardEvent)?.shiftKey || false;

    if (shiftKey) {
      setSelectedItems(prev => {
        if (prev.includes(id)) return prev.filter(x => x !== id);
        return [...prev, id];
      });
      setSelectedItem(null);
    } else {
      setSelectedItem(id === selectedItem ? null : id);
      setSelectedItems([]);
    }
  }, [isDesignMode, placingMode, selectedItem]);

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
    setSelectedItems(prev => prev.filter(id => id !== itemId));
    toast.success(t.deleted);
  };

  const deleteMultipleItems = async (ids: string[]) => {
    history.pushState(items, 'delete multiple');
    for (const id of ids) {
      await supabase.from('floor_plan_tables').delete().eq('id', id);
    }
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    setSelectedItem(null);
    setSelectedItems([]);
    toast.success(t.deleted);
  };

  const duplicateItem = async (item: FloorPlanItemFull) => {
    const newItem: Partial<FloorPlanItemFull> = {
      ...item,
      label: getNextLabel(item.fixture_type),
      x_percent: clamp(item.x_percent + 3, -5, 100),
      y_percent: clamp(item.y_percent + 3, -5, 100),
      section_label: item.section_label,
    };
    const saved = await saveItemToDB(newItem);
    if (saved) {
      history.pushState(items, 'duplicate');
      setItems(prev => [...prev, saved]);
      setSelectedItem(saved.id);
      setSelectedItems([]);
      toast.success(t.duplicated);
    }
  };

  // Apply template
  const applyTemplate = async (template: VenueTemplate) => {
    // Ensure we have a room
    let roomId = activeRoomId;
    if (!roomId && rooms.length === 0) {
      const { data } = await supabase.from('floor_plan_rooms').insert({
        business_id: businessId, label: 'Main floor', sort_order: 0,
      } as any).select().single();
      if (data) {
        const newRoom = data as unknown as FloorPlanRoom;
        setRooms([newRoom]);
        roomId = newRoom.id;
        setActiveRoomId(roomId);
      }
    }

    const savedItems: FloorPlanItemFull[] = [];
    for (const tmplItem of template.items) {
      const { data, error } = await supabase.from('floor_plan_tables').insert({
        business_id: businessId,
        zone_id: zones[0]?.id || null,
        label: tmplItem.label,
        x_percent: tmplItem.x_percent,
        y_percent: tmplItem.y_percent,
        seats: tmplItem.seats,
        shape: tmplItem.shape,
        sort_order: items.length + savedItems.length,
        fixture_type: tmplItem.fixture_type,
        rotation: tmplItem.rotation,
        width_percent: tmplItem.width_percent,
        height_percent: tmplItem.height_percent,
        is_locked: false,
        item_type: tmplItem.item_type,
        room_id: roomId,
        section_label: tmplItem.section_label || null,
      } as any).select().single();
      if (!error && data) {
        savedItems.push({
          ...(data as unknown as FloorPlanItemFull),
          rotation: tmplItem.rotation, width_percent: tmplItem.width_percent,
          height_percent: tmplItem.height_percent, is_locked: false,
          item_type: tmplItem.item_type, color: null,
          room_id: roomId, combined_with: [],
          section_label: tmplItem.section_label || null,
        });
      }
    }

    history.pushState(items, 'apply template');
    setItems(prev => [...prev, ...savedItems]);
    setHasFloorPlan(true);
    toast.success(t.templateApplied);
  };

  const handleSaveLayout = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    for (const item of items) {
      await supabase.from('floor_plan_tables').update({
        label: item.label, x_percent: item.x_percent, y_percent: item.y_percent,
        seats: item.seats, shape: item.shape, rotation: item.rotation,
        width_percent: item.width_percent, height_percent: item.height_percent,
        is_locked: item.is_locked, item_type: item.item_type, color: item.color,
        section_label: item.section_label, room_id: item.room_id,
      } as any).eq('id', item.id);
    }
    setIsDesignMode(false);
    setSelectedItem(null);
    setSelectedItems([]);
    setPlacingMode(null);
    toast.success(t.layoutSaved);
  }, [items, t.layoutSaved]);

  // Drag to move (supports multi-select)
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (placingMode) return;
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item || item.is_locked) return;
    history.pushState(items, 'move');

    const dragIds = selectedItems.includes(id) ? selectedItems : [id];
    const origPositions = new Map<string, { x: number; y: number }>();
    for (const did of dragIds) {
      const di = items.find(i => i.id === did);
      if (di) origPositions.set(did, { x: di.x_percent, y: di.y_percent });
    }

    setDragging({ id, startX: e.clientX, startY: e.clientY, origPositions });
    if (!selectedItems.includes(id)) {
      setSelectedItem(id);
      setSelectedItems([]);
    }
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    const item = items.find(i => i.id === id);
    if (!item || item.is_locked) return;
    history.pushState(items, 'resize');
    setResizing({
      id, handle, startX: e.clientX, startY: e.clientY,
      origW: item.width_percent, origH: item.height_percent,
      origXP: item.x_percent, origYP: item.y_percent,
    });
  }, [items, history]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (dragging) {
      const dx = ((e.clientX - dragging.startX) / rect.width) * 100 / zoom.scale;
      const dy = ((e.clientY - dragging.startY) / rect.height) * 100 / zoom.scale;

      setItems(prev => prev.map(i => {
        const orig = dragging.origPositions.get(i.id);
        if (!orig) return i;
        let newX = clamp(orig.x + dx, -5, 105);
        let newY = clamp(orig.y + dy, -5, 105);
        if (gridSnap) { newX = snapValue(newX, SNAP_INCREMENT); newY = snapValue(newY, SNAP_INCREMENT); }
        return { ...i, x_percent: newX, y_percent: newY };
      }));

      const mainOrig = dragging.origPositions.get(dragging.id);
      if (mainOrig) {
        let cx = clamp(mainOrig.x + dx, -5, 105);
        let cy = clamp(mainOrig.y + dy, -5, 105);
        if (gridSnap) { cx = snapValue(cx, SNAP_INCREMENT); cy = snapValue(cy, SNAP_INCREMENT); }
        setDragCoords({ x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10 });
      }
    }

    if (resizing) {
      const dx = ((e.clientX - resizing.startX) / rect.width) * 100 / zoom.scale;
      const dy = ((e.clientY - resizing.startY) / rect.height) * 100 / zoom.scale;
      const h = resizing.handle;
      let newW = resizing.origW, newH = resizing.origH;
      let newX = resizing.origXP, newY = resizing.origYP;

      if (h.includes('e')) newW = clamp(resizing.origW + dx, 1.5, 40);
      if (h.includes('w')) { newW = clamp(resizing.origW - dx, 1.5, 40); newX = resizing.origXP + (resizing.origW - newW); }
      if (h.includes('s')) newH = clamp(resizing.origH + dy, 1.5, 40);
      if (h.includes('n')) { newH = clamp(resizing.origH - dy, 1.5, 40); newY = resizing.origYP + (resizing.origH - newH); }

      if (gridSnap) { newW = snapValue(newW, SNAP_INCREMENT); newH = snapValue(newH, SNAP_INCREMENT); }

      setItems(prev => prev.map(i =>
        i.id === resizing.id ? { ...i, width_percent: newW, height_percent: newH, x_percent: newX, y_percent: newY } : i
      ));
    }
  }, [dragging, resizing, gridSnap, zoom.scale]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      dragging.origPositions.forEach((_, id) => {
        const item = items.find(i => i.id === id);
        if (item) debouncedSave(item);
      });
      setDragging(null);
      setDragCoords(null);
    }
    if (resizing) {
      const item = items.find(i => i.id === resizing.id);
      if (item) debouncedSave(item);
      setResizing(null);
    }
  }, [dragging, resizing, items, debouncedSave]);

  const tableItems = visibleItems.filter(i => !i.fixture_type);
  const fixtureItems = visibleItems.filter(i => !!i.fixture_type);
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

  // Welcome screen
  if (!hasFloorPlan) {
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
        <div className="relative border-2 border-dashed border-border/60 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 hover:border-primary/40 transition-all">
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-primary/60" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t.startDesign}</p>
              <p className="text-xs text-muted-foreground">{t.startDesignHint}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="default" size="sm" onClick={() => setHasFloorPlan(true)}>
                {t.startBlank}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setHasFloorPlan(true); setShowTemplates(true); }}>
                <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />{t.withTemplate}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setHasFloorPlan(true); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />{t.withReference}
              </Button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
        <FloorPlanTemplates open={showTemplates} onClose={() => setShowTemplates(false)} onSelect={applyTemplate} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
            <p className="text-xs text-muted-foreground">
              {isDesignMode ? t.subtitle : t.assignHint}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
            <span>🪑 {tableItems.length}</span>
            <div className="w-px h-3 bg-border" />
            <span><Users className="h-3 w-3 inline mr-1" />{totalCapacity}</span>
            {fixtureItems.length > 0 && <>
              <div className="w-px h-3 bg-border" />
              <span>📍 {fixtureItems.length}</span>
            </>}
          </div>
          {isDesignMode ? (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSaveLayout}>
              <Save className="h-3.5 w-3.5" />{t.saveLayout}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setIsDesignMode(true)}>
              <Pencil className="h-3.5 w-3.5" />{t.editLayout}
            </Button>
          )}
        </div>
      </div>

      {/* Room tabs */}
      {(rooms.length > 0 || isDesignMode) && (
        <FloorPlanRoomTabs
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelect={setActiveRoomId}
          onAdd={addRoom}
          onRename={renameRoom}
          onDelete={deleteRoom}
          isDesignMode={isDesignMode}
        />
      )}

      {/* TOOLBAR (design mode only) */}
      {isDesignMode && (
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
                <Button key={shape.id} variant="ghost" size="sm" className="h-8 text-xs gap-1.5 px-2.5" onClick={() => setPlacingMode(shape)} title={language === 'el' ? shape.label_el : shape.label_en}>
                  {shape.icon}
                  <span className="hidden lg:inline">{language === 'el' ? shape.label_el : shape.label_en}</span>
                </Button>
              ))}

              <div className="w-px h-5 bg-border/40 mx-1" />

              {/* Grid, Labels, Sections, Seat dots */}
              <Button variant={gridSnap ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => { setGridSnap(!gridSnap); setShowGrid(!showGrid); }} title={t.gridSnap}>
                <Magnet className="h-3.5 w-3.5" />
              </Button>
              <Button variant={showLabels ? 'ghost' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setShowLabels(!showLabels)} title="Labels">
                {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button variant={showSections ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setShowSections(!showSections)} title="Sections">
                <Layers className="h-3.5 w-3.5" />
              </Button>
              {referenceImageUrl && (
                <Button variant={showReferenceImage ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setShowReferenceImage(!showReferenceImage)} title="Reference Image">
                  {showReferenceImage ? <Eye className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />}
                </Button>
              )}

              <div className="flex-1" />

              {/* Template button */}
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowTemplates(true)} title="Templates">
                <LayoutTemplate className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{language === 'el' ? 'Πρότυπα' : 'Templates'}</span>
              </Button>

              {/* Right panel toggle */}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowRightPanel(!showRightPanel)} title="Properties">
                {showRightPanel ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </>
          )}
        </div>
      )}

      {/* Multi-select info bar */}
      {selectedItems.length > 1 && isDesignMode && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-primary">{selectedItems.length} {t.multiSelected}</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive/20" onClick={() => deleteMultipleItems(selectedItems)}>
            <Trash2 className="h-3 w-3 mr-1" />{t.deleteAll}
          </Button>
        </div>
      )}

      {/* Reference image opacity */}
      {isDesignMode && referenceImageUrl && showReferenceImage && (
        <div className="flex items-center gap-3 bg-card/60 border border-border/30 rounded-lg px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t.opacity}</span>
          <Slider value={[referenceOpacity]} onValueChange={([v]) => setReferenceOpacity(v)} min={5} max={90} step={5} className="flex-1 max-w-[200px]" />
          <span className="text-[10px] text-muted-foreground w-8 text-right">{referenceOpacity}%</span>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={deleteReferenceImage}>
            <Trash2 className="h-3 w-3 mr-1" />{t.deleteReference}
          </Button>
        </div>
      )}

      {/* CANVAS + PROPERTIES */}
      <div className="flex gap-0 rounded-xl overflow-hidden border border-border/30 bg-card shadow-2xl" style={{ minHeight: '400px' }}>
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden" ref={zoomContainerRef}>
          <div className="absolute inset-0" style={{ aspectRatio: '4 / 3' }}>
            <div
              ref={canvasRef}
              className={`absolute inset-0 select-none ${isDesignMode && placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
              style={zoom.transformStyle}
              onClick={isDesignMode ? handleCanvasClick : undefined}
              onMouseMove={isDesignMode ? handleMouseMove : undefined}
              onMouseUp={isDesignMode ? handleMouseUp : undefined}
              onMouseLeave={isDesignMode ? handleMouseUp : undefined}
              onMouseDown={zoom.handlePanStart}
            >
              {/* Background */}
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse at 30% 20%, hsl(var(--floorplan-canvas-elevated)) 0%, hsl(var(--floorplan-canvas)) 60%, hsl(220 32% 5%) 100%)',
              }} />
              <div className="absolute inset-0 border border-white/[0.03] rounded-none pointer-events-none" />

              {/* Reference image */}
              {isDesignMode && referenceImageUrl && showReferenceImage && (
                <img src={referenceImageUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ opacity: referenceOpacity / 100 }} draggable={false} />
              )}

              {/* Empty state */}
              {visibleItems.length === 0 && isDesignMode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground/40">{t.noItems}</p>
                    <p className="text-[10px] text-muted-foreground/25">{t.selectHint}</p>
                  </div>
                </div>
              )}

              {/* SVG Canvas */}
              <VenueSVGCanvas
                items={visibleItems}
                fixtureBboxes={fixtureBboxes}
                tableBboxes={tableBboxes}
                selectedItemId={isDesignMode ? selectedItem : null}
                selectedItemIds={isDesignMode ? selectedItems : []}
                showLabels={showLabels}
                showSeatDots={showSeatDots}
                showGrid={isDesignMode && showGrid}
                gridSnap={SNAP_INCREMENT}
                showSections={showSections}
                onTableClick={handleTableClick}
                onItemMouseDown={isDesignMode ? handleMouseDown : undefined}
                onItemDoubleClick={isDesignMode ? (id) => { setSelectedItem(id); setSelectedItems([]); } : undefined}
                onResizeStart={isDesignMode ? handleResizeStart : undefined}
                interactive={isDesignMode && !placingMode}
              />

              {/* Drag tooltip */}
              {isDesignMode && dragging && dragCoords && (
                <div
                  className="absolute bg-card/90 backdrop-blur-sm border border-border/50 rounded px-1.5 py-0.5 text-[10px] text-foreground pointer-events-none z-20"
                  style={{ left: `${dragCoords.x}%`, top: `${Math.max(0, dragCoords.y - 5)}%`, transform: 'translate(-50%, -100%)' }}
                >
                  {dragCoords.x}%, {dragCoords.y}%
                </div>
              )}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border/30 rounded-lg px-1.5 py-1 z-10">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoom.zoomOut} title="Zoom out (Ctrl+-)">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground w-10 text-center font-mono">
              {Math.round(zoom.scale * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoom.zoomIn} title="Zoom in (Ctrl+=)">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border/40" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoom.resetZoom} title="Reset zoom (Ctrl+0)">
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Right: Properties Panel */}
        {isDesignMode && showRightPanel && (
          <div className="w-[260px] xl:w-[300px] flex-shrink-0 hidden md:block">
            {selectedItemData ? (
              <ItemPropertiesPanel
                item={selectedItemData}
                onChange={handlePropertyChange}
                onDelete={deleteItem}
                onDuplicate={duplicateItem}
                allItems={items}
                onCombine={combineTable}
                onUncombine={uncombineTable}
              />
            ) : (
              <EmptyPropertiesPanel />
            )}
          </div>
        )}
      </div>

      {/* Templates dialog */}
      <FloorPlanTemplates open={showTemplates} onClose={() => setShowTemplates(false)} onSelect={applyTemplate} />
    </div>
  );
}
