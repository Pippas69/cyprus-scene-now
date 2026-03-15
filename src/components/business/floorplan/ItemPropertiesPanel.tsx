import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Trash2, Copy, RotateCw, Lock, Unlock, ArrowUp, Link2, Unlink } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export interface FloorPlanItemFull {
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
  rotation: number;
  width_percent: number;
  height_percent: number;
  is_locked: boolean;
  item_type: string;
  color: string | null;
  room_id: string | null;
  combined_with: string[];
  section_label: string | null;
}

interface ItemPropertiesPanelProps {
  item: FloorPlanItemFull;
  onChange: (updated: FloorPlanItemFull) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: FloorPlanItemFull) => void;
  allItems?: FloorPlanItemFull[];
  onCombine?: (sourceId: string, targetId: string) => void;
  onUncombine?: (sourceId: string, targetId: string) => void;
}

const translations = {
  el: {
    properties: 'Ιδιότητες',
    name: 'Όνομα',
    seats: 'Θέσεις',
    shape: 'Σχήμα',
    round: 'Στρογγυλό',
    square: 'Τετράγωνο',
    rectangle: 'Ορθογώνιο',
    rotation: 'Περιστροφή',
    width: 'Πλάτος',
    height: 'Ύψος',
    locked: 'Κλειδωμένο',
    type: 'Τύπος',
    color: 'Χρώμα',
    resetColor: 'Επαναφορά',
    duplicate: 'Αντιγραφή',
    delete: 'Διαγραφή',
    confirmDelete: 'Σίγουρα;',
    position: 'Θέση',
    noSelection: 'Επιλέξτε ένα στοιχείο',
    noSelectionHint: 'Κάντε κλικ σε κάποιο τραπέζι ή στοιχείο στον καμβά',
    section: 'Ενότητα',
    sectionPlaceholder: 'π.χ. Patio, VIP, Main',
    combined: 'Συνδεδεμένα',
    combineWith: 'Σύνδεση με',
    uncombine: 'Αποσύνδεση',
    totalSeats: 'Σύνολο θέσεων',
  },
  en: {
    properties: 'Properties',
    name: 'Name',
    seats: 'Seats',
    shape: 'Shape',
    round: 'Round',
    square: 'Square',
    rectangle: 'Rectangle',
    rotation: 'Rotation',
    width: 'Width',
    height: 'Height',
    locked: 'Locked',
    type: 'Type',
    color: 'Color',
    resetColor: 'Reset',
    duplicate: 'Duplicate',
    delete: 'Delete',
    confirmDelete: 'Are you sure?',
    position: 'Position',
    noSelection: 'Select an item',
    noSelectionHint: 'Click on a table or element on the canvas',
    section: 'Section',
    sectionPlaceholder: 'e.g. Patio, VIP, Main',
    combined: 'Combined with',
    combineWith: 'Combine with',
    uncombine: 'Uncombine',
    totalSeats: 'Total seats',
  },
};

