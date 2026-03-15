
## Υλοποίηση - Ολοκληρώθηκε ✅

### Μέρος 1: Αφαίρεση Feed & Map ✅
- Αφαιρέθηκαν Feed/Map από BusinessSidebar και DashboardBusiness routes

---

# 🏗️ FOMO.CY — Layout Studio: Το Τέλειο Floor Plan System

## Στόχος
Δημιουργία ενός **Layout Studio** επιπέδου enterprise που ξεπερνά τα OpenTable, SevenRooms και ResDiary. Ο επιχειρηματίας σχεδιάζει το **Ψηφιακό Δίδυμο (Digital Twin)** του χώρου του με εργαλεία επιπέδου Canva/Figma.

---

## ΦΑΣΗ 1: Βάση Δεδομένων — Νέες Στήλες & Πίνακες

### 1.1 Επέκταση `floor_plan_tables`
```sql
ALTER TABLE floor_plan_tables 
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'table',
  ADD COLUMN IF NOT EXISTS style text DEFAULT 'outline',
  ADD COLUMN IF NOT EXISTS combinable_with uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS z_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_covers integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_covers integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS table_type text DEFAULT 'standard';
```

### 1.2 Επέκταση `floor_plan_zones`
```sql
ALTER TABLE floor_plan_zones 
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#00E5FF',
  ADD COLUMN IF NOT EXISTS is_reservable boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_party_size integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_party_size integer DEFAULT NULL;
```

---

## ΦΑΣΗ 2: Asset Library Sidebar (Αριστερό Panel)

### 2.1 Νέο αρχείο: `AssetLibrarySidebar.tsx`

**Κατηγορίες Assets:**

#### 🪑 Τραπέζια (Tables)
| Asset | Shape | Default Seats | Default Size |
|-------|-------|---------------|--------------|
| Στρογγυλό 2 ατόμων | round | 2 | 3.5% × 3.5% |
| Στρογγυλό 4 ατόμων | round | 4 | 4.5% × 4.5% |
| Στρογγυλό 6 ατόμων | round | 6 | 5.5% × 5.5% |
| Στρογγυλό 8 ατόμων | round | 8 | 6.5% × 6.5% |
| Στρογγυλό 10 ατόμων | round | 10 | 7.5% × 7.5% |
| Στρογγυλό 12 ατόμων | round | 12 | 8.5% × 8.5% |
| Τετράγωνο 2 ατόμων | square | 2 | 3.5% × 3.5% |
| Τετράγωνο 4 ατόμων | square | 4 | 4.5% × 4.5% |
| Ορθογώνιο 4 ατόμων | rectangle | 4 | 6% × 3.5% |
| Ορθογώνιο 6 ατόμων | rectangle | 6 | 8% × 3.5% |
| Ορθογώνιο 8 ατόμων | rectangle | 8 | 10% × 4% |
| Ψηλό Cocktail (standing) | round | 2 | 2.5% × 2.5% |
| Communal Table (μεγάλο κοινό) | rectangle | 12 | 14% × 4% |

#### 🛋️ Καθίσματα & Booths (Seating)
| Asset | Shape | Default Seats | Default Size |
|-------|-------|---------------|--------------|
| VIP Booth | booth | 6 | 7% × 5% |
| Corner Booth (L-shape) | booth_l | 8 | 7% × 7% |
| U-Shape Booth | booth_u | 10 | 8% × 6% |
| Banquette (μακρύ κάθισμα τοίχου) | rectangle | 4 | 8% × 2.5% |
| Lounge Καναπές | rectangle | 4 | 6% × 3% |
| Σκαμπό Bar | round | 1 | 2% × 2% |

#### 🏗️ Fixtures (Σταθερά Στοιχεία)
| Asset | fixture_type | Seats | Default Size |
|-------|-------------|-------|--------------|
| Bar Counter (ευθύ) | bar | 0 | 20% × 4% |
| Bar Counter (L-shape) | bar_l | 0 | 12% × 12% |
| Bar Counter (U-shape) | bar_u | 0 | 14% × 10% |
| DJ Booth | dj_booth | 0 | 6% × 4% |
| Σκηνή / Stage | stage | 0 | 18% × 8% |
| Host Stand / Υποδοχή | host_stand | 0 | 3% × 3% |
| Κουζίνα (πέρασμα) | kitchen | 0 | 10% × 6% |
| WC / Τουαλέτες | restroom | 0 | 8% × 6% |
| Ταμείο / POS | pos | 0 | 3% × 2% |

