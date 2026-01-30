
# Spotify-Style Animated Instagram Story Preview

## Understanding the Request

You want the Instagram Story preview to have the same "cool" animated visual effect as Spotify's song share feature. Based on the session replay data I can see (with CSS transforms including `rotate()` and `translateY()`), this involves:

- **Floating elements** that gently drift up and down
- **Subtle rotation** creating a 3D parallax-like effect
- **Continuous, smooth animation** that makes the preview feel "alive"

---

## Current State vs. Desired State

### Currently
The `StoryPreviewModal` shows a **static image** with basic fade-in animation when the preview loads.

### Desired (Spotify-style)
An **animated, living preview** where:
- The Story card gently rotates back and forth (±3-5 degrees)
- Elements float up and down with slight offset
- Background has subtle movement/parallax
- Creates a premium, dynamic feel before sharing

---

## Implementation Plan

### 1. Create Animated Story Preview Component
A new component that wraps the static Story image with Framer Motion animations:

**Animations to implement:**
- **Card rotation**: Gentle oscillation between -4° and +4°
- **Vertical float**: Subtle up/down movement (±15-20px)
- **Background parallax**: Slower, opposite movement for depth
- **Scale breathing**: Very subtle 0.98-1.02 scale pulse

```text
┌─────────────────────────────┐
│     ╭─────────────────╮     │ ← Background layer (slower parallax)
│     │                 │     │
│     │  ╭───────────╮  │     │ ← Story card (floating + rotating)
│     │  │  Image    │  │     │
│     │  │  + Text   │  │     │
│     │  ╰───────────╯  │     │
│     │                 │     │
│     ╰─────────────────╯     │
│                             │
│  [Download]     [Share]     │ ← Buttons remain static
└─────────────────────────────┘
```

### 2. Update StoryPreviewModal
Replace the static `<img>` with the new animated wrapper:

- Wrap the Story image in a motion container
- Apply continuous looping animations
- Keep the modal structure and buttons unchanged

### 3. Animation Configuration (Spotify-like feel)

```text
Rotation:     rotate(-3°) ←→ rotate(3°)   [4 second cycle]
Y-Translate:  -15px ←→ 15px               [3 second cycle]
X-Translate:  -5px ←→ 5px                 [5 second cycle, offset]
Scale:        0.99 ←→ 1.01                [6 second cycle, subtle]
```

The different cycle durations create organic, non-repetitive movement (similar to how Spotify does it).

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/sharing/StoryPreviewModal.tsx` | Add Framer Motion animated wrapper with continuous floating/rotation animations around the preview image |

### Animation Implementation

Using Framer Motion's `animate` prop with `transition: { repeat: Infinity, repeatType: "mirror" }`:

- **Primary motion**: Rotation + Y-translate on main container
- **Secondary motion**: Slight X-translate with phase offset
- **Tertiary motion**: Very subtle scale "breathing"

The animations will be smooth and buttery using `ease: "easeInOut"` with staggered durations to prevent mechanical repetition.

---

## Summary

This creates the same "living" feel as Spotify's song share where the content appears to float and gently sway, making the share preview feel premium and engaging before the user taps Share or Download.
