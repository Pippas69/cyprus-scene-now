import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Trash2, Save, MapPin, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

import { FloorPlanItem, FloorPlanZone, FloorPlanMetadata, TableReservationStatus } from './floorPlanTypes';
import { DEFAULT_CANVAS_ASPECT, DEFAULT_TABLE_SIZE } from './floorPlanTheme';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { FloorPlanToolbar } from './FloorPlanToolbar';
import { FloorPlanSidebar } from './FloorPlanSidebar';

interface FloorPlanEditorProps {
  businessId: string;
}

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 900 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read image'));
    };
    img.src = url;
  });

const translations = {
  el: {
    title: 'Σχεδιάγραμμα χώρου',
    subtitle: 'Αρχιτεκτονικό SVG floor plan με premium clickable τραπέζια',
    uploadBlueprint: 'Ανέβασμα blueprint',
    uploading: 'Ανέβασμα...',
    addTable: 'Νέο τραπέζι',
    editItem: 'Επεξεργασία',
    deleteItem: 'Διαγραφή',
    save: 'Αποθήκευση',
    label: 'Ονομασία',
    seats: 'Θέσεις',
    tableList: 'Λίστα τραπεζιών',
    noItems: 'Δεν υπάρχουν τραπέζια στη βάση',
    clickToPlace: 'Κάντε κλικ στο blueprint για τοποθέτηση',
    uploadFirst: 'Ανεβάστε πρώτα το blueprint του venue',
    uploadHint: 'Το background παραμένει στατικό και η χαρτογράφηση γίνεται χειροκίνητα',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Διαγράφηκε',
    cancel: 'Ακύρωση',
    confirmDelete: 'Σίγουρα;',
    yes: 'Ναι',
    no: 'Όχι',
    round: 'Στρογγυλό',
    square: 'Τετράγωνο',
    rectangle: 'Ορθογώνιο',
    shape: 'Σχήμα',
    available: 'Διαθέσιμο',
    reserved: 'Κρατημένο',
    occupied: 'Κατειλημμένο',
    setupMode: 'Setup mode',
    setupModeOn: 'Setup ενεργό',
    setupModeHint: 'Ενεργοποιήστε setup mode για drag/drop & resize',
    exitSetupMode: 'Έξοδος από setup mode',
    showLabels: 'Εμφάνιση labels',
    hideLabels: 'Απόκρυψη labels',
    dragHint: 'Κάντε drag ένα table id πάνω στο blueprint και κάντε resize το hitbox.',
    enableSetupHint: 'Ενεργοποιήστε setup mode για drag & drop mapping.',
    blueprintUploaded: 'Το blueprint ανέβηκε επιτυχώς',
    blueprintUploadError: 'Αποτυχία ανεβάσματος blueprint',
  },
  en: {
    title: 'Floor plan',
    subtitle: 'Architectural SVG floor plan with premium clickable tables',
    uploadBlueprint: 'Upload blueprint',
    uploading: 'Uploading...',
    addTable: 'New table',
    editItem: 'Edit',
    deleteItem: 'Delete',
    save: 'Save',
    label: 'Name',
    seats: 'Seats',
    tableList: 'Table list',
    noItems: 'No tables found in database',
    clickToPlace: 'Click on blueprint to place',
    uploadFirst: 'Upload your venue blueprint first',
    uploadHint: 'Background stays static and mapping is done manually',
    saved: 'Saved',
    deleted: 'Deleted',
    cancel: 'Cancel',
    confirmDelete: 'Are you sure?',
    yes: 'Yes',
    no: 'No',
    round: 'Round',
    square: 'Square',
    rectangle: 'Rectangle',
    shape: 'Shape',
    available: 'Available',
    reserved: 'Reserved',
    occupied: 'Occupied',
    setupMode: 'Setup mode',
    setupModeOn: 'Setup on',
    setupModeHint: 'Enable setup mode for drag/drop & resize',
    exitSetupMode: 'Exit setup mode',
    showLabels: 'Show labels',
    hideLabels: 'Hide labels',
    dragHint: 'Drag a table id onto blueprint and resize the hitbox.',
    enableSetupHint: 'Enable setup mode for drag & drop mapping.',
    blueprintUploaded: 'Blueprint uploaded successfully',
    blueprintUploadError: 'Blueprint upload failed',
  },
};