#### 🧱 Αρχιτεκτονικά Στοιχεία (Architecture)
| Asset | fixture_type | Default Size |
|-------|-------------|--------------|
| Τοίχος (Wall) | wall | 15% × 0.8% |
| Κολώνα (Column) | column | 1.5% × 1.5% |
| Σκάλες (Stairs) | stairs | 5% × 8% |
| Πόρτα Εισόδου | door | 4% × 1% |
| Πόρτα Εξόδου Κινδύνου | fire_exit | 4% × 1% |
| Παράθυρο | window | 6% × 0.8% |
| Διαχωριστικό / Partition | partition | 8% × 0.8% |
| Φυτό / Ζαρντινιέρα | planter | 2.5% × 2.5% |
| Φράχτης Εξωτερικού | fence | 12% × 0.6% |

### 2.2 Λειτουργία Drag & Drop
- Ο χρήστης **σέρνει** asset από sidebar στον καμβά
- Στο `onDrop` δημιουργείται νέο item στη βάση
- **Collapsible κατηγορίες** με εικονίδια
- **Search bar** στην κορυφή
- **Preview thumbnail** (μικρό SVG) δίπλα σε κάθε asset
- **Recently Used** section (τελευταία 5)

---

## ΦΑΣΗ 3: Properties Panel (Δεξί Panel — Inline Editing)

### 3.1 Νέο αρχείο: `ItemPropertiesPanel.tsx`

Αντικαθιστά το Edit Dialog. Εμφανίζεται **inline** στο δεξί panel.

**Πεδία ανά τύπο:**

#### Για Τραπέζια:
| Πεδίο | Τύπος | Περιγραφή |
|-------|-------|-----------|
| Όνομα (label) | Text Input | π.χ. "T12", "VIP-3" |
| Τύπος | Dropdown | Standard, VIP, Premium, Private |
| Min Covers | Number (1-20) | Ελάχιστα άτομα |
| Max Covers (seats) | Number (1-20) | Μέγιστα άτομα |
| Σχήμα | Visual Picker | Round / Square / Rectangle |
| Ζώνη | Dropdown + Color chip | Επιλογή ή δημιουργία ζώνης |
| Ένωση με... | Multi-select | Τραπέζια που μπορούν να ενωθούν |
| Περιστροφή | Dial slider (0-360°) ή presets | |
| Πλάτος / Ύψος | Sliders (1-30%) | Με live preview |
| Στυλ | Icon picker | Outline / Filled / Glass |
| Χρώμα | Color picker | Custom accent χρώμα |
| VIP | Toggle | Σημαδεύει ως VIP |
| Κλείδωμα | Toggle | Αποτρέπει μετακίνηση |

#### Για Fixtures:
| Πεδίο | Τύπος |
|-------|-------|
| Όνομα | Text Input |
| Τύπος Fixture | Read-only |
| Περιστροφή | Dial / Presets |
| Πλάτος / Ύψος | Sliders |
| Κλείδωμα | Toggle |

#### Actions:
- **Duplicate** — Αντιγραφή (+2% x offset)
- **Delete** — Με confirmation
- **Move to Front / Back** — Z-index
- **Flip H / V** — Για ασύμμετρα items

---

## ΦΑΣΗ 4: Zone Manager

### 4.1 `ZoneManager.tsx`

- **Δημιουργία ζώνης**: Όνομα, χρώμα, επιλογή τραπεζιών
- **Zone Properties**: Reservable on/off, Προτεραιότητα γεμίσματος, Min/Max party size
- **Visual**: Ημιδιαφανή ορθογώνια πίσω από τα τραπέζια
- **Quick assign**: Shift+Click πολλά τραπέζια → "Assign to Zone"

