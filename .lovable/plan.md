
# Fix: Instagram Story Preview Animation Not Visible

## Problem Identified

The animation code is working (confirmed by session replay showing CSS transforms updating), but **the visual effect is not noticeable** due to two issues:

1. **Container clipping**: The `overflow-hidden` class on parent containers is clipping the animation when the image rotates/moves
2. **Animation too subtle**: The current values (±3° rotation, ±12px movement) are barely perceptible

---

## Solution

### 1. Add Overflow Padding to Prevent Clipping

Wrap the animated image in a container with padding that gives room for the rotation and movement:

```text
Current:
┌─────────────────────┐
│ ┌─────────────────┐ │  ← overflow-hidden clips rotation
│ │     Image       │ │
│ └─────────────────╯ │
└─────────────────────┘

Fixed:
┌─────────────────────┐
│    ╭───────────╮    │  ← padding allows rotation to be visible
│    │   Image   │    │
│    ╰───────────╯    │
└─────────────────────┘
```

### 2. Increase Animation Intensity

Make the effect more noticeable:

| Property | Current | New |
|----------|---------|-----|
| Rotation | ±3° | ±5° |
| Y-Float | ±12px | ±18px |
| X-Drift | ±4px | ±8px |
| Scale | 0.99-1.01 | 0.98-1.02 |

### 3. Add Shadow Animation

Add a dynamic shadow that changes with the movement to enhance the 3D effect (like Spotify does):

```text
boxShadow: ["0 20px 40px rgba(0,0,0,0.3)", "0 30px 50px rgba(0,0,0,0.4)"]
```

---

## Technical Changes

### File: `src/components/sharing/StoryPreviewModal.tsx`

1. **Add overflow padding container** around the animated elements
2. **Increase animation values** for more pronounced effect
3. **Add animated shadow** for depth perception
4. **Scale down image slightly** to ensure rotation doesn't get clipped

---

## Expected Result

After implementation, the Story preview will have a clearly visible, premium floating animation similar to Spotify's share preview - the image will gently sway, rotate, and appear to "breathe" with a dynamic shadow effect.
