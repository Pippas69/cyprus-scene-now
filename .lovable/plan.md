
# Plan: Fix Instagram Stories Image Format (9:16)

## The Problem
Currently, when sharing to Instagram Stories, the system sends the original event/offer cover image which is in **horizontal format (16:9)**. Instagram Stories requires **vertical format (9:16 / 1080x1920px)**, causing the image to appear zoomed, cropped, or misaligned.

## The Solution
Create a Stories-optimized image generator that transforms any image into a properly formatted vertical Story image.

---

## How It Will Work

When a user taps "Instagram Stories", the system will:
1. Fetch the original image
2. Create a vertical 9:16 canvas (1080x1920px)
3. Add a blurred version of the image as background
4. Center the original image in the middle (maintaining aspect ratio)
5. Add event/offer details as text overlay at the bottom
6. Add ΦΟΜΟ branding/watermark
7. Share the formatted image via native share

---

## Visual Result

```text
┌────────────────────┐
│                    │
│  ┌──────────────┐  │  ← Blurred background
│  │              │  │
│  │   Original   │  │  ← Centered image
│  │    Image     │  │     (aspect ratio preserved)
│  │              │  │
│  └──────────────┘  │
│                    │
│  ━━━━━━━━━━━━━━━━  │
│  Event Title       │  ← Text overlay
│  📍 Location       │
│  🗓️ Date & Time    │
│                    │
│        ΦΟΜΟ        │  ← Branding
└────────────────────┘
       1080x1920
```

---

## Technical Details

### New File: `src/lib/storyImageGenerator.ts`

Creates a utility function that:
- Takes the original image URL, title, subtitle, and optional event details
- Uses HTML Canvas API to compose the story image
- Returns a File object ready for native share

**Key logic:**
```typescript
export const generateStoryImage = async (
  imageUrl: string,
  title: string,
  subtitle?: string,
  details?: { date?: string; location?: string }
): Promise<File> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  
  // 1. Draw blurred background
  // 2. Draw centered image with proper sizing
  // 3. Add gradient overlay for text readability
  // 4. Draw title, subtitle, and details
  // 5. Add ΦΟΜΟ branding
  
  return new File([blob], 'story.jpg', { type: 'image/jpeg' });
};
```

### Modified: `src/hooks/useSimpleShare.ts`

Update `shareToInstagramStories()` to:
1. Import and use the new `generateStoryImage` function
2. Pass event/offer details for text overlay
3. Share the formatted image instead of the original

### Modified: `src/components/sharing/SimpleShareSheet.tsx`

Pass additional context (date, location, business name) to the share handler for the text overlay.

---

## Design Decisions

1. **Blurred background**: Uses a scaled-up, blurred version of the same image for cohesive look
2. **Text overlay**: Keeps essential info visible without opening the link
3. **ΦΟΜΟ branding**: Subtle watermark for attribution
4. **Font choices**: Using system fonts for reliability across devices
5. **Color scheme**: White text with dark gradient overlay for readability

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/storyImageGenerator.ts` | **Create** - Canvas-based image generator |
| `src/hooks/useSimpleShare.ts` | **Modify** - Use generator in Stories share |
| `src/components/sharing/SimpleShareSheet.tsx` | **Modify** - Pass event details to handler |