export function ItemPropertiesPanel({ item, onChange, onDelete, onDuplicate, allItems = [], onCombine, onUncombine }: ItemPropertiesPanelProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const isFixture = !!item.fixture_type;
  const isTable = !isFixture;

  const update = (partial: Partial<FloorPlanItemFull>) => {
    onChange({ ...item, ...partial });
  };

  // Get combined tables info
  const combinedTables = allItems.filter(i => item.combined_with?.includes(i.id));
  const totalCombinedSeats = item.seats + combinedTables.reduce((s, t) => s + t.seats, 0);

  // Available tables to combine with (nearby, non-fixture, not already combined)
  const availableToCombine = allItems.filter(i => 
    i.id !== item.id && 
    !i.fixture_type && 
    !item.combined_with?.includes(i.id) &&
    i.room_id === item.room_id
  );

  return (
    <div className="h-full flex flex-col bg-card/80 backdrop-blur-md border-l border-border/30 overflow-hidden">
      <div className="px-3 py-3 border-b border-border/30">
        <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
          {t.properties}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Name */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase">{t.name}</Label>
          <Input value={item.label} onChange={e => update({ label: e.target.value })} className="h-8 mt-1 text-xs" disabled={item.is_locked} />
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase">{t.type}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
            {item.fixture_type || item.shape}
          </span>
        </div>

        {/* Section label */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase">{t.section}</Label>
          <Input
            value={item.section_label || ''}
            onChange={e => update({ section_label: e.target.value || null })}
            placeholder={t.sectionPlaceholder}
            className="h-8 mt-1 text-xs"
            disabled={item.is_locked}
          />
        </div>

        {/* Seats (tables only) */}
        {isTable && (
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">{t.seats}</Label>
            <Input
              type="number" min={1} max={20}
              value={item.seats}
              onChange={e => update({ seats: parseInt(e.target.value) || 1 })}
              className="h-8 mt-1 text-xs"
              disabled={item.is_locked}
            />
          </div>
        )}

        {/* Shape (tables only) */}
        {isTable && (
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">{t.shape}</Label>
            <div className="flex gap-1.5 mt-1">
              {(['round', 'square', 'rectangle'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => update({ shape: s })}
                  disabled={item.is_locked}
                  className={`flex-1 h-8 rounded-md border text-[10px] font-medium transition-all ${
                    item.shape === s ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {t[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rotation */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground uppercase">{t.rotation}</Label>
            <span className="text-[10px] text-muted-foreground">{item.rotation}°</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Slider value={[item.rotation]} onValueChange={([v]) => update({ rotation: v })} min={0} max={315} step={45} className="flex-1" disabled={item.is_locked} />
            <Button variant="outline" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => update({ rotation: (item.rotation + 45) % 360 })} disabled={item.is_locked}>
              <RotateCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">{t.width}</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Slider value={[item.width_percent]} onValueChange={([v]) => update({ width_percent: v })} min={1} max={30} step={0.5} className="flex-1" disabled={item.is_locked} />
              <span className="text-[10px] text-muted-foreground w-7 text-right">{item.width_percent}%</span>
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase">{t.height}</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Slider value={[item.height_percent]} onValueChange={([v]) => update({ height_percent: v })} min={1} max={30} step={0.5} className="flex-1" disabled={item.is_locked} />
              <span className="text-[10px] text-muted-foreground w-7 text-right">{item.height_percent}%</span>
            </div>
          </div>
        </div>

        {/* Position */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase">{t.position}</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">X</span>
              <Input type="number" min={0} max={100} step={0.5} value={Math.round(item.x_percent * 10) / 10} onChange={e => update({ x_percent: parseFloat(e.target.value) || 0 })} className="h-7 text-[10px]" disabled={item.is_locked} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Y</span>
              <Input type="number" min={0} max={100} step={0.5} value={Math.round(item.y_percent * 10) / 10} onChange={e => update({ y_percent: parseFloat(e.target.value) || 0 })} className="h-7 text-[10px]" disabled={item.is_locked} />
            </div>
          </div>
        </div>

        {/* Lock toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            {item.is_locked ? <Lock className="h-3.5 w-3.5 text-amber-500" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="text-xs text-foreground">{t.locked}</span>
          </div>
          <Switch checked={item.is_locked} onCheckedChange={v => update({ is_locked: v })} />
        </div>

        {/* Color picker */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase">{t.color}</Label>
          <div className="flex items-center gap-2 mt-1.5">
            {['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4'].map(c => (
              <button
                key={c}
                onClick={() => update({ color: c })}
                disabled={item.is_locked}
                className={`w-5 h-5 rounded-full border-2 transition-all ${item.color === c ? 'border-foreground scale-125' : 'border-border/40 hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {item.color && (
            <div className="flex items-center gap-2 mt-2">
              <input type="color" value={item.color} onChange={e => update({ color: e.target.value })} disabled={item.is_locked} className="w-6 h-6 rounded cursor-pointer border border-border/40" />
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => update({ color: null })}>
                {t.resetColor}
              </Button>
            </div>
          )}
        </div>

        {/* Table Combining (tables only) */}
        {isTable && onCombine && onUncombine && (
          <>
            <div className="border-t border-border/30" />
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5">
                <Link2 className="h-3 w-3" /> {t.combined}
              </Label>
              {combinedTables.length > 0 ? (
                <div className="space-y-1 mt-1.5">
                  <div className="text-[10px] text-primary font-medium">
                    {t.totalSeats}: {totalCombinedSeats}
                  </div>
                  {combinedTables.map(ct => (
                    <div key={ct.id} className="flex items-center justify-between bg-muted/30 rounded-md px-2 py-1">
                      <span className="text-[10px] font-medium">{ct.label} ({ct.seats}p)</span>
                      <button onClick={() => onUncombine(item.id, ct.id)} className="text-destructive/60 hover:text-destructive">
                        <Unlink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {language === 'el' ? 'Δεν υπάρχουν συνδεδεμένα' : 'No linked tables'}
                </p>
              )}

              {availableToCombine.length > 0 && (
                <div className="mt-2">
                  <Label className="text-[10px] text-muted-foreground uppercase">{t.combineWith}</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {availableToCombine.slice(0, 8).map(at => (
                      <button
                        key={at.id}
                        onClick={() => onCombine(item.id, at.id)}
                        className="text-[9px] px-1.5 py-0.5 rounded border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        {at.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="border-t border-border/30" />

        {/* Actions */}
        <div className="space-y-1.5">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start" onClick={() => onDuplicate(item)}>
            <Copy className="h-3 w-3 mr-2" />
            {t.duplicate}
          </Button>

          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-destructive flex-1">{t.confirmDelete}</span>
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setDeleteConfirm(false)}>✕</Button>
              <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={() => onDelete(item.id)}>✓</Button>
            </div>
          ) : (
            <Button
              variant="outline" size="sm"
              className="w-full h-8 text-xs justify-start text-destructive hover:text-destructive border-destructive/20"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              {t.delete}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyPropertiesPanel() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="h-full flex flex-col bg-card/80 backdrop-blur-md border-l border-border/30">
      <div className="px-3 py-3 border-b border-border/30">
        <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">{t.properties}</h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <ArrowUp className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{t.noSelection}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{t.noSelectionHint}</p>
      </div>
    </div>
  );
}