### 4.2 Preset Χρώματα
```
Gold (#FFD700) — VIP / Premium
Cyan (#00E5FF) — Standard / Main 
Emerald (#10B981) — Outdoor / Κήπος
Rose (#F43F5E) — Private Dining
Purple (#8B5CF6) — Lounge / Bar
Amber (#F59E0B) — Cocktail / Standing
Slate (#64748B) — Staff / Non-reservable
```

---

## ΦΑΣΗ 5: Εργαλεία Ακρίβειας Canvas

### 5.1 Smart Guides
- Center-to-center + Edge-to-edge alignment
- Snap threshold: 1.5%
- Dashed γραμμή + απόσταση label

### 5.2 Multi-Select
- Shift+Click, Rubber band selection
- Group move, Align, Distribute, Zone assign, Delete all, Lock/Unlock

### 5.3 Distribution Tools
- Space Evenly Horizontal / Vertical
- Align to Grid

### 5.4 Undo / Redo
- 50 ενέργειες history stack
- Ctrl+Z / Ctrl+Shift+Z

### 5.5 Keyboard Shortcuts
| Shortcut | Ενέργεια |
|----------|----------|
| Delete | Διαγραφή |
| Ctrl+D | Duplicate |
| Ctrl+A | Select All |
| Ctrl+Z / Ctrl+Shift+Z | Undo / Redo |
| Arrows | Move ±1% |
| Shift+Arrows | Move ±5% |
| R | Rotate +45° |
| L | Toggle Lock |
| Escape | Deselect |
| G | Toggle Grid |

---

## ΦΑΣΗ 6: Νέοι SVG Renderers

### Νέα σχήματα στο VenueSVGCanvas:
- **Booth** (ημικυκλικό πίσω + τραπέζι μπροστά)
- **L-Shape Booth** (polygon Γ-σχήμα)
- **Bar Counter** (ευθύ / L / U με inner outline)
- **Column** (γεμάτος κύκλος)
- **Wall** (λεπτή μπάρα)
- **Stage** (rect + curved front)
- **Host Stand** (μικρό rect + circle)
- **Planter** (κυκλικό πράσινο)

### Zone Rendering
- Ημιδιαφανή ορθογώνια (opacity 0.08) πίσω από items
- Label + dashed border

### Badges
- 🔒 Lock icon (γωνία, opacity 0.5)
- ⭐ VIP badge (χρυσό, πάνω-δεξιά)
- Combinable dashed lines (hover/edit mode)

---

## ΦΑΣΗ 7: Live Operational View

### Status Colors:
| Κατάσταση | Χρώμα |
|-----------|-------|
| Διαθέσιμο | Cyan outline |
| Κρατημένο (upcoming) | Κίτρινο fill |
| Καθισμένος | Κόκκινο fill |
| Ετοιμάζεται | Πορτοκαλί fill |
| Η δική μου | Accent fill |
| VIP | Χρυσό border |
| Blocked | Γκρι + strikethrough |

### Table Click Popover:
- Όνομα πελάτη, party size, ώρα, σημειώσεις
- Buttons: [Arrived] [Seated] [Finishing] [Vacated] [Move] [Cancel]

### Auto-suggest:
- Ταίριασμα party_size vs seats + min/max covers
- Φίλτρο κατά ζώνη
- Ταξινόμηση κατά priority
- Highlight 3 καλύτερες επιλογές

### Zone Filtering:
- Chips πάνω από canvas: "Όλα" | "VIP" | "Βεράντα" | "Bar"
- Fade out μη-επιλεγμένες (opacity 0.2)

---

## ΦΑΣΗ 8: 3-Column Layout

```
┌─────────────┬──────────────────────────┬───────────────┐
│ Asset       │                          │ Properties    │
│ Library     │     SVG Canvas           │ Panel         │
│ (240px)     │     (fluid)              │ (280px)       │
│             │                          │               │
│ [Tables]    │     Floor Plan           │ Name: T12     │
│ [Fixtures]  │                          │ Seats: 4      │
│ [Seating]   │                          │ Zone: VIP     │
│ [Arch]      │  [Toolbar above]         │ [Lock] [Del]  │
└─────────────┴──────────────────────────┴───────────────┘
```

### Responsive:
- ≥1280px: 3 στήλες
- 768-1279px: Canvas + collapsible drawers
- <768px: Canvas + floating buttons + bottom sheet

