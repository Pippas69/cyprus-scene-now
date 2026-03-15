import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

export interface TemplateItem {
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
  fixture_type: string | null;
  item_type: string;
  width_percent: number;
  height_percent: number;
  rotation: number;
  section_label?: string;
}

export interface VenueTemplate {
  id: string;
  name_el: string;
  name_en: string;
  desc_el: string;
  desc_en: string;
  icon: string;
  items: TemplateItem[];
}

const TEMPLATES: VenueTemplate[] = [
  {
    id: 'classic-restaurant',
    name_el: 'Κλασικό εστιατόριο',
    name_en: 'Classic restaurant',
    desc_el: '12 τραπέζια, bar, host stand',
    desc_en: '12 tables, bar, host stand',
    icon: '🍽️',
    items: [
      // Bar at top
      { label: 'BAR', x_percent: 50, y_percent: 8, seats: 0, shape: 'rect', fixture_type: 'bar', item_type: 'fixture', width_percent: 30, height_percent: 4, rotation: 0 },
      // Host stand near entrance
      { label: 'HOST', x_percent: 10, y_percent: 90, seats: 0, shape: 'rect', fixture_type: 'host_stand', item_type: 'fixture', width_percent: 3, height_percent: 3, rotation: 0 },
      // Left column - round tables
      { label: 'T1', x_percent: 15, y_percent: 25, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 4, height_percent: 4, rotation: 0, section_label: 'Window' },
      { label: 'T2', x_percent: 15, y_percent: 40, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 4, height_percent: 4, rotation: 0, section_label: 'Window' },
      { label: 'T3', x_percent: 15, y_percent: 55, seats: 4, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Window' },
      { label: 'T4', x_percent: 15, y_percent: 72, seats: 4, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Window' },
      // Center column - square tables
      { label: 'T5', x_percent: 42, y_percent: 25, seats: 4, shape: 'square', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Main' },
      { label: 'T6', x_percent: 42, y_percent: 40, seats: 4, shape: 'square', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Main' },
      { label: 'T7', x_percent: 42, y_percent: 55, seats: 4, shape: 'square', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Main' },
      { label: 'T8', x_percent: 42, y_percent: 72, seats: 6, shape: 'rectangle', fixture_type: null, item_type: 'table', width_percent: 8, height_percent: 4, rotation: 0, section_label: 'Main' },
      // Right column - booths
      { label: 'T9', x_percent: 72, y_percent: 25, seats: 4, shape: 'rectangle', fixture_type: null, item_type: 'table', width_percent: 7, height_percent: 5, rotation: 0, section_label: 'Booth' },
      { label: 'T10', x_percent: 72, y_percent: 40, seats: 4, shape: 'rectangle', fixture_type: null, item_type: 'table', width_percent: 7, height_percent: 5, rotation: 0, section_label: 'Booth' },
      { label: 'T11', x_percent: 72, y_percent: 55, seats: 6, shape: 'rectangle', fixture_type: null, item_type: 'table', width_percent: 7, height_percent: 5, rotation: 0, section_label: 'Booth' },
      { label: 'T12', x_percent: 72, y_percent: 72, seats: 8, shape: 'rectangle', fixture_type: null, item_type: 'table', width_percent: 10, height_percent: 5, rotation: 0, section_label: 'Booth' },
      // Kitchen
      { label: 'KITCHEN', x_percent: 85, y_percent: 8, seats: 0, shape: 'rect', fixture_type: 'kitchen', item_type: 'fixture', width_percent: 10, height_percent: 6, rotation: 0 },
    ],
  },
  {
    id: 'nightclub',
    name_el: 'Nightclub',
    name_en: 'Nightclub',
    desc_el: 'DJ, σκηνή, VIP booths, bar',
    desc_en: 'DJ, stage, VIP booths, bar',
    icon: '🎵',
    items: [
      { label: 'STAGE', x_percent: 50, y_percent: 8, seats: 0, shape: 'rect', fixture_type: 'stage', item_type: 'fixture', width_percent: 30, height_percent: 8, rotation: 0 },
      { label: 'DJ', x_percent: 50, y_percent: 20, seats: 0, shape: 'rect', fixture_type: 'dj_booth', item_type: 'fixture', width_percent: 6, height_percent: 4, rotation: 0 },
      { label: 'BAR', x_percent: 85, y_percent: 50, seats: 0, shape: 'rect', fixture_type: 'bar', item_type: 'fixture', width_percent: 4, height_percent: 25, rotation: 0 },
      // VIP booths
      { label: 'VIP 1', x_percent: 12, y_percent: 30, seats: 6, shape: 'rectangle', fixture_type: 'booth', item_type: 'seating', width_percent: 7, height_percent: 5, rotation: 0, section_label: 'VIP' },
      { label: 'VIP 2', x_percent: 12, y_percent: 45, seats: 6, shape: 'rectangle', fixture_type: 'booth', item_type: 'seating', width_percent: 7, height_percent: 5, rotation: 0, section_label: 'VIP' },
      { label: 'VIP 3', x_percent: 12, y_percent: 60, seats: 8, shape: 'rectangle', fixture_type: 'booth', item_type: 'seating', width_percent: 8, height_percent: 5, rotation: 0, section_label: 'VIP' },
      { label: 'VIP 4', x_percent: 12, y_percent: 75, seats: 10, shape: 'rectangle', fixture_type: 'booth', item_type: 'seating', width_percent: 8, height_percent: 6, rotation: 0, section_label: 'VIP' },
      // Standing tables
      { label: 'S1', x_percent: 38, y_percent: 40, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 2.5, height_percent: 2.5, rotation: 0, section_label: 'Standing' },
      { label: 'S2', x_percent: 50, y_percent: 40, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 2.5, height_percent: 2.5, rotation: 0, section_label: 'Standing' },
      { label: 'S3', x_percent: 62, y_percent: 40, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 2.5, height_percent: 2.5, rotation: 0, section_label: 'Standing' },
      { label: 'S4', x_percent: 38, y_percent: 60, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 2.5, height_percent: 2.5, rotation: 0, section_label: 'Standing' },
      { label: 'S5', x_percent: 50, y_percent: 60, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 2.5, height_percent: 2.5, rotation: 0, section_label: 'Standing' },
      { label: 'S6', x_percent: 62, y_percent: 60, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 2.5, height_percent: 2.5, rotation: 0, section_label: 'Standing' },
      // WC
      { label: 'WC', x_percent: 10, y_percent: 92, seats: 0, shape: 'rect', fixture_type: 'restroom', item_type: 'fixture', width_percent: 8, height_percent: 5, rotation: 0 },
    ],
  },
  {
    id: 'cafe-bar',
    name_el: 'Café / Bar',
    name_en: 'Café / Bar',
    desc_el: 'Bar counter, εσωτερικά & εξωτερικά τραπέζια',
    desc_en: 'Bar counter, indoor & outdoor tables',
    icon: '☕',
    items: [
      { label: 'BAR', x_percent: 50, y_percent: 15, seats: 0, shape: 'rect', fixture_type: 'bar', item_type: 'fixture', width_percent: 35, height_percent: 5, rotation: 0 },
      // Bar stools
      { label: 'B1', x_percent: 30, y_percent: 22, seats: 1, shape: 'round', fixture_type: null, item_type: 'seating', width_percent: 2, height_percent: 2, rotation: 0, section_label: 'Bar' },
      { label: 'B2', x_percent: 36, y_percent: 22, seats: 1, shape: 'round', fixture_type: null, item_type: 'seating', width_percent: 2, height_percent: 2, rotation: 0, section_label: 'Bar' },
      { label: 'B3', x_percent: 42, y_percent: 22, seats: 1, shape: 'round', fixture_type: null, item_type: 'seating', width_percent: 2, height_percent: 2, rotation: 0, section_label: 'Bar' },
      { label: 'B4', x_percent: 48, y_percent: 22, seats: 1, shape: 'round', fixture_type: null, item_type: 'seating', width_percent: 2, height_percent: 2, rotation: 0, section_label: 'Bar' },
      { label: 'B5', x_percent: 54, y_percent: 22, seats: 1, shape: 'round', fixture_type: null, item_type: 'seating', width_percent: 2, height_percent: 2, rotation: 0, section_label: 'Bar' },
      { label: 'B6', x_percent: 60, y_percent: 22, seats: 1, shape: 'round', fixture_type: null, item_type: 'seating', width_percent: 2, height_percent: 2, rotation: 0, section_label: 'Bar' },
      { label: 'B7', x_percent: 66, y_percent: 22, seats: 1, shape: 'round', fixture_type: null, item_type: 'seating', width_percent: 2, height_percent: 2, rotation: 0, section_label: 'Bar' },
      // Indoor tables
      { label: 'T1', x_percent: 20, y_percent: 40, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 4, height_percent: 4, rotation: 0, section_label: 'Indoor' },
      { label: 'T2', x_percent: 35, y_percent: 40, seats: 4, shape: 'square', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Indoor' },
      { label: 'T3', x_percent: 55, y_percent: 40, seats: 4, shape: 'square', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Indoor' },
      { label: 'T4', x_percent: 75, y_percent: 40, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 4, height_percent: 4, rotation: 0, section_label: 'Indoor' },
      // Outdoor tables (patio)
      { label: 'P1', x_percent: 20, y_percent: 70, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 4, height_percent: 4, rotation: 0, section_label: 'Patio' },
      { label: 'P2', x_percent: 35, y_percent: 70, seats: 4, shape: 'square', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Patio' },
      { label: 'P3', x_percent: 55, y_percent: 70, seats: 4, shape: 'square', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Patio' },
      { label: 'P4', x_percent: 75, y_percent: 70, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 4, height_percent: 4, rotation: 0, section_label: 'Patio' },
      // Divider
      { label: 'FENCE', x_percent: 50, y_percent: 55, seats: 0, shape: 'rect', fixture_type: 'fence', item_type: 'architecture', width_percent: 70, height_percent: 0.6, rotation: 0 },
      // POS
      { label: 'POS', x_percent: 85, y_percent: 10, seats: 0, shape: 'rect', fixture_type: 'pos', item_type: 'fixture', width_percent: 3, height_percent: 2, rotation: 0 },
    ],
  },
  {
    id: 'fine-dining',
    name_el: 'Fine dining',
    name_en: 'Fine dining',
    desc_el: 'Κομψά τραπέζια με private rooms',
    desc_en: 'Elegant tables with private rooms',
    icon: '🥂',
    items: [
      { label: 'HOST', x_percent: 50, y_percent: 90, seats: 0, shape: 'rect', fixture_type: 'host_stand', item_type: 'fixture', width_percent: 3, height_percent: 3, rotation: 0 },
      // Main dining - round tables
      { label: 'T1', x_percent: 20, y_percent: 20, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Main dining' },
      { label: 'T2', x_percent: 40, y_percent: 20, seats: 4, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 6, height_percent: 6, rotation: 0, section_label: 'Main dining' },
      { label: 'T3', x_percent: 60, y_percent: 20, seats: 4, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 6, height_percent: 6, rotation: 0, section_label: 'Main dining' },
      { label: 'T4', x_percent: 80, y_percent: 20, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Main dining' },
      { label: 'T5', x_percent: 20, y_percent: 45, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Main dining' },
      { label: 'T6', x_percent: 40, y_percent: 45, seats: 6, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 7, height_percent: 7, rotation: 0, section_label: 'Main dining' },
      { label: 'T7', x_percent: 60, y_percent: 45, seats: 6, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 7, height_percent: 7, rotation: 0, section_label: 'Main dining' },
      { label: 'T8', x_percent: 80, y_percent: 45, seats: 2, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 5, height_percent: 5, rotation: 0, section_label: 'Main dining' },
      // Private room
      { label: 'WALL', x_percent: 50, y_percent: 65, seats: 0, shape: 'rect', fixture_type: 'wall', item_type: 'architecture', width_percent: 40, height_percent: 0.8, rotation: 0 },
      { label: 'PR1', x_percent: 40, y_percent: 78, seats: 8, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 8, height_percent: 8, rotation: 0, section_label: 'Private' },
      { label: 'PR2', x_percent: 62, y_percent: 78, seats: 10, shape: 'round', fixture_type: null, item_type: 'table', width_percent: 9, height_percent: 9, rotation: 0, section_label: 'Private' },
      // Bar
      { label: 'BAR', x_percent: 10, y_percent: 70, seats: 0, shape: 'rect', fixture_type: 'bar', item_type: 'fixture', width_percent: 4, height_percent: 18, rotation: 0 },
      // Kitchen
      { label: 'KITCHEN', x_percent: 90, y_percent: 80, seats: 0, shape: 'rect', fixture_type: 'kitchen', item_type: 'fixture', width_percent: 8, height_percent: 10, rotation: 0 },
    ],
  },
];

interface FloorPlanTemplatesProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: VenueTemplate) => void;
}

export function FloorPlanTemplates({ open, onClose, onSelect }: FloorPlanTemplatesProps) {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{language === 'el' ? 'Πρότυπα χώρων' : 'Venue templates'}</DialogTitle>
          <DialogDescription>
            {language === 'el' ? 'Ξεκινήστε με ένα έτοιμο πρότυπο και προσαρμόστε το' : 'Start with a template and customize it'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => { onSelect(tmpl); onClose(); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-accent/30 hover:border-primary/30 transition-all text-left group"
            >
              <span className="text-3xl">{tmpl.icon}</span>
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {language === 'el' ? tmpl.name_el : tmpl.name_en}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {language === 'el' ? tmpl.desc_el : tmpl.desc_en}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {tmpl.items.filter(i => !i.fixture_type).length} {language === 'el' ? 'τραπέζια' : 'tables'} · {tmpl.items.reduce((s, i) => s + i.seats, 0)} seats
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { TEMPLATES };
