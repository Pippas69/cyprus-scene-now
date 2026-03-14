import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Save, MapPin, MousePointer, Edit3, Users, X, Eye, EyeOff, Wand2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface FloorPlanTable {
  id: string;
  zone_id: string;
  business_id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
  sort_order: number;
}

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
    source_image_url?: string;
    [key: string]: unknown;
  } | null;
}

interface FloorPlanEditorProps {
  businessId: string;
}

interface ParsedAiTable {
  label: string;
  seats: number;
  shape: string;
  x_percent: number;
  y_percent: number;
}

interface ParsedAiZone {
  label: string;
  zone_type: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  capacity: number;
  tables: ParsedAiTable[];
}

const ZONE_TYPES = {
  vip: { color: '#F59E0B', bgAlpha: 0.15, icon: '⭐' },
  table: { color: '#3B82F6', bgAlpha: 0.15, icon: '🪑' },
  bar: { color: '#8B5CF6', bgAlpha: 0.15, icon: '🍸' },
  stage: { color: '#EF4444', bgAlpha: 0.15, icon: '🎤' },
  dj: { color: '#EC4899', bgAlpha: 0.15, icon: '🎧' },
  lounge: { color: '#14B8A6', bgAlpha: 0.15, icon: '🛋️' },
  other: { color: '#6B7280', bgAlpha: 0.15, icon: '📍' },
} as const;

const TABLE_RADIUS = 2.6;
const DEFAULT_CANVAS_ASPECT = 4 / 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toValidNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      resolve({ width: image.naturalWidth || 1200, height: image.naturalHeight || 900 });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read image dimensions'));
    };
    image.src = objectUrl;
  });
};

const hashDataUrl = async (dataUrl: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const getStoragePathFromPublicUrl = (url: string | null) => {
  if (!url) return null;
  const parts = url.split('/');
  if (parts.length < 2) return null;
  return parts.slice(-2).join('/');
};

const normalizeAiZones = (zonesInput: unknown): ParsedAiZone[] => {
  const input = Array.isArray(zonesInput) ? zonesInput : [];

  const zones: ParsedAiZone[] = input
    .slice(0, 60)
    .map((rawZone: any, zoneIndex): ParsedAiZone => {
      const x = clamp(toValidNumber(rawZone?.x_percent, 0), 0, 100);
      const y = clamp(toValidNumber(rawZone?.y_percent, 0), 0, 100);
      const width = clamp(toValidNumber(rawZone?.width_percent, 16), 6, 96);
      const height = clamp(toValidNumber(rawZone?.height_percent, 16), 6, 96);

      const fixedWidth = Math.max(6, Math.min(width, 100 - x));
      const fixedHeight = Math.max(6, Math.min(height, 100 - y));

      const tables: ParsedAiTable[] = (Array.isArray(rawZone?.tables) ? rawZone.tables : [])
        .slice(0, 160)
        .map((rawTable: any, tableIndex): ParsedAiTable => ({
          label: typeof rawTable?.label === 'string' && rawTable.label.trim().length > 0
            ? rawTable.label.trim().slice(0, 24)
            : `T${tableIndex + 1}`,
          seats: clamp(Math.round(toValidNumber(rawTable?.seats, 4)), 1, 20),
          shape: rawTable?.shape === 'square' || rawTable?.shape === 'rectangle' ? rawTable.shape : 'round',
          x_percent: clamp(toValidNumber(rawTable?.x_percent, x + fixedWidth / 2), x + 0.8, x + fixedWidth - 0.8),
          y_percent: clamp(toValidNumber(rawTable?.y_percent, y + fixedHeight / 2), y + 0.8, y + fixedHeight - 0.8),
        }));

      const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0);
      const fallbackCapacity = clamp(Math.round(toValidNumber(rawZone?.capacity, totalSeats || 4)), 0, 700);

      return {
        label: typeof rawZone?.label === 'string' && rawZone.label.trim().length > 0
          ? rawZone.label.trim().slice(0, 48)
          : `Zone ${zoneIndex + 1}`,
        zone_type: Object.keys(ZONE_TYPES).includes(rawZone?.zone_type) ? rawZone.zone_type : 'other',
        x_percent: x,
        y_percent: y,
        width_percent: fixedWidth,
        height_percent: fixedHeight,
        capacity: totalSeats > 0 ? totalSeats : fallbackCapacity,
        tables,
      };
    })
    .sort((a, b) => (a.y_percent - b.y_percent) || (a.x_percent - b.x_percent));

  if (zones.length === 0) return [];

  const minX = Math.min(...zones.map((z) => z.x_percent));
  const minY = Math.min(...zones.map((z) => z.y_percent));
  const maxX = Math.max(...zones.map((z) => z.x_percent + z.width_percent));
  const maxY = Math.max(...zones.map((z) => z.y_percent + z.height_percent));

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const targetPadding = 4;
  const targetSpan = 100 - targetPadding * 2;
  const scale = Math.min(targetSpan / spanX, targetSpan / spanY, 2.2);

  const scaledSpanX = spanX * scale;
  const scaledSpanY = spanY * scale;
  const offsetX = (100 - scaledSpanX) / 2 - minX * scale;
  const offsetY = (100 - scaledSpanY) / 2 - minY * scale;

  return zones.map((zone) => {
    const width = clamp(zone.width_percent * scale, 6, 98);
    const height = clamp(zone.height_percent * scale, 6, 98);
    const xPos = clamp(zone.x_percent * scale + offsetX, 0, 100 - width);
    const yPos = clamp(zone.y_percent * scale + offsetY, 0, 100 - height);

    const tables = zone.tables.map((table) => ({
      ...table,
      x_percent: clamp(table.x_percent * scale + offsetX, xPos + 0.8, xPos + width - 0.8),
      y_percent: clamp(table.y_percent * scale + offsetY, yPos + 0.8, yPos + height - 0.8),
    }));

    return {
      ...zone,
      x_percent: xPos,
      y_percent: yPos,
      width_percent: width,
      height_percent: height,
      capacity: tables.reduce((sum, table) => sum + table.seats, 0) || zone.capacity,
      tables,
    };
  });
};