### Toolbar:
```
[Undo] [Redo] | [Grid] [Snap] [Guides] | [Labels] [Ref Image] [Clean View] | [Stats]
```

---

## ΦΑΣΗ 9: Auto-Save & Performance

- **Debounced auto-save** (1.5s)
- **Batch updates** για multi-select
- **Memoized SVG components**
- **RequestAnimationFrame** για drag

---

## Δομή Αρχείων

```
src/components/business/floorplan/
├── FloorPlanEditor.tsx              ← REFACTOR: 3-column orchestrator
├── AssetLibrarySidebar.tsx          ← ΝΕΟ
├── ItemPropertiesPanel.tsx          ← ΝΕΟ
├── ZoneManager.tsx                  ← ΝΕΟ
├── VenueSVGCanvas.tsx               ← ΕΝΙΣΧΥΣΗ
├── SmartGuides.tsx                  ← ΝΕΟ
├── CanvasToolbar.tsx                ← ΝΕΟ
├── FloorPlanAssignmentDialog.tsx    ← ΕΝΙΣΧΥΣΗ
├── TableStatusPopover.tsx           ← ΝΕΟ
├── useFloorPlanHistory.ts           ← ΝΕΟ
├── useSmartGuides.ts                ← ΝΕΟ
├── useDragAndDrop.ts                ← ΝΕΟ
├── constants/
│   ├── assetDefinitions.ts          ← ΝΕΟ
│   └── zonePresets.ts               ← ΝΕΟ
└── svg/
    ├── TableShapes.tsx              ← ΝΕΟ
    ├── FixtureShapes.tsx            ← ΝΕΟ
    ├── ArchitectureShapes.tsx       ← ΝΕΟ
    └── StatusBadges.tsx             ← ΝΕΟ
```

---

## Σύγκριση με Ανταγωνισμό

| Feature | OpenTable | SevenRooms | ResDiary | **FOMO.CY** |
|---------|-----------|------------|----------|-------------|
| Asset Library (40+ items) | ❌ | ⚠️ | ❌ | ✅ |
| Drag & Drop from Library | ❌ | ⚠️ | ❌ | ✅ |
| Smart Guides | ❌ | ❌ | ❌ | ✅ |
| Multi-select + Distribute | ❌ | ⚠️ | ❌ | ✅ |
| Zone Color Coding | ⚠️ | ✅ | ⚠️ | ✅ |
| Combinable Tables | ✅ | ✅ | ⚠️ | ✅ |
| Undo/Redo | ❌ | ❌ | ❌ | ✅ |
| Keyboard Shortcuts | ❌ | ❌ | ❌ | ✅ |
| Live Status Colors | ✅ | ✅ | ✅ | ✅ |
| Auto-suggest Table | ⚠️ | ✅ | ⚠️ | ✅ |
| Inline Properties Panel | ❌ | ⚠️ | ❌ | ✅ |
| Architecture Elements | ❌ | ⚠️ | ❌ | ✅ |
| Auto-save | ❌ | ✅ | ❌ | ✅ |
| Reference Image Tracing | ❌ | ❌ | ❌ | ✅ |
| AI Floor Plan Analysis | ❌ | ❌ | ❌ | ✅ |
| Dark Neon Aesthetic | ❌ | ❌ | ❌ | ✅ |

---

## Σειρά Υλοποίησης

### Sprint 1: Θεμέλια
1. Database migrations
2. Asset definitions
3. AssetLibrarySidebar
4. 3-column layout refactor
5. Drag sidebar → canvas

### Sprint 2: Properties & Zones
6. ItemPropertiesPanel
7. ZoneManager
8. Zone visualization
9. Combinable tables

### Sprint 3: Precision & UX
10. Smart Guides
11. Multi-select
12. Distribution tools
13. Undo/Redo
14. Keyboard shortcuts
15. Auto-save

### Sprint 4: SVG Shapes
16. Booth shapes
17. Bar shapes
18. Architecture shapes
19. Status badges

### Sprint 5: Live Operations
20. Status color system
21. TableStatusPopover
22. Auto-suggest
23. Zone filtering
24. Realtime updates
