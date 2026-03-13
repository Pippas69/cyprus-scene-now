import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Save, MapPin, Move, MousePointer, GripVertical } from 'lucide-react';
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
}

interface FloorPlanEditorProps {
  businessId: string;
}

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  vip: { bg: 'rgba(234, 179, 8, 0.25)', border: '#eab308', text: '#eab308' },
  table: { bg: 'rgba(59, 130, 246, 0.25)', border: '#3b82f6', text: '#3b82f6' },
  bar: { bg: 'rgba(168, 85, 247, 0.25)', border: '#a855f7', text: '#a855f7' },
  stage: { bg: 'rgba(239, 68, 68, 0.25)', border: '#ef4444', text: '#ef4444' },
  dj: { bg: 'rgba(236, 72, 153, 0.25)', border: '#ec4899', text: '#ec4899' },
  other: { bg: 'rgba(107, 114, 128, 0.25)', border: '#6b7280', text: '#6b7280' },
};

const translations = {
  el: {
    title: 'Σχεδιάγραμμα χώρου',
    subtitle: 'Ανεβάστε την κάτοψη και ορίστε τις ζώνες του χώρου σας',
    uploadImage: 'Ανέβασμα κάτοψης',
    changeImage: 'Αλλαγή κάτοψης',
    addZone: 'Προσθήκη ζώνης',
    editZone: 'Επεξεργασία ζώνης',
    deleteZone: 'Διαγραφή',
    save: 'Αποθήκευση',
    label: 'Ετικέτα',
    type: 'Τύπος',
    capacity: 'Χωρητικότητα',
    zones: 'Ζώνες',
    noZones: 'Δεν υπάρχουν ζώνες. Κάντε κλικ στην εικόνα για να προσθέσετε.',
    clickToPlace: 'Κάντε κλικ στην κάτοψη για να τοποθετήσετε τη ζώνη',
    vip: 'VIP',
    table: 'Τραπέζι',
    bar: 'Bar',
    stage: 'Σκηνή',
    dj: 'DJ',
    other: 'Άλλο',
    dragToResize: 'Σύρετε τις γωνίες για αλλαγή μεγέθους',
    uploadFirst: 'Ανεβάστε πρώτα μια κάτοψη',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Διαγράφηκε',
    placingMode: 'Λειτουργία τοποθέτησης',
    cancel: 'Ακύρωση',
  },
  en: {
    title: 'Floor plan',
    subtitle: 'Upload your venue layout and define seating zones',
    uploadImage: 'Upload layout',
    changeImage: 'Change layout',
    addZone: 'Add zone',
    editZone: 'Edit zone',
    deleteZone: 'Delete',
    save: 'Save',
    label: 'Label',
    type: 'Type',
    capacity: 'Capacity',
    zones: 'Zones',
    noZones: 'No zones yet. Click on the image to add one.',
    clickToPlace: 'Click on the layout to place the zone',
    vip: 'VIP',
    table: 'Table',
    bar: 'Bar',
    stage: 'Stage',
    dj: 'DJ',
    other: 'Other',
    dragToResize: 'Drag corners to resize',
    uploadFirst: 'Upload a layout first',
    saved: 'Saved',
    deleted: 'Deleted',
    placingMode: 'Placing mode',
    cancel: 'Cancel',
  },
};