const translations = {
  el: {
    title: 'Σχεδιάγραμμα χώρου',
    subtitle: 'Ανεβάστε την κάτοψη και η AI θα δημιουργήσει το interactive floor plan',
    uploadImage: 'Ανέβασμα κάτοψης',
    analyzeWithAI: 'Ανάλυση με AI',
    analyzing: 'Η AI αναλύει...',
    reAnalyze: 'Επανανάλυση AI',
    addZone: 'Νέα ζώνη',
    editZone: 'Επεξεργασία ζώνης',
    editTable: 'Επεξεργασία τραπεζιού',
    deleteZone: 'Διαγραφή ζώνης',
    deleteTable: 'Διαγραφή τραπεζιού',
    save: 'Αποθήκευση',
    label: 'Ονομασία',
    type: 'Τύπος',
    capacity: 'Χωρητικότητα',
    seats: 'Θέσεις',
    zones: 'Ζώνες',
    tables: 'Τραπέζια',
    noZones: 'Ανεβάστε μια κάτοψη για να ξεκινήσετε',
    clickToPlace: 'Κάντε κλικ στο σχεδιάγραμμα για τοποθέτηση',
    vip: 'VIP',
    table: 'Τραπέζι',
    bar: 'Bar',
    stage: 'Σκηνή',
    dj: 'DJ Booth',
    lounge: 'Lounge',
    other: 'Άλλο',
    uploadFirst: 'Ανεβάστε την κάτοψη του χώρου σας',
    uploadHint: 'Η AI θα αναγνωρίσει αυτόματα τις ζώνες και τα τραπέζια',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Διαγράφηκε',
    placingMode: 'Λειτουργία τοποθέτησης',
    cancel: 'Ακύρωση',
    people: 'άτομα',
    totalCapacity: 'Συνολική χωρητικότητα',
    width: 'Πλάτος',
    height: 'Ύψος',
    confirmDelete: 'Σίγουρα;',
    yes: 'Ναι',
    no: 'Όχι',
    aiSuccess: 'Η AI δημιούργησε το floor plan!',
    aiError: 'Σφάλμα AI ανάλυσης',
    sameImage: 'Η ίδια κάτοψη είναι ήδη φορτωμένη — κρατάω ακριβώς το ίδιο σχεδιάγραμμα.',
    addTable: 'Νέο τραπέζι',
    clickToPlaceTable: 'Κάντε κλικ σε ζώνη για τοποθέτηση τραπεζιού',
    round: 'Στρογγυλό',
    square: 'Τετράγωνο',
    rectangle: 'Ορθογώνιο',
    shape: 'Σχήμα',
  },
  en: {
    title: 'Floor plan',
    subtitle: 'Upload your layout and AI will create the interactive floor plan',
    uploadImage: 'Upload layout',
    analyzeWithAI: 'Analyze with AI',
    analyzing: 'AI analyzing...',
    reAnalyze: 'Re-analyze AI',
    addZone: 'New zone',
    editZone: 'Edit zone',
    editTable: 'Edit table',
    deleteZone: 'Delete zone',
    deleteTable: 'Delete table',
    save: 'Save',
    label: 'Name',
    type: 'Type',
    capacity: 'Capacity',
    seats: 'Seats',
    zones: 'Zones',
    tables: 'Tables',
    noZones: 'Upload a layout to get started',
    clickToPlace: 'Click on the layout to place zone',
    vip: 'VIP',
    table: 'Table',
    bar: 'Bar',
    stage: 'Stage',
    dj: 'DJ Booth',
    lounge: 'Lounge',
    other: 'Other',
    uploadFirst: 'Upload your venue layout',
    uploadHint: 'AI will automatically detect zones and tables',
    saved: 'Saved',
    deleted: 'Deleted',
    placingMode: 'Placing mode',
    cancel: 'Cancel',
    people: 'people',
    totalCapacity: 'Total capacity',
    width: 'Width',
    height: 'Height',
    confirmDelete: 'Are you sure?',
    yes: 'Yes',
    no: 'No',
    aiSuccess: 'AI generated the floor plan!',
    aiError: 'AI analysis error',
    sameImage: 'This exact layout is already loaded — keeping the same floor plan.',
    addTable: 'New table',
    clickToPlaceTable: 'Click inside a zone to place table',
    round: 'Round',
    square: 'Square',
    rectangle: 'Rectangle',
    shape: 'Shape',
  },
};

