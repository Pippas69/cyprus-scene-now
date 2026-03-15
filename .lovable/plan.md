

# Interactive Blueprint Engine — Venue Layout Architect

## Problem
The current AI auto-detection (`analyze-floor-plan`) produces inaccurate layouts because vision AI isn't CAD-precise. The hardcoded `hasBlueprintSignature` in `VenueSVGCanvas` only works for one specific venue. Businesses need a way to create architecturally accurate, fully interactive floor plans from any venue screenshot.

## Strategy Change
**From**: "Upload screenshot → AI guesses everything → hope it's accurate"
**To**: "Upload screenshot → AI gives rough starting positions → user refines on top of reference image → export clean vector plan"

The screenshot becomes a **tracing layer** (adjustable opacity) that the business owner uses to drag elements into exact positions. Once satisfied, they toggle off the image and keep only the clean SVG.

## Changes

### 1. Store Reference Image Temporarily
- Store the uploaded image in file storage under `floor-plan-references/{businessId}.png`
- Save the storage URL in `floor_plan_zones.metadata.reference_image_url`
- The image is only used during editing — never shown to customers
- Add a "Delete reference image" button once layout is finalized

### 2. FloorPlanEditor — Reference Image Overlay
- After AI analysis, show the uploaded image as a background layer behind the SVG canvas
- Add an **opacity slider** (0–100%) so the user can see through the image while positioning elements
- Add a toggle button (Eye icon) to show/hide the reference image
- The image uses `position: absolute; inset: 0; object-fit: contain` behind the SVG layer

### 3. FloorPlanEditor — Precision Tools
- **Grid snapping**: Optional snap-to-grid (e.g. 2% increments) toggled by a magnet icon
- **Rotation**: Add `rotation` field to `floor_plan_tables` (0, 45, 90, 135, 180, 225, 270, 315 degrees). Apply via SVG `transform="rotate()"` on each element
- **Alignment buttons**: Select multiple items → align horizontally/vertically (distribute evenly)
- **Resize handles**: When an element is selected, show drag handles to adjust width/height

### 4. Database Migration
- Add `rotation` column (integer, default 0) to `floor_plan_tables`
- Add `width_percent` and `height_percent` columns to `floor_plan_tables` (currently stored only in zone metadata bbox maps — moving them to each row gives per-item control)

### 5. VenueSVGCanvas — Remove Hardcoded Blueprint
- Remove `hasBlueprintSignature`, `BLUEPRINT_TABLES`, `BLUEPRINT_FIXTURES`, and `ArchitecturalWalls` hardcoded geometry
- ALL venues use the same dynamic system: each item's position, size, and rotation come from its database row
- The architectural walls become optional decorative elements the user can toggle, not hardcoded coordinates
- Apply `rotation` via SVG `transform` attribute on each `<g>` element

### 6. FloorPlanEditor — Improved Drag UX
- Show coordinates while dragging (tooltip with x%, y%)
- Highlight snap guides when elements align with others
- Multi-select (Shift+click) for batch operations

### 7. Clean View Export
- "Clean View" toggle: hides reference image, shows only the vector floor plan
- This is the default view in `FloorPlanAssignmentDialog` (reservation placement)
- The reference image is never visible outside the editor

### 8. Storage Bucket
- Create `floor-plan-references` storage bucket (private, RLS: only business owner can read/write)

## Implementation Order
1. Database migration (add `rotation`, `width_percent`, `height_percent` to `floor_plan_tables`) + storage bucket
2. Remove hardcoded blueprint geometry from `VenueSVGCanvas`, use per-row dimensions
3. Add reference image upload/display/opacity in `FloorPlanEditor`
4. Add rotation controls and grid snapping
5. Add alignment tools and resize handles
6. Clean View toggle and image deletion

## What Stays the Same
- AI analysis still runs as a **starting point** — it gives rough positions that the user refines
- `FloorPlanAssignmentDialog` works the same (it already reads from DB and renders via `VenueSVGCanvas`)
- The neon/dark theme aesthetic is preserved
- All reservation assignment logic stays unchanged

