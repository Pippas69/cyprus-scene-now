// Asset definitions for the Layout Studio

export interface AssetDefinition {
  id: string;
  label: string;
  category: 'tables' | 'seating' | 'fixtures' | 'architecture';
  shape: string;
  seats: number;
  width_percent: number;
  height_percent: number;
  fixture_type: string | null;
  item_type: string;
  icon: string; // emoji or text
}

export const ASSET_CATALOG: AssetDefinition[] = [
  // ── Tables ──
  { id: 'round-2', label: 'Round 2p', category: 'tables', shape: 'round', seats: 2, width_percent: 3.5, height_percent: 3.5, fixture_type: null, item_type: 'table', icon: '⬤' },
  { id: 'round-4', label: 'Round 4p', category: 'tables', shape: 'round', seats: 4, width_percent: 4.5, height_percent: 4.5, fixture_type: null, item_type: 'table', icon: '⬤' },
  { id: 'round-6', label: 'Round 6p', category: 'tables', shape: 'round', seats: 6, width_percent: 5.5, height_percent: 5.5, fixture_type: null, item_type: 'table', icon: '⬤' },
  { id: 'round-8', label: 'Round 8p', category: 'tables', shape: 'round', seats: 8, width_percent: 6.5, height_percent: 6.5, fixture_type: null, item_type: 'table', icon: '⬤' },
  { id: 'round-10', label: 'Round 10p', category: 'tables', shape: 'round', seats: 10, width_percent: 7.5, height_percent: 7.5, fixture_type: null, item_type: 'table', icon: '⬤' },
  { id: 'round-12', label: 'Round 12p', category: 'tables', shape: 'round', seats: 12, width_percent: 8.5, height_percent: 8.5, fixture_type: null, item_type: 'table', icon: '⬤' },
  { id: 'square-2', label: 'Square 2p', category: 'tables', shape: 'square', seats: 2, width_percent: 3.5, height_percent: 3.5, fixture_type: null, item_type: 'table', icon: '⬜' },
  { id: 'square-4', label: 'Square 4p', category: 'tables', shape: 'square', seats: 4, width_percent: 4.5, height_percent: 4.5, fixture_type: null, item_type: 'table', icon: '⬜' },
  { id: 'rect-4', label: 'Rect 4p', category: 'tables', shape: 'rectangle', seats: 4, width_percent: 6, height_percent: 3.5, fixture_type: null, item_type: 'table', icon: '▬' },
  { id: 'rect-6', label: 'Rect 6p', category: 'tables', shape: 'rectangle', seats: 6, width_percent: 8, height_percent: 3.5, fixture_type: null, item_type: 'table', icon: '▬' },
  { id: 'rect-8', label: 'Rect 8p', category: 'tables', shape: 'rectangle', seats: 8, width_percent: 10, height_percent: 4, fixture_type: null, item_type: 'table', icon: '▬' },
  { id: 'cocktail', label: 'Cocktail', category: 'tables', shape: 'round', seats: 2, width_percent: 2.5, height_percent: 2.5, fixture_type: null, item_type: 'table', icon: '🍸' },
  { id: 'communal', label: 'Communal', category: 'tables', shape: 'rectangle', seats: 12, width_percent: 14, height_percent: 4, fixture_type: null, item_type: 'table', icon: '▬' },

  // ── Seating & Booths ──
  { id: 'vip-booth', label: 'VIP Booth', category: 'seating', shape: 'rectangle', seats: 6, width_percent: 7, height_percent: 5, fixture_type: 'booth', item_type: 'seating', icon: '🛋️' },
  { id: 'corner-booth', label: 'Corner Booth', category: 'seating', shape: 'rectangle', seats: 8, width_percent: 7, height_percent: 7, fixture_type: 'booth_l', item_type: 'seating', icon: '🛋️' },
  { id: 'u-booth', label: 'U-Booth', category: 'seating', shape: 'rectangle', seats: 10, width_percent: 8, height_percent: 6, fixture_type: 'booth_u', item_type: 'seating', icon: '🛋️' },
  { id: 'banquette', label: 'Banquette', category: 'seating', shape: 'rectangle', seats: 4, width_percent: 8, height_percent: 2.5, fixture_type: null, item_type: 'seating', icon: '━' },
  { id: 'lounge', label: 'Lounge Sofa', category: 'seating', shape: 'rectangle', seats: 4, width_percent: 6, height_percent: 3, fixture_type: null, item_type: 'seating', icon: '🛋️' },
  { id: 'barstool', label: 'Bar Stool', category: 'seating', shape: 'round', seats: 1, width_percent: 2, height_percent: 2, fixture_type: null, item_type: 'seating', icon: '●' },

  // ── Fixtures ──
  { id: 'bar', label: 'Bar Counter', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 20, height_percent: 4, fixture_type: 'bar', item_type: 'fixture', icon: '🍺' },
  { id: 'bar-l', label: 'Bar L-Shape', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 12, height_percent: 12, fixture_type: 'bar_l', item_type: 'fixture', icon: '🍺' },
  { id: 'dj', label: 'DJ Booth', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 6, height_percent: 4, fixture_type: 'dj_booth', item_type: 'fixture', icon: '🎧' },
  { id: 'stage', label: 'Stage', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 18, height_percent: 8, fixture_type: 'stage', item_type: 'fixture', icon: '🎤' },
  { id: 'host-stand', label: 'Host Stand', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 3, height_percent: 3, fixture_type: 'host_stand', item_type: 'fixture', icon: '🧑‍💼' },
  { id: 'kitchen', label: 'Kitchen', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 10, height_percent: 6, fixture_type: 'kitchen', item_type: 'fixture', icon: '🍳' },
  { id: 'restroom', label: 'WC', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 8, height_percent: 6, fixture_type: 'restroom', item_type: 'fixture', icon: '🚻' },
  { id: 'pos', label: 'POS / Cashier', category: 'fixtures', shape: 'rect', seats: 0, width_percent: 3, height_percent: 2, fixture_type: 'pos', item_type: 'fixture', icon: '💳' },

  // ── Architecture ──
  { id: 'wall', label: 'Wall', category: 'architecture', shape: 'rect', seats: 0, width_percent: 15, height_percent: 0.8, fixture_type: 'wall', item_type: 'architecture', icon: '▬' },
  { id: 'column', label: 'Column', category: 'architecture', shape: 'round', seats: 0, width_percent: 1.5, height_percent: 1.5, fixture_type: 'column', item_type: 'architecture', icon: '⬤' },
  { id: 'stairs', label: 'Stairs', category: 'architecture', shape: 'rect', seats: 0, width_percent: 5, height_percent: 8, fixture_type: 'stairs', item_type: 'architecture', icon: '🪜' },
  { id: 'door', label: 'Door', category: 'architecture', shape: 'rect', seats: 0, width_percent: 4, height_percent: 1, fixture_type: 'door', item_type: 'architecture', icon: '🚪' },
  { id: 'fire-exit', label: 'Fire Exit', category: 'architecture', shape: 'rect', seats: 0, width_percent: 4, height_percent: 1, fixture_type: 'fire_exit', item_type: 'architecture', icon: '🚨' },
  { id: 'window', label: 'Window', category: 'architecture', shape: 'rect', seats: 0, width_percent: 6, height_percent: 0.8, fixture_type: 'window', item_type: 'architecture', icon: '🪟' },
  { id: 'partition', label: 'Partition', category: 'architecture', shape: 'rect', seats: 0, width_percent: 8, height_percent: 0.8, fixture_type: 'partition', item_type: 'architecture', icon: '┃' },
  { id: 'planter', label: 'Planter', category: 'architecture', shape: 'round', seats: 0, width_percent: 2.5, height_percent: 2.5, fixture_type: 'planter', item_type: 'architecture', icon: '🌿' },
  { id: 'fence', label: 'Fence', category: 'architecture', shape: 'rect', seats: 0, width_percent: 12, height_percent: 0.6, fixture_type: 'fence', item_type: 'architecture', icon: '▬' },
];

export const CATEGORIES = [
  { id: 'tables' as const, label_el: 'Τραπέζια', label_en: 'Tables', icon: '🪑' },
  { id: 'seating' as const, label_el: 'Καθίσματα', label_en: 'Seating', icon: '🛋️' },
  { id: 'fixtures' as const, label_el: 'Fixtures', label_en: 'Fixtures', icon: '🏗️' },
  { id: 'architecture' as const, label_el: 'Αρχιτεκτονικά', label_en: 'Architecture', icon: '🧱' },
];

export const ZONE_COLORS = [
  { name: 'Gold', value: '#FFD700' },
  { name: 'Cyan', value: '#00E5FF' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Slate', value: '#64748B' },
];