export function FloorPlanEditor({ businessId }: FloorPlanEditorProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [tables, setTables] = useState<FloorPlanTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editZoneDialog, setEditZoneDialog] = useState<FloorPlanZone | null>(null);
  const [editTableDialog, setEditTableDialog] = useState<FloorPlanTable | null>(null);
  const [placingMode, setPlacingMode] = useState<'zone' | 'table' | null>(null);
  const [newZoneType, setNewZoneType] = useState('table');
  const [dragging, setDragging] = useState<{ id: string; type: 'zone' | 'table'; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState<string | null>(null);
  const [canvasAspect, setCanvasAspect] = useState<number>(DEFAULT_CANVAS_ASPECT);

  useEffect(() => { loadFloorPlan(); }, [businessId]);

  const loadFloorPlan = async () => {
    setLoading(true);

    const [zonesResult, tablesResult, businessResult] = await Promise.all([
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('floor_plan_tables').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('businesses').select('floor_plan_image_url').eq('id', businessId).single(),
    ]);

    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    const loadedTables = (tablesResult.data || []) as FloorPlanTable[];

    setZones(loadedZones);
    setTables(loadedTables);
    setHasFloorPlan(loadedZones.length > 0);

    const imageUrl = businessResult.data?.floor_plan_image_url || null;
    setFloorPlanImageUrl(imageUrl);

    const metadataWithDimensions = loadedZones.find((zone) => zone.metadata?.image_width && zone.metadata?.image_height)?.metadata;
    if (metadataWithDimensions?.image_width && metadataWithDimensions?.image_height) {
      const ratio = metadataWithDimensions.image_width / metadataWithDimensions.image_height;
      setCanvasAspect(Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_CANVAS_ASPECT);
    } else {
      setCanvasAspect(DEFAULT_CANVAS_ASPECT);
    }

    setLoading(false);
  };

  // AI Analysis
  const handleAIAnalysis = async (file: File) => {
    setAiAnalyzing(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('analyze-floor-plan', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Clear existing zones and tables
      await Promise.all([
        supabase.from('floor_plan_tables').delete().eq('business_id', businessId),
        supabase.from('floor_plan_zones').delete().eq('business_id', businessId),
      ]);

      // Insert zones from AI
      const aiZones = data.zones || [];
      const insertedZones: FloorPlanZone[] = [];

      for (let i = 0; i < aiZones.length; i++) {
        const az = aiZones[i];
        const { data: zoneData, error: zoneError } = await supabase.from('floor_plan_zones').insert({
          business_id: businessId,
          label: az.label,
          zone_type: az.zone_type || 'other',
          shape: 'rect',
          x_percent: az.x_percent,
          y_percent: az.y_percent,
          width_percent: az.width_percent,
          height_percent: az.height_percent,
          capacity: az.capacity || 0,
          sort_order: i,
        }).select().single();

        if (zoneError) { console.error('Zone insert error:', zoneError); continue; }
        insertedZones.push(zoneData as FloorPlanZone);

        // Insert tables for this zone
        if (az.tables && az.tables.length > 0) {
          const tablesToInsert = az.tables.map((at: any, ti: number) => ({
            zone_id: zoneData!.id,
            business_id: businessId,
            label: at.label || `T${ti + 1}`,
            x_percent: at.x_percent,
            y_percent: at.y_percent,
            seats: at.seats || 4,
            shape: at.shape || 'round',
            sort_order: ti,
          }));
          await supabase.from('floor_plan_tables').insert(tablesToInsert);
        }
      }

      // Reload data
      await loadFloorPlan();
      toast.success(t.aiSuccess);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      toast.error(t.aiError + ': ' + (err.message || 'Unknown error'));
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleAIAnalysis(file);
    // Reset the input
    e.target.value = '';
  };

  // Zone CRUD
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (placingMode === 'zone') {
      const typeLabel = t[newZoneType as keyof typeof t] || newZoneType;
      saveZone({
        label: `${typeLabel} ${zones.length + 1}`,
        zone_type: newZoneType,
        shape: 'rect',
        x_percent: Math.max(0, Math.min(85, x - 7.5)),
        y_percent: Math.max(0, Math.min(85, y - 7.5)),
        width_percent: 15,
        height_percent: 15,
        capacity: newZoneType === 'vip' ? 10 : newZoneType === 'bar' ? 15 : 4,
        sort_order: zones.length,
      });
      setPlacingMode(null);
    } else if (placingMode === 'table') {
      // Find which zone contains this click
      const zone = zones.find(z =>
        x >= z.x_percent && x <= z.x_percent + z.width_percent &&
        y >= z.y_percent && y <= z.y_percent + z.height_percent
      );
      if (zone) {
        const zoneTables = tables.filter(tb => tb.zone_id === zone.id);
        saveTable({
          zone_id: zone.id,
          business_id: businessId,
          label: `T${zoneTables.length + 1}`,
          x_percent: x,
          y_percent: y,
          seats: 4,
          shape: 'round',
          sort_order: zoneTables.length,
        });
        setPlacingMode(null);
      }
    }
  }, [placingMode, newZoneType, zones, tables]);

  const saveZone = async (zone: Partial<FloorPlanZone>) => {
    const { data, error } = await supabase.from('floor_plan_zones').insert({
      business_id: businessId,
      label: zone.label!,
      zone_type: zone.zone_type!,
      shape: zone.shape!,
      x_percent: zone.x_percent!,
      y_percent: zone.y_percent!,
      width_percent: zone.width_percent!,
      height_percent: zone.height_percent!,
      capacity: zone.capacity || 0,
      sort_order: zone.sort_order || 0,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setZones(prev => [...prev, data as FloorPlanZone]);
    setHasFloorPlan(true);
    toast.success(t.saved);
  };

  const saveTable = async (table: Partial<FloorPlanTable>) => {
    const { data, error } = await supabase.from('floor_plan_tables').insert({
      zone_id: table.zone_id!,
      business_id: businessId,
      label: table.label!,
      x_percent: table.x_percent!,
      y_percent: table.y_percent!,
      seats: table.seats || 4,
      shape: table.shape || 'round',
      sort_order: table.sort_order || 0,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setTables(prev => [...prev, data as FloorPlanTable]);
    toast.success(t.saved);
  };

  const updateZone = async (zone: FloorPlanZone) => {
    const { error } = await supabase.from('floor_plan_zones')
      .update({ label: zone.label, zone_type: zone.zone_type, x_percent: zone.x_percent, y_percent: zone.y_percent, width_percent: zone.width_percent, height_percent: zone.height_percent, capacity: zone.capacity })
      .eq('id', zone.id);
    if (error) { toast.error(error.message); return; }
    setZones(prev => prev.map(z => z.id === zone.id ? zone : z));
  };

  const updateTable = async (table: FloorPlanTable) => {
    const { error } = await supabase.from('floor_plan_tables')
      .update({ label: table.label, x_percent: table.x_percent, y_percent: table.y_percent, seats: table.seats, shape: table.shape })
      .eq('id', table.id);
    if (error) { toast.error(error.message); return; }
    setTables(prev => prev.map(tb => tb.id === table.id ? table : tb));
  };

  const deleteZone = async (zoneId: string) => {
    const { error } = await supabase.from('floor_plan_zones').delete().eq('id', zoneId);
    if (error) { toast.error(error.message); return; }
    setZones(prev => prev.filter(z => z.id !== zoneId));
    setTables(prev => prev.filter(tb => tb.zone_id !== zoneId));
    setSelectedZone(null);
    setEditZoneDialog(null);
    setDeleteConfirm(false);
    toast.success(t.deleted);
  };

  const deleteTable = async (tableId: string) => {
    const { error } = await supabase.from('floor_plan_tables').delete().eq('id', tableId);
    if (error) { toast.error(error.message); return; }
    setTables(prev => prev.filter(tb => tb.id !== tableId));
    setSelectedTable(null);
    setEditTableDialog(null);
    setDeleteConfirm(false);
    toast.success(t.deleted);
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'zone' | 'table') => {
    if (placingMode) return;
    e.stopPropagation();
    const item = type === 'zone' ? zones.find(z => z.id === id) : tables.find(tb => tb.id === id);
    if (!item) return;
    setDragging({ id, type, startX: e.clientX, startY: e.clientY, origX: item.x_percent, origY: item.y_percent });
    if (type === 'zone') { setSelectedZone(id); setSelectedTable(null); }
    else { setSelectedTable(id); setSelectedZone(null); }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.startY) / rect.height) * 100;

    if (dragging.type === 'zone') {
      const zone = zones.find(z => z.id === dragging.id);
      if (!zone) return;
      const newX = Math.max(0, Math.min(100 - zone.width_percent, dragging.origX + dx));
      const newY = Math.max(0, Math.min(100 - zone.height_percent, dragging.origY + dy));
      setZones(prev => prev.map(z => z.id === dragging.id ? { ...z, x_percent: newX, y_percent: newY } : z));
    } else {
      const newX = Math.max(0, Math.min(100, dragging.origX + dx));
      const newY = Math.max(0, Math.min(100, dragging.origY + dy));
      setTables(prev => prev.map(tb => tb.id === dragging.id ? { ...tb, x_percent: newX, y_percent: newY } : tb));
    }
  }, [dragging, zones]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      if (dragging.type === 'zone') {
        const zone = zones.find(z => z.id === dragging.id);
        if (zone) updateZone(zone);
      } else {
        const table = tables.find(tb => tb.id === dragging.id);
        if (table) updateTable(table);
      }
      setDragging(null);
    }
  }, [dragging, zones, tables]);

  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const totalTables = tables.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            {t.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 ml-10">{t.subtitle}</p>
        </div>
      </div>

      {!hasFloorPlan && !aiAnalyzing ? (
        /* Empty state */
        <div
          className="relative border-2 border-dashed border-border/60 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 hover:border-primary/40 hover:from-primary/5 hover:to-primary/[0.02] transition-all duration-300 cursor-pointer group"
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
            <Button variant="outline" size="sm" className="group-hover:border-primary/40 group-hover:text-primary transition-colors">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t.uploadImage}
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      ) : aiAnalyzing ? (
        /* AI analyzing state */
        <div className="border-2 border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/[0.02] animate-pulse">
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t.analyzing}</p>
              <p className="text-xs text-muted-foreground">Gemini Vision</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/40 rounded-xl px-3 py-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {placingMode ? (
                <>
                  <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2.5 py-1.5">
                    <MousePointer className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="text-xs font-medium text-primary">
                      {placingMode === 'zone' ? t.clickToPlace : t.clickToPlaceTable}
                    </span>
                  </div>
                  {placingMode === 'zone' && (
                    <Select value={newZoneType} onValueChange={setNewZoneType}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ZONE_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-1.5">
                              <span>{val.icon}</span>
                              <span>{t[key as keyof typeof t] as string}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPlacingMode(null)}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    {t.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="default" size="sm" className="h-8 text-xs shadow-sm" onClick={() => setPlacingMode('zone')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t.addZone}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPlacingMode('table')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t.addTable}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLabels(!showLabels)}>
                    {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{zones.length}</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">🪑 {totalTables}</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{totalCapacity}</span>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={aiAnalyzing}>
                <Wand2 className="h-3.5 w-3.5 mr-1" />
                {t.reAnalyze}
              </Button>
            </div>
          </div>

          {/* Canvas + Side panel */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
            {/* SVG Canvas - no background image */}
            <div className="relative rounded-xl overflow-hidden border border-border/30 bg-[#0a1628] shadow-2xl">
              <div
                ref={canvasRef}
                className={`relative select-none aspect-[4/3] ${placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(62,195,183,0.06) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }} />

                {/* SVG floor plan */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    {zones.map((zone) => {
                      const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                      const isSelected = selectedZone === zone.id;
                      return (
                        <linearGradient key={`grad-${zone.id}`} id={`zone-grad-${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={zt.color} stopOpacity={isSelected ? 0.3 : 0.12} />
                          <stop offset="100%" stopColor={zt.color} stopOpacity={isSelected ? 0.1 : 0.04} />
                        </linearGradient>
                      );
                    })}
                  </defs>

                  {/* Zones */}
                  {zones.map((zone) => {
                    const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                    const isSelected = selectedZone === zone.id;
                    return (
                      <g key={zone.id}>
                        <rect
                          x={zone.x_percent}
                          y={zone.y_percent}
                          width={zone.width_percent}
                          height={zone.height_percent}
                          rx={0.8}
                          fill={`url(#zone-grad-${zone.id})`}
                          stroke={zt.color}
                          strokeWidth={isSelected ? 0.4 : 0.2}
                          strokeDasharray={isSelected ? undefined : "1 0.5"}
                          opacity={isSelected ? 1 : 0.9}
                          className="transition-all duration-200"
                          style={{ filter: isSelected ? `drop-shadow(0 0 6px ${zt.color}50)` : undefined }}
                        />
                        {/* Zone label at top */}
                        {showLabels && (
                          <>
                            <rect
                              x={zone.x_percent + 0.5}
                              y={zone.y_percent + 0.5}
                              width={Math.max(zone.label.length * 0.7 + 1.5, 5)}
                              height={2.2}
                              rx={0.4}
                              fill={zt.color}
                              opacity={0.85}
                              className="pointer-events-none"
                            />
                            <text
                              x={zone.x_percent + 1.2}
                              y={zone.y_percent + 1.8}
                              fill="white"
                              fontSize="1.1"
                              fontWeight="700"
                              letterSpacing="0.04"
                              className="pointer-events-none"
                              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                            >
                              {zone.label}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* Tables */}
                  {tables.map((table) => {
                    const zone = zones.find(z => z.id === table.zone_id);
                    const zt = zone ? (ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other) : ZONE_TYPES.other;
                    const isSelected = selectedTable === table.id;
                    const r = TABLE_RADIUS;

                    return (
                      <g key={table.id}>
                        {table.shape === 'round' ? (
                          <circle
                            cx={table.x_percent}
                            cy={table.y_percent}
                            r={r}
                            fill={isSelected ? `${zt.color}40` : `${zt.color}20`}
                            stroke={zt.color}
                            strokeWidth={isSelected ? 0.35 : 0.2}
                            className="transition-all duration-200"
                            style={{ filter: isSelected ? `drop-shadow(0 0 4px ${zt.color}60)` : undefined }}
                          />
                        ) : (
                          <rect
                            x={table.x_percent - r}
                            y={table.y_percent - r}
                            width={r * 2}
                            height={table.shape === 'rectangle' ? r * 1.4 : r * 2}
                            rx={0.3}
                            fill={isSelected ? `${zt.color}40` : `${zt.color}20`}
                            stroke={zt.color}
                            strokeWidth={isSelected ? 0.35 : 0.2}
                            className="transition-all duration-200"
                            style={{ filter: isSelected ? `drop-shadow(0 0 4px ${zt.color}60)` : undefined }}
                          />
                        )}
                        {/* Table label */}
                        {showLabels && (
                          <text
                            x={table.x_percent}
                            y={table.y_percent - 0.1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="1"
                            fontWeight="600"
                            className="pointer-events-none"
                            style={{ fontFamily: 'system-ui' }}
                          >
                            {table.label}
                          </text>
                        )}
                        {/* Seat count */}
                        {showLabels && (
                          <text
                            x={table.x_percent}
                            y={table.y_percent + 1.1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={zt.color}
                            fontSize="0.75"
                            fontWeight="500"
                            className="pointer-events-none"
                            opacity={0.8}
                          >
                            {table.seats}
                          </text>
                        )}
                        {/* Seat dots around the table */}
                        {Array.from({ length: Math.min(table.seats, 8) }).map((_, si) => {
                          const angle = (si / Math.min(table.seats, 8)) * Math.PI * 2 - Math.PI / 2;
                          const seatR = r + 0.7;
                          const sx = table.x_percent + Math.cos(angle) * seatR;
                          const sy = table.y_percent + Math.sin(angle) * seatR;
                          return (
                            <circle
                              key={si}
                              cx={sx}
                              cy={sy}
                              r={0.35}
                              fill={zt.color}
                              opacity={0.5}
                              className="pointer-events-none"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* Interactive hit areas for zones */}
                {zones.map((zone) => {
                  const isSelected = selectedZone === zone.id;
                  return (
                    <div
                      key={`hit-zone-${zone.id}`}
                      className={`absolute rounded-md transition-all duration-200 ${
                        placingMode === 'table'
                          ? 'cursor-crosshair hover:bg-white/5'
                          : placingMode
                            ? 'pointer-events-none'
                            : `cursor-grab active:cursor-grabbing ${isSelected ? 'ring-1 ring-primary/40' : 'hover:ring-1 hover:ring-white/15'}`
                      }`}
                      style={{
                        left: `${zone.x_percent}%`,
                        top: `${zone.y_percent}%`,
                        width: `${zone.width_percent}%`,
                        height: `${zone.height_percent}%`,
                      }}
                      onMouseDown={(e) => { if (!placingMode) handleMouseDown(e, zone.id, 'zone'); }}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditZoneDialog(zone); }}
                      onClick={(e) => {
                        if (placingMode !== 'table') {
                          e.stopPropagation();
                          setSelectedZone(zone.id === selectedZone ? null : zone.id);
                          setSelectedTable(null);
                        }
                      }}
                    />
                  );
                })}

                {/* Interactive hit areas for tables */}
                {tables.map((table) => (
                  <div
                    key={`hit-table-${table.id}`}
                    className={`absolute rounded-full transition-all duration-200 z-10 ${
                      placingMode
                        ? 'pointer-events-none'
                        : `cursor-grab active:cursor-grabbing ${selectedTable === table.id ? 'ring-1 ring-primary/60' : 'hover:ring-1 hover:ring-white/25'}`
                    }`}
                    style={{
                      left: `${table.x_percent - TABLE_RADIUS}%`,
                      top: `${table.y_percent - TABLE_RADIUS}%`,
                      width: `${TABLE_RADIUS * 2}%`,
                      height: `${TABLE_RADIUS * 2}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, table.id, 'table')}
                    onDoubleClick={(e) => { e.stopPropagation(); setEditTableDialog(table); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTable(table.id === selectedTable ? null : table.id);
                      setSelectedZone(null);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-3">
              <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-xl overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border/30">
                  <h3 className="text-xs font-semibold text-foreground">{t.zones} ({zones.length})</h3>
                </div>
                {zones.length === 0 ? (
                  <div className="py-8 text-center">
                    <MapPin className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{t.noZones}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20 max-h-[55vh] overflow-y-auto">
                    {zones.map((zone) => {
                      const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                      const isSelected = selectedZone === zone.id;
                      const zoneTables = tables.filter(tb => tb.zone_id === zone.id);
                      return (
                        <div key={zone.id}>
                          <div
                            className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-150 hover:bg-accent/40 ${isSelected ? 'bg-accent/60' : ''}`}
                            onClick={() => { setSelectedZone(zone.id === selectedZone ? null : zone.id); setSelectedTable(null); }}
                          >
                            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: zt.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{zone.label}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>{zt.icon}</span>
                                <span>{t[zone.zone_type as keyof typeof t] as string || zone.zone_type}</span>
                                <span className="text-border">·</span>
                                <span>{zoneTables.length} {t.tables}</span>
                                <span className="text-border">·</span>
                                <span>{zone.capacity} {t.people}</span>
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 opacity-50 hover:opacity-100"
                              onClick={(e) => { e.stopPropagation(); setEditZoneDialog(zone); }}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                          {/* Tables inside zone */}
                          {isSelected && zoneTables.length > 0 && (
                            <div className="pl-7 pr-3 pb-2 space-y-0.5">
                              {zoneTables.map((tb) => (
                                <div
                                  key={tb.id}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] cursor-pointer transition-colors ${selectedTable === tb.id ? 'bg-primary/10' : 'hover:bg-accent/30'}`}
                                  onClick={(e) => { e.stopPropagation(); setSelectedTable(tb.id); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); setEditTableDialog(tb); }}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zt.color, opacity: 0.6 }} />
                                  <span className="text-foreground font-medium">{tb.label}</span>
                                  <span className="text-muted-foreground">{tb.seats} {t.seats}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Legend */}
              {zones.length > 0 && (
                <div className="bg-card/60 backdrop-blur-md border border-border/30 rounded-xl px-3 py-2.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(ZONE_TYPES)
                      .filter(([key]) => zones.some(z => z.zone_type === key))
                      .map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: val.color }} />
                          <span>{t[key as keyof typeof t] as string}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Zone Dialog */}
      {editZoneDialog && (
        <Dialog open={!!editZoneDialog} onOpenChange={() => { setEditZoneDialog(null); setDeleteConfirm(false); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="h-6 w-6 rounded-md flex items-center justify-center text-xs"
                  style={{ backgroundColor: `${(ZONE_TYPES[editZoneDialog.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other).color}20` }}>
                  {(ZONE_TYPES[editZoneDialog.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other).icon}
                </div>
                {t.editZone}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs text-muted-foreground">{t.label}</Label>
                <Input value={editZoneDialog.label} onChange={(e) => setEditZoneDialog({ ...editZoneDialog, label: e.target.value })} className="h-9 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t.type}</Label>
                  <Select value={editZoneDialog.zone_type} onValueChange={(v) => setEditZoneDialog({ ...editZoneDialog, zone_type: v })}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ZONE_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-1.5"><span>{val.icon}</span><span>{t[key as keyof typeof t] as string}</span></span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.capacity}</Label>
                  <Input type="number" min={0} value={editZoneDialog.capacity} onChange={(e) => setEditZoneDialog({ ...editZoneDialog, capacity: parseInt(e.target.value) || 0 })} className="h-9 mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t.width} (%)</Label>
                  <Input type="number" min={2} max={60} step={0.5} value={editZoneDialog.width_percent} onChange={(e) => setEditZoneDialog({ ...editZoneDialog, width_percent: parseFloat(e.target.value) || 6 })} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.height} (%)</Label>
                  <Input type="number" min={2} max={60} step={0.5} value={editZoneDialog.height_percent} onChange={(e) => setEditZoneDialog({ ...editZoneDialog, height_percent: parseFloat(e.target.value) || 5 })} className="h-9 mt-1" />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              {deleteConfirm ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-destructive flex-1">{t.confirmDelete}</span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDeleteConfirm(false)}>{t.no}</Button>
                  <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => deleteZone(editZoneDialog.id)}>{t.yes}</Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive border-destructive/20" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-3 w-3 mr-1" />{t.deleteZone}
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={() => { updateZone(editZoneDialog); setEditZoneDialog(null); toast.success(t.saved); }}>
                    <Save className="h-3 w-3 mr-1" />{t.save}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Table Dialog */}
      {editTableDialog && (
        <Dialog open={!!editTableDialog} onOpenChange={() => { setEditTableDialog(null); setDeleteConfirm(false); }}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-base">{t.editTable}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs text-muted-foreground">{t.label}</Label>
                <Input value={editTableDialog.label} onChange={(e) => setEditTableDialog({ ...editTableDialog, label: e.target.value })} className="h-9 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t.seats}</Label>
                  <Input type="number" min={1} max={20} value={editTableDialog.seats} onChange={(e) => setEditTableDialog({ ...editTableDialog, seats: parseInt(e.target.value) || 1 })} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.shape}</Label>
                  <Select value={editTableDialog.shape} onValueChange={(v) => setEditTableDialog({ ...editTableDialog, shape: v })}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round">{t.round}</SelectItem>
                      <SelectItem value="square">{t.square}</SelectItem>
                      <SelectItem value="rectangle">{t.rectangle}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              {deleteConfirm ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-destructive flex-1">{t.confirmDelete}</span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDeleteConfirm(false)}>{t.no}</Button>
                  <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => deleteTable(editTableDialog.id)}>{t.yes}</Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive border-destructive/20" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-3 w-3 mr-1" />{t.deleteTable}
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={() => { updateTable(editTableDialog); setEditTableDialog(null); toast.success(t.saved); }}>
                    <Save className="h-3 w-3 mr-1" />{t.save}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
