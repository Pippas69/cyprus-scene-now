import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Save, MapPin, MousePointer, Edit3, Users, X, ImageOff, Eye, EyeOff, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
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

const ZONE_TYPES = {
  vip: { 
    color: '#F59E0B', 
    bgAlpha: 0.15, 
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))',
    icon: '⭐'
  },
  table: { 
    color: '#3B82F6', 
    bgAlpha: 0.15, 
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))',
    icon: '🪑'
  },
  bar: { 
    color: '#8B5CF6', 
    bgAlpha: 0.15, 
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))',
    icon: '🍸'
  },
  stage: { 
    color: '#EF4444', 
    bgAlpha: 0.15, 
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.08))',
    icon: '🎤'
  },
  dj: { 
    color: '#EC4899', 
    bgAlpha: 0.15, 
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(236,72,153,0.08))',
    icon: '🎧'
  },
  lounge: {
    color: '#14B8A6',
    bgAlpha: 0.15,
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.25), rgba(20,184,166,0.08))',
    icon: '🛋️'
  },
  other: { 
    color: '#6B7280', 
    bgAlpha: 0.15, 
    gradient: 'linear-gradient(135deg, rgba(107,114,128,0.25), rgba(107,114,128,0.08))',
    icon: '📍'
  },
} as const;

const translations = {
  el: {
    title: 'Σχεδιάγραμμα χώρου',
    subtitle: 'Διαχειριστείτε τη διάταξη και τις ζώνες του χώρου σας',
    uploadImage: 'Ανέβασμα κάτοψης',
    changeImage: 'Αλλαγή',
    removeImage: 'Αφαίρεση',
    addZone: 'Νέα ζώνη',
    editZone: 'Επεξεργασία ζώνης',
    deleteZone: 'Διαγραφή ζώνης',
    save: 'Αποθήκευση',
    label: 'Ονομασία',
    type: 'Τύπος',
    capacity: 'Χωρητικότητα',
    zones: 'Ζώνες',
    noZones: 'Κάντε κλικ "Νέα ζώνη" για να ξεκινήσετε',
    clickToPlace: 'Κάντε κλικ στην κάτοψη για τοποθέτηση',
    vip: 'VIP',
    table: 'Τραπέζι',
    bar: 'Bar',
    stage: 'Σκηνή',
    dj: 'DJ Booth',
    lounge: 'Lounge',
    other: 'Άλλο',
    uploadFirst: 'Ανεβάστε την κάτοψη του χώρου σας',
    uploadHint: 'Φωτογραφία ή σχέδιο του χώρου σας',
    saved: 'Αποθηκεύτηκε',
    deleted: 'Η ζώνη διαγράφηκε',
    placingMode: 'Λειτουργία τοποθέτησης',
    cancel: 'Ακύρωση',
    people: 'άτομα',
    totalCapacity: 'Συνολική χωρητικότητα',
    removeImageConfirm: 'Θέλετε σίγουρα να αφαιρέσετε την κάτοψη;',
    removeImageDesc: 'Θα αφαιρεθεί η εικόνα αλλά οι ζώνες θα παραμείνουν.',
    yes: 'Ναι',
    no: 'Όχι',
    imageRemoved: 'Η κάτοψη αφαιρέθηκε',
    width: 'Πλάτος',
    height: 'Ύψος',
    confirmDelete: 'Σίγουρα;',
  },
  en: {
    title: 'Floor plan',
    subtitle: 'Manage your venue layout and seating zones',
    uploadImage: 'Upload layout',
    changeImage: 'Change',
    removeImage: 'Remove',
    addZone: 'New zone',
    editZone: 'Edit zone',
    deleteZone: 'Delete zone',
    save: 'Save',
    label: 'Name',
    type: 'Type',
    capacity: 'Capacity',
    zones: 'Zones',
    noZones: 'Click "New zone" to get started',
    clickToPlace: 'Click on the layout to place zone',
    vip: 'VIP',
    table: 'Table',
    bar: 'Bar',
    stage: 'Stage',
    dj: 'DJ Booth',
    lounge: 'Lounge',
    other: 'Other',
    uploadFirst: 'Upload your venue layout',
    uploadHint: 'Photo or drawing of your venue',
    saved: 'Saved',
    deleted: 'Zone deleted',
    placingMode: 'Placing mode',
    cancel: 'Cancel',
    people: 'people',
    totalCapacity: 'Total capacity',
    removeImageConfirm: 'Remove the floor plan image?',
    removeImageDesc: 'The image will be removed but zones will remain.',
    yes: 'Yes',
    no: 'No',
    imageRemoved: 'Floor plan removed',
    width: 'Width',
    height: 'Height',
    confirmDelete: 'Are you sure?',
  },
};

