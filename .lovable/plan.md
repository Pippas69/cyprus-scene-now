

# Layout Studio — Πλήρης Ανακατασκευή Floor Plan Editor

## Πρόβλημα
Το τρέχον σύστημα: μικροσκοπικά τραπέζια, τεράστια κενά, edit μόνο μέσω modal dialog, κανένα drag-from-library, η βάση δεδομένων δεν αποθηκεύει `rotation`/`width_percent`/`height_percent` (γίνεται client-side hack). Αποτέλεσμα: ερασιτεχνικό.

## Τι θα αλλάξει

### 1. Database Migration
Προσθήκη στηλών στον πίνακα `floor_plan_tables` που λείπουν:
- `rotation` (integer, default 0)
- `width_percent` (numeric, default 5)
- `height_percent` (numeric, default 5)
- `is_locked` (boolean, default false)
- `item_type` (text, default 'table') — για κατηγοριοποίηση assets

Προσθήκη `color` στον `floor_plan_zones`.

Αυτό σημαίνει ότι τα `updateItem`/`saveItem` θα αποθηκεύουν πραγματικά rotation και size στη βάση.

### 2. 3-Column Layout (Αριστερά: Asset Library → Κέντρο: Canvas → Δεξιά: Properties)

**Αριστερό Panel — Asset Library Sidebar** (`AssetLibrarySidebar.tsx`):
- Collapsible κατηγορίες: Tables, Seating/Booths, Fixtures, Architecture
- Κάθε asset = SVG thumbnail + label, draggable
- Drag & Drop στο canvas → δημιουργεί item με defaults (shape, seats, size)
- Search bar + "Recently used"
- ~30 preset assets (round 2p-12p, square, rectangle, booth, bar, DJ, stage, wall, column, planter, κλπ.)

**Κεντρικό Panel — Canvas** (ενισχυμένο):
- Toolbar πάνω: Undo/Redo, Grid, Snap, Labels, Ref Image, Clean View
- Μεγαλύτερα default μεγέθη τραπεζιών (αντί 2.5-5%, θα είναι 4-7%)
- Smart guides (dashed lines) κατά το drag για alignment

**Δεξί Panel — Properties** (`ItemPropertiesPanel.tsx`):
- Αντικαθιστά το modal dialog
- Inline editing: Name, Seats, Shape, Zone, Rotation (dial), Width/Height (sliders), Lock toggle
- Duplicate / Delete buttons
- Εμφανίζεται μόνο όταν υπάρχει selected item

### 3. Νέοι SVG Renderers στο VenueSVGCanvas
- Booth shapes (ημικυκλικό backing)
- Column (γεμάτος μικρός κύκλος)
- Wall segment (λεπτή μπάρα)
- Stage (ορθογώνιο με curved front)
- Planter (πράσινος κύκλος)
- Lock badge (🔒) σε locked items

### 4. Canvas Precision Tools
- **Smart Guides**: Κάθετες/οριζόντιες γραμμές alignment κατά το drag
- **Multi-select**: Shift+Click → group move/delete
- **Undo/Redo**: History stack 30 ενεργειών, Ctrl+Z/Ctrl+Shift+Z
- **Keyboard shortcuts**: Del, Ctrl+D (duplicate), R (rotate), L (lock), arrows (move ±1%), Esc (deselect)

### 5. Αρχεία

```text
floorplan/
├── FloorPlanEditor.tsx         ← REWRITE (3-column layout)
├── AssetLibrarySidebar.tsx     ← NEW
├── ItemPropertiesPanel.tsx     ← NEW  
├── VenueSVGCanvas.tsx          ← ENHANCE (new shapes, guides)
├── SmartGuides.tsx             ← NEW
├── useFloorPlanHistory.ts      ← NEW (undo/redo)
├── constants.ts                ← NEW (asset definitions)
└── FloorPlanAssignmentDialog.tsx ← KEEP AS IS
```

### Σειρά υλοποίησης
1. DB migration (rotation, width_percent, height_percent, is_locked, item_type)
2. `constants.ts` — asset definitions catalog
3. `AssetLibrarySidebar.tsx` — drag-from-library
4. `ItemPropertiesPanel.tsx` — inline properties (αντικατάσταση modal)
5. `useFloorPlanHistory.ts` — undo/redo hook
6. `VenueSVGCanvas.tsx` — νέα shapes + smart guides
7. `FloorPlanEditor.tsx` — rewrite σε 3-column layout, wire everything

