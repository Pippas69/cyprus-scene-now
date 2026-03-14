import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Save, MapPin, MousePointer, Edit3, Users, X, Eye, EyeOff, Wand2, Loader2 } from 'lucide-react';
import { VenueSVGCanvas } from './VenueSVGCanvas';
import { useLanguage } from '@/hooks/useLanguage';

interface FloorPlanItem {
  id: string;
  zone_id: string | null;
  business_id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
  sort_order: number;
  fixture_type: string | null;
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
    fixture_bboxes?: Record<string, { w: number; h: number }>;
    table_bboxes?: Record<string, { w: number; h: number }>;
    [key: string]: unknown;
  } | null;
}

interface FloorPlanEditorProps {
  businessId: string;
}

interface AiFixture {
  label: string;
  fixture_type: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

interface AiTable {
  label: string;
  seats: number;
  shape: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

const DEFAULT_CANVAS_ASPECT = 4 / 3;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

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

const translations = {
  el: {
    title: 'Σχεδιάγραμμα χώρου',
    subtitle: 'Ανεβάστε την κάτοψη και η AI θα δημιουργήσει το interactive floor plan',
    uploadImage: 'Ανέβασμα κάτοψης',
    analyzing: 'Η AI αναλύει...',
    reAnalyze: 'Επανανάλυση AI',
    addTable: 'Νέο τραπέζι',
    editItem: 'Επεξεργασία',
    deleteItem: 'Διαγραφή',
    save: 'Αποθήκευση',
    label: 'Ονομασία',
    seats: 'Θέσεις',
    tables: 'Τραπέζια',
    fixtures: 'Fixtures',
    noItems: 'Ανεβάστε μια κάτοψη για να ξεκινήσετε',
    clickToPlace: 'Κάντε κλικ στο σχεδιάγραμμα για τοποθέτηση',
    uploadFirst: 'Ανεβάστε την κάτοψη του χώρου σας',
    uploadHint: 'Η AI θα αναγνωρίσει αυτόματα τα τραπέζια & fixtures',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Διαγράφηκε',
    cancel: 'Ακύρωση',
    totalCapacity: 'Συνολική χωρητικότητα',
    confirmDelete: 'Σίγουρα;',
    yes: 'Ναι',
    no: 'Όχι',
    aiSuccess: 'Η AI δημιούργησε το floor plan!',
    aiError: 'Σφάλμα AI ανάλυσης',
    sameImage: 'Η ίδια κάτοψη — κρατάω το υπάρχον σχεδιάγραμμα.',
    round: 'Στρογγυλό',
    square: 'Τετράγωνο',
    rectangle: 'Ορθογώνιο',
    shape: 'Σχήμα',
  },
  en: {
    title: 'Floor plan',
    subtitle: 'Upload your layout and AI will create the interactive floor plan',
    uploadImage: 'Upload layout',
    analyzing: 'AI analyzing...',
    reAnalyze: 'Re-analyze AI',
    addTable: 'New table',
    editItem: 'Edit',
    deleteItem: 'Delete',
    save: 'Save',
    label: 'Name',
    seats: 'Seats',
    tables: 'Tables',
    fixtures: 'Fixtures',
    noItems: 'Upload a layout to get started',
    clickToPlace: 'Click on the layout to place',
    uploadFirst: 'Upload your venue layout',
    uploadHint: 'AI will automatically detect tables & fixtures',
    saved: 'Saved',
    deleted: 'Deleted',
    cancel: 'Cancel',
    totalCapacity: 'Total capacity',
    confirmDelete: 'Are you sure?',
    yes: 'Yes',
    no: 'No',
    aiSuccess: 'AI generated the floor plan!',
    aiError: 'AI analysis error',
    sameImage: 'Same layout — keeping existing floor plan.',
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

  const [items, setItems] = useState<FloorPlanItem[]>([]);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<FloorPlanItem | null>(null);
  const [placingMode, setPlacingMode] = useState<'table' | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [canvasAspect, setCanvasAspect] = useState(DEFAULT_CANVAS_ASPECT);
  const [analysisHash, setAnalysisHash] = useState<string | null>(null);

  useEffect(() => { loadFloorPlan(); }, [businessId]);

  const loadFloorPlan = async () => {
    setLoading(true);
    const [itemsResult, zonesResult] = await Promise.all([
      supabase.from('floor_plan_tables').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order').limit(1),
    ]);

    const loadedItems = (itemsResult.data || []) as FloorPlanItem[];
    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    setItems(loadedItems);
    setZones(loadedZones);
    setHasFloorPlan(loadedItems.length > 0);

    const meta = loadedZones[0]?.metadata;
    if (meta?.image_width && meta?.image_height) {
      const ratio = (meta.image_width as number) / (meta.image_height as number);
      setCanvasAspect(Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_CANVAS_ASPECT);
    }
    if (meta?.analysis_hash) setAnalysisHash(meta.analysis_hash as string);

    setLoading(false);
  };

  // AI Analysis
  const handleAIAnalysis = async (file: File) => {
    setAiAnalyzing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const [{ width, height }, imageHash] = await Promise.all([
        getImageDimensions(file),
        hashDataUrl(base64),
      ]);

      if (analysisHash && analysisHash === imageHash) {
        toast.info(t.sameImage);
        setAiAnalyzing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-floor-plan', {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fixtures: AiFixture[] = data?.fixtures || [];
      const tables: AiTable[] = data?.tables || [];

      if (fixtures.length === 0 && tables.length === 0) {
        throw new Error('AI did not detect any objects');
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Clean existing data
      await Promise.all([
        supabase.from('floor_plan_tables').delete().eq('business_id', businessId),
        supabase.from('floor_plan_zones').delete().eq('business_id', businessId),
      ]);

      // Build bbox maps for rendering
      const fixtureBboxes: Record<string, { w: number; h: number }> = {};
      fixtures.forEach(f => { fixtureBboxes[f.label] = { w: f.width_percent, h: f.height_percent }; });
      const tableBboxes: Record<string, { w: number; h: number }> = {};
      tables.forEach(tb => { tableBboxes[tb.label] = { w: tb.width_percent, h: tb.height_percent }; });

      // Create metadata zone
      const { data: metaZone } = await supabase.from('floor_plan_zones').insert({
        business_id: businessId,
        label: '_metadata',
        zone_type: 'other',
        shape: 'rect',
        x_percent: 0, y_percent: 0,
        width_percent: 0, height_percent: 0,
        capacity: 0, sort_order: 0,
        metadata: {
          analysis_hash: imageHash,
          image_width: width,
          image_height: height,
          fixture_bboxes: fixtureBboxes,
          table_bboxes: tableBboxes,
        },
      }).select().single();

      // Insert fixtures
      const fixtureRows = fixtures.map((f, i) => ({
        business_id: businessId,
        zone_id: metaZone?.id || null,
        label: f.label,
        x_percent: f.x_percent,
        y_percent: f.y_percent,
        seats: 0,
        shape: 'rect',
        sort_order: i,
        fixture_type: f.fixture_type,
      }));

      // Insert tables
      const tableRows = tables.map((tb, i) => ({
        business_id: businessId,
        zone_id: metaZone?.id || null,
        label: tb.label,
        x_percent: tb.x_percent,
        y_percent: tb.y_percent,
        seats: tb.seats,
        shape: tb.shape,
        sort_order: fixtures.length + i,
        fixture_type: null,
      }));

      const allRows = [...fixtureRows, ...tableRows];
      if (allRows.length > 0) {
        const { error: insertError } = await supabase.from('floor_plan_tables').insert(allRows);
        if (insertError) console.error('Insert error:', insertError);
      }

      setCanvasAspect(width / height);
      setAnalysisHash(imageHash);
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
    e.target.value = '';
  };

  // CRUD
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !placingMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (placingMode === 'table') {
      saveItem({
        label: `T${items.filter(i => !i.fixture_type).length + 1}`,
        x_percent: x,
        y_percent: y,
        seats: 4,
        shape: 'square',
        fixture_type: null,
      });
      setPlacingMode(null);
    }
  }, [placingMode, items]);

  const saveItem = async (item: Partial<FloorPlanItem>) => {
    const { data, error } = await supabase.from('floor_plan_tables').insert({
      business_id: businessId,
      zone_id: zones[0]?.id || null,
      label: item.label!,
      x_percent: item.x_percent!,
      y_percent: item.y_percent!,
      seats: item.seats || 0,
      shape: item.shape || 'square',
      sort_order: items.length,
      fixture_type: item.fixture_type || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setItems(prev => [...prev, data as FloorPlanItem]);
    setHasFloorPlan(true);
    toast.success(t.saved);
  };

  const updateItem = async (item: FloorPlanItem) => {
    const { error } = await supabase.from('floor_plan_tables')
      .update({ label: item.label, x_percent: item.x_percent, y_percent: item.y_percent, seats: item.seats, shape: item.shape })
      .eq('id', item.id);
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.map(i => i.id === item.id ? item : i));
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from('floor_plan_tables').delete().eq('id', itemId);
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.filter(i => i.id !== itemId));
    setSelectedItem(null);
    setEditDialog(null);
    setDeleteConfirm(false);
    toast.success(t.deleted);
  };

  // Drag
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (placingMode) return;
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item) return;
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: item.x_percent, origY: item.y_percent });
    setSelectedItem(id);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
    const newX = clamp(dragging.origX + dx, 0, 100);
    const newY = clamp(dragging.origY + dy, 0, 100);
    setItems(prev => prev.map(i => i.id === dragging.id ? { ...i, x_percent: newX, y_percent: newY } : i));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const item = items.find(i => i.id === dragging.id);
      if (item) updateItem(item);
      setDragging(null);
    }
  }, [dragging, items]);

  const tableItems = items.filter(i => !i.fixture_type);
  const fixtureItems = items.filter(i => !!i.fixture_type);
  const totalCapacity = tableItems.reduce((sum, i) => sum + i.seats, 0);

  // Get bboxes from metadata
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
        <div className="border-2 border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/[0.02] animate-pulse">
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t.analyzing}</p>
              <p className="text-xs text-muted-foreground">AI Vision Analysis</p>
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
                    <span className="text-xs font-medium text-primary">{t.clickToPlace}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPlacingMode(null)}>
                    <X className="h-3.5 w-3.5 mr-1" />{t.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="default" size="sm" className="h-8 text-xs shadow-sm" onClick={() => setPlacingMode('table')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t.addTable}
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
                  <span className="text-muted-foreground">🪑 {tableItems.length}</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{totalCapacity}</span>
                </div>
                {fixtureItems.length > 0 && (
                  <>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">📍 {fixtureItems.length}</span>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={aiAnalyzing}>
                <Wand2 className="h-3.5 w-3.5 mr-1" />{t.reAnalyze}
              </Button>
            </div>
          </div>

          {/* Canvas + Side panel */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
            {/* SVG Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-border/30 bg-card shadow-2xl">
              <div
                ref={canvasRef}
                className={`relative select-none w-full ${placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ aspectRatio: `${canvasAspect}`, maxHeight: 'calc(100vh - 260px)' }}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Dark architectural background */}
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(160deg, hsl(var(--background)) 0%, hsl(var(--card)) 50%, hsl(var(--background)) 100%)',
                }} />

                {/* SVG Venue Renderer */}
                <VenueSVGCanvas
                  items={items}
                  fixtureBboxes={fixtureBboxes}
                  tableBboxes={tableBboxes}
                  selectedItemId={selectedItem}
                  showLabels={showLabels}
                  onTableClick={(id) => {
                    if (!placingMode) setSelectedItem(id === selectedItem ? null : id);
                  }}
                  onItemMouseDown={(e, id) => handleMouseDown(e, id)}
                  onItemDoubleClick={(id) => {
                    const item = items.find(i => i.id === id);
                    if (item) setEditDialog(item);
                  }}
                  interactive={!placingMode}
                />
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto">
              {/* Tables list */}
              <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-xl overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border/30">
                  <h3 className="text-xs font-semibold text-foreground">{t.tables} ({tableItems.length})</h3>
                </div>
                {tableItems.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-muted-foreground">{t.noItems}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20 max-h-[40vh] overflow-y-auto">
                    {tableItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-all duration-150 hover:bg-accent/40 ${selectedItem === item.id ? 'bg-accent/60' : ''}`}
                        onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
                      >
                        <div className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: '#00E5FF' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.seats} {t.seats}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setEditDialog(item); }}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixtures list */}
              {fixtureItems.length > 0 && (
                <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-xl overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border/30">
                    <h3 className="text-xs font-semibold text-foreground">{t.fixtures} ({fixtureItems.length})</h3>
                  </div>
                  <div className="divide-y divide-border/20 max-h-[20vh] overflow-y-auto">
                    {fixtureItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-all hover:bg-accent/40 ${selectedItem === item.id ? 'bg-accent/60' : ''}`}
                        onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
                      >
                        <div className="w-1.5 h-5 rounded-full flex-shrink-0 bg-primary/50" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{item.fixture_type}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setEditDialog(item); }}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      {editDialog && (
        <Dialog open={!!editDialog} onOpenChange={() => { setEditDialog(null); setDeleteConfirm(false); }}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-base">{t.editItem}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs text-muted-foreground">{t.label}</Label>
                <Input value={editDialog.label} onChange={(e) => setEditDialog({ ...editDialog, label: e.target.value })} className="h-9 mt-1" />
              </div>
              {!editDialog.fixture_type && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.seats}</Label>
                    <Input type="number" min={1} max={20} value={editDialog.seats} onChange={(e) => setEditDialog({ ...editDialog, seats: parseInt(e.target.value) || 1 })} className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.shape}</Label>
                    <Select value={editDialog.shape} onValueChange={(v) => setEditDialog({ ...editDialog, shape: v })}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round">{t.round}</SelectItem>
                        <SelectItem value="square">{t.square}</SelectItem>
                        <SelectItem value="rectangle">{t.rectangle}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              {deleteConfirm ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-destructive flex-1">{t.confirmDelete}</span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDeleteConfirm(false)}>{t.no}</Button>
                  <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => deleteItem(editDialog.id)}>{t.yes}</Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive border-destructive/20" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-3 w-3 mr-1" />{t.deleteItem}
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={() => { updateItem(editDialog); setEditDialog(null); toast.success(t.saved); }}>
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