export function FloorPlanEditor({ businessId }: FloorPlanEditorProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const canvasRef = useRef<HTMLDivElement>(null);
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
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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

  const handleRemoveImage = async () => {
    try {
      await supabase.from('businesses').update({ floor_plan_image_url: null }).eq('id', businessId);
      setImageUrl(null);
      setShowRemoveConfirm(false);
      toast.success(t.imageRemoved);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const typeLabel = t[newZoneType as keyof typeof t] || newZoneType;
    const newZone: Partial<FloorPlanZone> = {
      label: `${typeLabel} ${zones.length + 1}`,
      zone_type: newZoneType,
      shape: 'rect',
      x_percent: Math.max(0, Math.min(92, x - 4)),
      y_percent: Math.max(0, Math.min(92, y - 3)),
      width_percent: 8,
      height_percent: 6,
      capacity: newZoneType === 'vip' ? 10 : newZoneType === 'bar' ? 15 : 4,
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
    if (error) { toast.error(error.message); return; }
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
    if (error) { toast.error(error.message); return; }
    setZones(prev => prev.map(z => z.id === zone.id ? zone : z));
  };

  const deleteZone = async (zoneId: string) => {
    const { error } = await supabase.from('floor_plan_zones').delete().eq('id', zoneId);
    if (error) { toast.error(error.message); return; }
    setZones(prev => prev.filter(z => z.id !== zoneId));
    setSelectedZone(null);
    setEditDialog(null);
    setDeleteConfirm(false);
    toast.success(t.deleted);
  };

  const handleMouseDown = (e: React.MouseEvent, zoneId: string) => {
    if (placingMode) return;
    e.stopPropagation();
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    setDragging({ zoneId, startX: e.clientX, startY: e.clientY, origX: zone.x_percent, origY: zone.y_percent });
    setSelectedZone(zoneId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
    const zone = zones.find(z => z.id === dragging.zoneId);
    if (!zone) return;
    const newX = Math.max(0, Math.min(100 - zone.width_percent, dragging.origX + dx));
    const newY = Math.max(0, Math.min(100 - zone.height_percent, dragging.origY + dy));
    setZones(prev => prev.map(z => z.id === dragging.zoneId ? { ...z, x_percent: newX, y_percent: newY } : z));
  }, [dragging, zones]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const zone = zones.find(z => z.id === dragging.zoneId);
      if (zone) updateZone(zone);
      setDragging(null);
    }
  }, [dragging, zones]);

  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
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

      {!imageUrl ? (
        /* Empty state - Upload prompt */
        <div 
          className="relative border-2 border-dashed border-border/60 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 hover:border-primary/40 hover:from-primary/5 hover:to-primary/[0.02] transition-all duration-300 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
              <Upload className="h-7 w-7 text-primary/60 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t.uploadFirst}</p>
              <p className="text-xs text-muted-foreground">{t.uploadHint}</p>
            </div>
            <Button variant="outline" size="sm" className="group-hover:border-primary/40 group-hover:text-primary transition-colors" disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t.uploadImage}
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/40 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              {placingMode ? (
                <>
                  <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2.5 py-1.5">
                    <MousePointer className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="text-xs font-medium text-primary">{t.clickToPlace}</span>
                  </div>
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
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPlacingMode(false)}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    {t.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="default" size="sm" className="h-8 text-xs shadow-sm" onClick={() => setPlacingMode(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t.addZone}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowLabels(!showLabels)}
                    title={showLabels ? 'Hide labels' : 'Show labels'}
                  >
                    {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Stats pill */}
              <div className="hidden sm:flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{zones.length}</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{totalCapacity}</span>
                </div>
              </div>
              
              {/* Image actions */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                {t.changeImage}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setShowRemoveConfirm(true)}>
                <ImageOff className="h-3.5 w-3.5 mr-1" />
                {t.removeImage}
              </Button>
            </div>
          </div>

          {/* Main canvas area */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
            {/* Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-border/30 bg-[#0f0f0f] shadow-2xl">
              <div
                ref={canvasRef}
                className={`relative select-none ${placingMode ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Background image with subtle overlay */}
                <img
                  src={imageUrl}
                  alt="Floor plan"
                  className="w-full h-auto block opacity-85"
                  draggable={false}
                />
                
                {/* Grid overlay for pro feel */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
                  backgroundSize: '20px 20px',
                }} />

                {/* SVG zones */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    {zones.map((zone) => {
                      const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                      return (
                        <linearGradient key={`grad-${zone.id}`} id={`zone-grad-${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={zt.color} stopOpacity={selectedZone === zone.id ? 0.4 : 0.2} />
                          <stop offset="100%" stopColor={zt.color} stopOpacity={selectedZone === zone.id ? 0.15 : 0.06} />
                        </linearGradient>
                      );
                    })}
                  </defs>
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
                          rx={0.6}
                          fill={`url(#zone-grad-${zone.id})`}
                          stroke={zt.color}
                          strokeWidth={isSelected ? 0.5 : 0.25}
                          strokeDasharray={isSelected ? undefined : "0.8 0.4"}
                          opacity={isSelected ? 1 : 0.85}
                          className="transition-all duration-300"
                          style={{ 
                            filter: isSelected ? `drop-shadow(0 0 4px ${zt.color}80)` : `drop-shadow(0 0 2px ${zt.color}30)`,
                          }}
                        />
                        {showLabels && (
                          <>
                            {/* Background pill for label */}
                            <rect
                              x={zone.x_percent + zone.width_percent / 2 - (zone.label.length * 0.38)}
                              y={zone.y_percent + zone.height_percent / 2 - 1.2}
                              width={zone.label.length * 0.76}
                              height={2.4}
                              rx={0.4}
                              fill="rgba(0,0,0,0.65)"
                              className="pointer-events-none"
                            />
                            <text
                              x={zone.x_percent + zone.width_percent / 2}
                              y={zone.y_percent + zone.height_percent / 2 + 0.35}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="1.4"
                              fontWeight="600"
                              letterSpacing="0.03"
                              className="pointer-events-none"
                              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                            >
                              {zone.label}
                            </text>
                          </>
                        )}
                        {/* Capacity indicator */}
                        {showLabels && (
                          <>
                            <circle
                              cx={zone.x_percent + zone.width_percent - 1}
                              cy={zone.y_percent + 1}
                              r={1}
                              fill={zt.color}
                              opacity={0.9}
                              className="pointer-events-none"
                            />
                            <text
                              x={zone.x_percent + zone.width_percent - 1}
                              y={zone.y_percent + 1.3}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="0.9"
                              fontWeight="700"
                              className="pointer-events-none"
                            >
                              {zone.capacity}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Interactive hit areas */}
                {zones.map((zone) => {
                  const isSelected = selectedZone === zone.id;
                  return (
                    <div
                      key={`hit-${zone.id}`}
                      className={`absolute rounded-md transition-all duration-200 ${
                        placingMode 
                          ? 'pointer-events-none' 
                          : `cursor-grab active:cursor-grabbing ${isSelected ? 'ring-1 ring-white/40' : 'hover:ring-1 hover:ring-white/20'}`
                      }`}
                      style={{
                        left: `${zone.x_percent}%`,
                        top: `${zone.y_percent}%`,
                        width: `${zone.width_percent}%`,
                        height: `${zone.height_percent}%`,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, zone.id)}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditDialog(zone); }}
                      onClick={(e) => {
                        if (!placingMode) {
                          e.stopPropagation();
                          setSelectedZone(zone.id === selectedZone ? null : zone.id);
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Side panel - Zone list */}
            <div className="space-y-3">
              {/* Zone list */}
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
                      return (
                        <div
                          key={zone.id}
                          className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-150 hover:bg-accent/40 ${isSelected ? 'bg-accent/60' : ''}`}
                          onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                        >
                          <div 
                            className="w-2 h-8 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: zt.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{zone.label}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span>{zt.icon}</span>
                              <span>{t[zone.zone_type as keyof typeof t] as string || zone.zone_type}</span>
                              <span className="text-border">·</span>
                              <span>{zone.capacity} {t.people}</span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0 opacity-50 hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); setEditDialog(zone); }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
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
      {editDialog && (
        <Dialog open={!!editDialog} onOpenChange={() => { setEditDialog(null); setDeleteConfirm(false); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div 
                  className="h-6 w-6 rounded-md flex items-center justify-center text-xs"
                  style={{ backgroundColor: `${(ZONE_TYPES[editDialog.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other).color}20` }}
                >
                  {(ZONE_TYPES[editDialog.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other).icon}
                </div>
                {t.editZone}
              </DialogTitle>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t.type}</Label>
                  <Select value={editDialog.zone_type} onValueChange={(v) => setEditDialog({ ...editDialog, zone_type: v })}>
                    <SelectTrigger className="h-9 mt-1">
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
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.capacity}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editDialog.capacity}
                    onChange={(e) => setEditDialog({ ...editDialog, capacity: parseInt(e.target.value) || 0 })}
                    className="h-9 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t.width} (%)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={50}
                    step={0.5}
                    value={editDialog.width_percent}
                    onChange={(e) => setEditDialog({ ...editDialog, width_percent: parseFloat(e.target.value) || 6 })}
                    className="h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.height} (%)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={50}
                    step={0.5}
                    value={editDialog.height_percent}
                    onChange={(e) => setEditDialog({ ...editDialog, height_percent: parseFloat(e.target.value) || 5 })}
                    className="h-9 mt-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              {deleteConfirm ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-destructive flex-1">{t.confirmDelete}</span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDeleteConfirm(false)}>
                    {t.no}
                  </Button>
                  <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => deleteZone(editDialog.id)}>
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
                    {t.deleteZone}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      updateZone(editDialog);
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

      {/* Remove Image Confirmation */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.removeImageConfirm}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{t.removeImageDesc}</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowRemoveConfirm(false)}>
              {t.no}
            </Button>
            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleRemoveImage}>
              {t.yes}, {t.removeImage.toLowerCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
