# Memory: features/map/business-pin-visual-hierarchy-v5-0-el
Updated: now

Business pins on the map reflect subscription status through a visual hierarchy of size, shape, and color:
- **Free** (16px, Ocean Blue #3D6B99): Standard teardrop shape, smallest, slightly muted opacity, no glow.
- **Basic** (24px, Cyan #06b6d4): Standard teardrop shape, larger than Free, matches subscription color.
- **Pro** (32px, Coral/Orange #f97316): **Premium diamond/shield shape**, larger, subtle orange glow for differentiation.
- **Elite** (38px, Purple #8b5cf6): **Premium diamond/shield shape**, largest (but not huge), premium purple glow, **slow subtle pulse animation** for distinction.

**Click Behavior**: When any pin is clicked, the map automatically zooms to the business location (flyTo zoom 15), centers on it, and displays the popup after 500ms.

Pins are rendered with z-index based on plan tier (Elite=40, Pro=30, Basic=20, Free=10), ensuring higher tiers are never obscured by lower ones.

The map is identical for both user (`/xartis`) and business (`/dashboard-business/map`) views - both use the same `Xartis` component.