export function FloorPlanEditor({ businessId }: FloorPlanEditorProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const imageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<FloorPlanZone | null>(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [newZoneType, setNewZoneType] = useState('table');
  const [dragging, setDragging] = useState<{ zoneId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Load floor plan data
  useEffect(() => {
    loadFloorPlan();
  }, [businessId]);

  const loadFloorPlan = async () => {
    setLoading(true);
    const [businessResult, zonesResult] = await Promise.all([
      supabase.from('businesses').select('floor_plan_image_url').eq('id', businessId).single(),
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order'),
    ]);
    setImageUrl(businessResult.data?.floor_plan_image_url || null);
    setZones((zonesResult.data || []) as FloorPlanZone[]);
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${businessId}/layout.${ext}`;
      
      // Delete old file if exists
      await supabase.storage.from('floor-plans').remove([path]);
      
      const { error } = await supabase.storage.from('floor-plans').upload(path, file, { upsert: true });
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from('floor-plans').getPublicUrl(path);
      const url = `${urlData.publicUrl}?v=${Date.now()}`;
      
      await supabase.from('businesses').update({ floor_plan_image_url: url }).eq('id', businessId);
      setImageUrl(url);
      toast.success(t.saved);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newZone: Partial<FloorPlanZone> = {
      label: `${t[newZoneType as keyof typeof t] || newZoneType} ${zones.length + 1}`,
      zone_type: newZoneType,
      shape: 'rect',
      x_percent: Math.max(0, Math.min(95, x - 3)),
      y_percent: Math.max(0, Math.min(95, y - 2.5)),
      width_percent: 6,
      height_percent: 5,
      capacity: 4,
      sort_order: zones.length,
    };

    saveZone(newZone);
    setPlacingMode(false);
  }, [placingMode, newZoneType, zones.length]);

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

    if (error) {
      toast.error(error.message);
      return;
    }
    setZones(prev => [...prev, data as FloorPlanZone]);
    toast.success(t.saved);
  };

  const updateZone = async (zone: FloorPlanZone) => {
    const { error } = await supabase.from('floor_plan_zones')
      .update({
        label: zone.label,
        zone_type: zone.zone_type,
        x_percent: zone.x_percent,
        y_percent: zone.y_percent,
        width_percent: zone.width_percent,
        height_percent: zone.height_percent,
        capacity: zone.capacity,
      })
      .eq('id', zone.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    setZones(prev => prev.map(z => z.id === zone.id ? zone : z));
    toast.success(t.saved);
  };

  const deleteZone = async (zoneId: string) => {
    const { error } = await supabase.from('floor_plan_zones').delete().eq('id', zoneId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setZones(prev => prev.filter(z => z.id !== zoneId));
    setSelectedZone(null);
    setEditDialog(null);
    toast.success(t.deleted);
  };

  // Drag zone
  const handleMouseDown = (e: React.MouseEvent, zoneId: string) => {
    if (placingMode) return;
    e.stopPropagation();
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    setDragging({ zoneId, startX: e.clientX, startY: e.clientY, origX: zone.x_percent, origY: zone.y_percent });
    setSelectedZone(zoneId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(94, dragging.origX + dx));
    const newY = Math.max(0, Math.min(94, dragging.origY + dy));
    setZones(prev => prev.map(z => z.id === dragging.zoneId ? { ...z, x_percent: newX, y_percent: newY } : z));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const zone = zones.find(z => z.id === dragging.zoneId);
      if (zone) updateZone(zone);
      setDragging(null);
    }
  }, [dragging, zones]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">{t.title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {imageUrl && (
            <div className="flex items-center gap-2">
              {placingMode ? (
                <>
                  <Select value={newZoneType} onValueChange={setNewZoneType}>
                    <SelectTrigger className="h-9 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">{t.vip}</SelectItem>
                      <SelectItem value="table">{t.table}</SelectItem>
                      <SelectItem value="bar">{t.bar}</SelectItem>
                      <SelectItem value="stage">{t.stage}</SelectItem>
                      <SelectItem value="dj">{t.dj}</SelectItem>
                      <SelectItem value="other">{t.other}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setPlacingMode(false)}>
                    {t.cancel}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setPlacingMode(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t.addZone}
                </Button>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            variant={imageUrl ? "ghost" : "default"}
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            {imageUrl ? t.changeImage : t.uploadImage}
          </Button>
        </div>
      </div>

      {/* Placing mode indicator */}
      {placingMode && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 flex items-center gap-2">
          <MousePointer className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">{t.clickToPlace}</span>
        </div>
      )}

      {!imageUrl ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <MapPin className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">{t.uploadFirst}</p>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {t.uploadImage}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Floor Plan Canvas */}
          <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/30">
            <CardContent className="p-2 sm:p-3">
              <div
                ref={imageRef}
                className={`relative select-none rounded-lg overflow-hidden ${placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleImageClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  src={imageUrl}
                  alt="Floor plan"
                  className="w-full h-auto block"
                  draggable={false}
                />
                {/* SVG overlay for zones */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {zones.map((zone) => {
                    const colors = ZONE_COLORS[zone.zone_type] || ZONE_COLORS.other;
                    const isSelected = selectedZone === zone.id;
                    return (
                      <g key={zone.id}>
                        {zone.shape === 'circle' ? (
                          <ellipse
                            cx={zone.x_percent + zone.width_percent / 2}
                            cy={zone.y_percent + zone.height_percent / 2}
                            rx={zone.width_percent / 2}
                            ry={zone.height_percent / 2}
                            fill={colors.bg}
                            stroke={colors.border}
                            strokeWidth={isSelected ? 0.6 : 0.3}
                            className="transition-all duration-200"
                            style={{ filter: isSelected ? `drop-shadow(0 0 3px ${colors.border})` : undefined }}
                          />
                        ) : (
                          <rect
                            x={zone.x_percent}
                            y={zone.y_percent}
                            width={zone.width_percent}
                            height={zone.height_percent}
                            rx={0.4}
                            fill={colors.bg}
                            stroke={colors.border}
                            strokeWidth={isSelected ? 0.6 : 0.3}
                            className="transition-all duration-200"
                            style={{ filter: isSelected ? `drop-shadow(0 0 3px ${colors.border})` : undefined }}
                          />
                        )}
                        <text
                          x={zone.x_percent + zone.width_percent / 2}
                          y={zone.y_percent + zone.height_percent / 2 + 0.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={colors.text}
                          fontSize="1.8"
                          fontWeight="600"
                          className="pointer-events-none"
                        >
                          {zone.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {/* Draggable hit areas (HTML overlays for mouse events) */}
                {zones.map((zone) => (
                  <div
                    key={`hit-${zone.id}`}
                    className={`absolute cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/50 rounded transition-shadow ${selectedZone === zone.id ? 'ring-2 ring-primary' : ''}`}
                    style={{
                      left: `${zone.x_percent}%`,
                      top: `${zone.y_percent}%`,
                      width: `${zone.width_percent}%`,
                      height: `${zone.height_percent}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, zone.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditDialog(zone);
                    }}
                    onClick={(e) => {
                      if (!placingMode) {
                        e.stopPropagation();
                        setSelectedZone(zone.id === selectedZone ? null : zone.id);
                      }
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zones Panel */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/30">
            <CardContent className="p-3 space-y-2">
              <h3 className="text-sm font-semibold text-foreground mb-2">{t.zones} ({zones.length})</h3>
              {zones.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">{t.noZones}</p>
              ) : (
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {zones.map((zone) => {
                    const colors = ZONE_COLORS[zone.zone_type] || ZONE_COLORS.other;
                    return (
                      <div
                        key={zone.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${selectedZone === zone.id ? 'bg-accent border-primary/40' : 'border-border/30'}`}
                        onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                      >
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: colors.border }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{zone.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t[zone.zone_type as keyof typeof t] || zone.zone_type} · {zone.capacity} {language === 'el' ? 'άτομα' : 'pax'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditDialog(zone);
                          }}
                        >
                          <GripVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Zone Dialog */}
      {editDialog && (
        <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.editZone}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">{t.label}</Label>
                <Input
                  value={editDialog.label}
                  onChange={(e) => setEditDialog({ ...editDialog, label: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">{t.type}</Label>
                <Select value={editDialog.zone_type} onValueChange={(v) => setEditDialog({ ...editDialog, zone_type: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vip">{t.vip}</SelectItem>
                    <SelectItem value="table">{t.table}</SelectItem>
                    <SelectItem value="bar">{t.bar}</SelectItem>
                    <SelectItem value="stage">{t.stage}</SelectItem>
                    <SelectItem value="dj">{t.dj}</SelectItem>
                    <SelectItem value="other">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t.capacity}</Label>
                <Input
                  type="number"
                  min={0}
                  value={editDialog.capacity}
                  onChange={(e) => setEditDialog({ ...editDialog, capacity: parseInt(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteZone(editDialog.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {t.deleteZone}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  updateZone(editDialog);
                  setEditDialog(null);
                }}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