export function FloorPlanEditor({ businessId }: FloorPlanEditorProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<FloorPlanItem[]>([]);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<FloorPlanItem | null>(null);
  const [placingMode, setPlacingMode] = useState<'table' | null>(null);
  const [setupMode, setSetupMode] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [canvasAspect, setCanvasAspect] = useState(DEFAULT_CANVAS_ASPECT);
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(null);
  const [tableBboxes, setTableBboxes] = useState<Record<string, { w: number; h: number }>>({});
  const [fixtureBboxes, setFixtureBboxes] = useState<Record<string, { w: number; h: number }>>({});
  const [reservationStatuses, setReservationStatuses] = useState<Map<string, TableReservationStatus>>(new Map());

  useEffect(() => {
    loadFloorPlan();
  }, [businessId]);

  useEffect(() => {
    if (!items.length) return;
    loadReservationStatuses();
    const interval = setInterval(loadReservationStatuses, 5000);
    return () => clearInterval(interval);
  }, [items.length, businessId]);

  const getMetaZone = useCallback((loadedZones: FloorPlanZone[]) => {
    return loadedZones.find((z) => z.label === '_metadata') || loadedZones[0] || null;
  }, []);

  const loadFloorPlan = async () => {
    setLoading(true);

    const [itemsResult, zonesResult, businessResult] = await Promise.all([
      supabase.from('floor_plan_tables').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('businesses').select('floor_plan_image_url').eq('id', businessId).single(),
    ]);

    const loadedItems = (itemsResult.data || []) as FloorPlanItem[];
    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    const bpUrl = businessResult.data?.floor_plan_image_url || null;

    setItems(loadedItems);
    setZones(loadedZones);
    setBlueprintUrl(bpUrl);

    const metaZone = getMetaZone(loadedZones);
    const meta = (metaZone?.metadata || {}) as FloorPlanMetadata;

    if (meta.image_width && meta.image_height) {
      const ratio = meta.image_width / meta.image_height;
      if (Number.isFinite(ratio) && ratio > 0) setCanvasAspect(ratio);
    }

    setFixtureBboxes(meta.fixture_bboxes || {});

    const normalizedBboxes: Record<string, { w: number; h: number }> = {};
    const rawBboxes = meta.table_bboxes || {};
    for (const item of loadedItems.filter((i) => !i.fixture_type)) {
      const box = rawBboxes[item.id] || rawBboxes[item.label];
      if (box?.w && box?.h) {
        normalizedBboxes[item.id] = { w: box.w, h: box.h };
      }
    }
    setTableBboxes(normalizedBboxes);

    setLoading(false);
  };

  const ensureMetadataZone = async (): Promise<FloorPlanZone | null> => {
    const existing = getMetaZone(zones);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('floor_plan_zones')
      .insert({
        business_id: businessId,
        label: '_metadata',
        zone_type: 'other',
        shape: 'rect',
        x_percent: 0,
        y_percent: 0,
        width_percent: 0,
        height_percent: 0,
        capacity: 0,
        sort_order: 0,
        metadata: {
          table_bboxes: {},
          fixture_bboxes: {},
        },
      })
      .select()
      .single();

    if (error || !data) {
      toast.error(error?.message || 'Failed to create metadata zone');
      return null;
    }

    const zone = data as FloorPlanZone;
    setZones((prev) => [zone, ...prev]);
    return zone;
  };

  const saveZoneMetadata = async (patch: Partial<FloorPlanMetadata>) => {
    const zone = await ensureMetadataZone();
    if (!zone) return;

    const currentMeta = (zone.metadata || {}) as FloorPlanMetadata;
    const nextMeta: FloorPlanMetadata = {
      ...currentMeta,
      ...patch,
    };

    const { error } = await supabase
      .from('floor_plan_zones')
      .update({ metadata: nextMeta as any })
      .eq('id', zone.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setZones((prev) => prev.map((z) => (z.id === zone.id ? { ...z, metadata: nextMeta } : z)));
  };

  const loadReservationStatuses = async () => {
    const zoneIds = Array.from(new Set(items.map((i) => i.zone_id).filter(Boolean))) as string[];
    if (!zoneIds.length) return;

    const { data } = await supabase
      .from('reservation_zone_assignments')
      .select('zone_id, reservation_id, reservations(reservation_name, party_size, status, checked_in_at)')
      .in('zone_id', zoneIds);

    if (!data) return;

    const statusMap = new Map<string, TableReservationStatus>();

    for (const item of items.filter((i) => !i.fixture_type)) {
      const assignment = data.find((a: any) => a.zone_id === item.zone_id);
      if (assignment) {
        const res = (assignment as any).reservations;
        statusMap.set(item.id, {
          tableId: item.id,
          status: res?.checked_in_at ? 'occupied' : 'reserved',
          reservationName: res?.reservation_name || '',
          partySize: res?.party_size || 0,
          reservationId: (assignment as any).reservation_id,
        });
      } else {
        statusMap.set(item.id, { tableId: item.id, status: 'available' });
      }
    }

    setReservationStatuses(statusMap);
  };

  const uploadBlueprint = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `floor-plans/${businessId}/blueprint.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error('Blueprint upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage.from('floor-plans').getPublicUrl(path);
      const url = urlData?.publicUrl || null;

      if (url) {
        await supabase.from('businesses').update({ floor_plan_image_url: url }).eq('id', businessId);
        setBlueprintUrl(url);
      }

      return url;
    } catch (err) {
      console.error('Blueprint upload failed:', err);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const [{ width, height }, uploadedUrl] = await Promise.all([getImageDimensions(file), uploadBlueprint(file)]);
      if (!uploadedUrl) throw new Error(t.blueprintUploadError);

      const nextAspect = width / height;
      if (Number.isFinite(nextAspect) && nextAspect > 0) setCanvasAspect(nextAspect);

      await saveZoneMetadata({ image_width: width, image_height: height });
      toast.success(t.blueprintUploaded);
    } catch (err: any) {
      toast.error(err.message || t.blueprintUploadError);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveItem = async (item: Partial<FloorPlanItem>) => {
    const zone = await ensureMetadataZone();
    if (!zone) return;

    const { data, error } = await supabase
      .from('floor_plan_tables')
      .insert({
        business_id: businessId,
        zone_id: zone.id,
        label: item.label!,
        x_percent: item.x_percent!,
        y_percent: item.y_percent!,
        seats: item.seats || 0,
        shape: item.shape || 'square',
        sort_order: items.length,
        fixture_type: item.fixture_type || null,
      })
      .select()
      .single();

    if (error || !data) {
      toast.error(error?.message || 'Failed to save item');
      return;
    }

    setItems((prev) => [...prev, data as FloorPlanItem]);

    const nextBboxes = {
      ...tableBboxes,
      [data.id]: { w: DEFAULT_TABLE_SIZE.w, h: DEFAULT_TABLE_SIZE.h },
    };
    setTableBboxes(nextBboxes);
    await saveZoneMetadata({ table_bboxes: nextBboxes });

    toast.success(t.saved);
  };

  const updateItem = async (item: FloorPlanItem) => {
    const { error } = await supabase
      .from('floor_plan_tables')
      .update({
        label: item.label,
        x_percent: item.x_percent,
        y_percent: item.y_percent,
        seats: item.seats,
        shape: item.shape,
      })
      .eq('id', item.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from('floor_plan_tables').delete().eq('id', itemId);
    if (error) {
      toast.error(error.message);
      return;
    }

    const item = items.find((i) => i.id === itemId);

    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSelectedItem(null);
    setEditDialog(null);
    setDeleteConfirm(false);

    const nextBboxes = { ...tableBboxes };
    delete nextBboxes[itemId];
    if (item) delete nextBboxes[item.label];
    setTableBboxes(nextBboxes);
    await saveZoneMetadata({ table_bboxes: nextBboxes });

    toast.success(t.deleted);
  };

  const handleCanvasClick = useCallback((xPercent: number, yPercent: number) => {
    if (!placingMode) return;

    const existingNumbers = items
      .filter((i) => !i.fixture_type)
      .map((i) => Number.parseInt(i.label, 10))
      .filter((n) => Number.isFinite(n));

    const nextNumber = existingNumbers.length ? Math.max(...existingNumbers) + 1 : items.filter((i) => !i.fixture_type).length + 1;

    saveItem({
      label: String(nextNumber),
      x_percent: xPercent,
      y_percent: yPercent,
      seats: 4,
      shape: 'square',
      fixture_type: null,
    });

    setPlacingMode(null);
  }, [placingMode, items]);

  const handleItemDrag = useCallback((id: string, xPercent: number, yPercent: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, x_percent: xPercent, y_percent: yPercent } : i)));
  }, []);

  const handleItemDragEnd = useCallback((item: FloorPlanItem) => {
    updateItem(item);
  }, []);

  const handleTableDrop = useCallback(async (id: string, xPercent: number, yPercent: number) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.fixture_type) return;

    const updated = { ...item, x_percent: xPercent, y_percent: yPercent };
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));

    const { error } = await supabase
      .from('floor_plan_tables')
      .update({ x_percent: xPercent, y_percent: yPercent })
      .eq('id', id);

    if (error) {
      toast.error(error.message);
    }
  }, [items]);

  const handleTableResize = useCallback((id: string, w: number, h: number) => {
    setTableBboxes((prev) => ({ ...prev, [id]: { w, h } }));
  }, []);

  const handleTableResizeEnd = useCallback(async (id: string, w: number, h: number) => {
    const nextBboxes = { ...tableBboxes, [id]: { w, h } };
    setTableBboxes(nextBboxes);
    await saveZoneMetadata({ table_bboxes: nextBboxes });
  }, [tableBboxes, zones]);

  const tableItems = items.filter((i) => !i.fixture_type);
  const totalCapacity = tableItems.reduce((sum, i) => sum + i.seats, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      {!blueprintUrl ? (
        <div
          className="relative border-2 border-dashed border-border/60 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 hover:border-primary/40 hover:from-primary/5 hover:to-primary/[0.02] transition-all duration-300 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
              {uploading ? <Loader2 className="h-7 w-7 text-primary animate-spin" /> : <Upload className="h-7 w-7 text-primary/70" />}
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t.uploadFirst}</p>
              <p className="text-xs text-muted-foreground">{t.uploadHint}</p>
            </div>
            <Button variant="outline" size="sm" className="group-hover:border-primary/40 group-hover:text-primary transition-colors" disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {uploading ? t.uploading : t.uploadBlueprint}
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      ) : (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

          <FloorPlanToolbar
            placingMode={placingMode}
            setPlacingMode={setPlacingMode}
            setupMode={setupMode}
            setSetupMode={setSetupMode}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            hasBlueprint={!!blueprintUrl}
            tableCount={tableItems.length}
            totalCapacity={totalCapacity}
            uploading={uploading}
            onUploadClick={() => fileInputRef.current?.click()}
            t={t}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            <FloorPlanSidebar
              tableItems={tableItems}
              selectedItem={selectedItem}
              reservationStatuses={reservationStatuses}
              setupMode={setupMode}
              onItemSelect={setSelectedItem}
              onItemEdit={setEditDialog}
              t={t}
            />

            <FloorPlanCanvas
              items={items}
              canvasAspect={canvasAspect}
              fixtureBboxes={fixtureBboxes}
              tableBboxes={tableBboxes}
              selectedItem={selectedItem}
              showLabels={showLabels}
              setupMode={setupMode}
              placingMode={placingMode}
              blueprintUrl={blueprintUrl}
              reservationStatuses={reservationStatuses}
              onCanvasClick={handleCanvasClick}
              onTableDrop={handleTableDrop}
              onItemSelect={setSelectedItem}
              onItemDoubleClick={setEditDialog}
              onItemDragEnd={handleItemDragEnd}
              onItemDrag={handleItemDrag}
              onTableResize={handleTableResize}
              onTableResizeEnd={handleTableResizeEnd}
            />
          </div>
        </>
      )}

      {editDialog && (
        <Dialog
          open={!!editDialog}
          onOpenChange={() => {
            setEditDialog(null);
            setDeleteConfirm(false);
          }}
        >
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-base">{t.editItem}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs text-muted-foreground">{t.label}</Label>
                <Input
                  value={editDialog.label}
                  onChange={(e) => setEditDialog({ ...editDialog, label: e.target.value })}
                  className="h-9 mt-1"
                />
              </div>

              {!editDialog.fixture_type && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.seats}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={editDialog.seats}
                      onChange={(e) => setEditDialog({ ...editDialog, seats: parseInt(e.target.value) || 1 })}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.shape}</Label>
                    <Select value={editDialog.shape} onValueChange={(v) => setEditDialog({ ...editDialog, shape: v })}>
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue />
                      </SelectTrigger>
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
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDeleteConfirm(false)}>
                    {t.no}
                  </Button>
                  <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => deleteItem(editDialog.id)}>
                    {t.yes}
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive border-destructive/20"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t.deleteItem}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      updateItem(editDialog);
                      setEditDialog(null);
                      toast.success(t.saved);
                    }}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {t.save}
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
