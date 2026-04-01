

# Fix Row Letter Ordering in Zone Detail View

## The Issue
The row labels are appearing in wrong order. The correct order from outermost (farthest from stage) to innermost (nearest to stage) should be:

**Outer section:** Σ → Ρ → Π → Ο → Ξ → Ν → Μ → Λ → Κ
**[GAP]**
**Inner section:** Ι → Θ → Η → Ζ → Ε → Δ → Γ → Β → Α

This means Σ gets the **largest radius** (outermost) and Α gets the **smallest radius** (closest to stage).

## Root Cause
The `rowGroups` sort currently sorts by ascending ROW_ORDER index (Α=0 first), which assigns Α the smallest radius. This part is actually correct geometrically — but the visual rendering on the horseshoe arcs (which point upward on screen for most zones) may be displaying them inverted compared to what's expected.

## Fix — `src/components/theatre/ZoneSeatPicker.tsx`

1. **Reverse the row rendering order** so that within each section, rows render from outermost to innermost (Σ at the largest radius down to Α at the smallest), matching the user's expected visual top-to-bottom reading order
2. Ensure the **section split** is correctly between Κ (last outer row) and Ι (first inner row) — the gap separates these two groups
3. Verify the radius assignment: outermost rows (Σ side) get larger radii, innermost rows (Α side) get smaller radii, with the SECTION_GAP between Κ and Ι

This is a sort-order and radius-assignment fix in the existing `rowLayouts` and `rowGroups` memos. No structural changes needed.

