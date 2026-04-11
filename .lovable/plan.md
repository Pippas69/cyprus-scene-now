

## Plan: Fix fullscreen seat selector not showing on mobile

### Problem
The `FullscreenSeatSelector` uses `position: fixed` but it's rendered inside a component tree where framer-motion's `AnimatePresence` applies CSS `transform` on page transitions. When any ancestor has `transform`, `position: fixed` becomes relative to that ancestor instead of the viewport — so the overlay is either clipped or positioned incorrectly and invisible.

### Fix (single file: `src/components/theatre/FullscreenSeatSelector.tsx`)

Wrap the fullscreen overlay in a **React Portal** (`createPortal`) that renders directly into `document.body`, bypassing all parent CSS contexts.

```tsx
import { createPortal } from 'react-dom';

// Wrap the return in a portal:
return createPortal(
  <div className="fixed inset-0 z-[60] bg-background flex flex-col" style={{ height: '100dvh' }}>
    {/* ...existing header, seat map, footer... */}
  </div>,
  document.body
);
```

### What stays the same
- All props, translations, header/footer layout — unchanged
- `ShowInstanceEditor.tsx` and `TicketPurchaseFlow.tsx` — no changes needed
- All seat map internals — untouched

### Result
The fullscreen overlay will always render on top of everything, regardless of parent transforms from framer-motion or other CSS contexts.

