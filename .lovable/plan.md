
# Plan: Add Instagram Stories & Social Media Share Buttons

## Summary
Add dedicated social media sharing buttons to the share sheet, including an Instagram Stories option that guides users through the native share flow with images.

---

## How It Will Work

The share sheet will be updated to include a row of social media icons before the main action buttons. On mobile, when users tap the "Instagram Stories" button, the system will trigger the native share with an image file attached - which shows Instagram Stories as a sharing destination.

---

## Technical Details

### Files to Modify

**1. `src/components/sharing/SimpleShareSheet.tsx`**
- Add a horizontal row of social media buttons between the image preview and the main action buttons
- Include buttons for:
  - **Instagram Stories** - Triggers native share with image (Instagram Stories appears as destination on iOS/Android)
  - **WhatsApp** - Opens WhatsApp directly with the share link
  - **Messenger** - Opens Facebook Messenger with the share link
- Add translations for new button labels

**2. `src/hooks/useSimpleShare.ts`**
- Add new functions:
  - `shareToInstagramStories()` - Triggers native share with image file specifically for Stories
  - `shareToWhatsApp()` - Opens WhatsApp share URL
  - `shareToMessenger()` - Opens Messenger share URL
- Track these as distinct channels in analytics (`instagram_stories`, `whatsapp`, `messenger`)

### UI Layout

```text
┌────────────────────────────────────┐
│         Κοινοποίηση            [X] │
├────────────────────────────────────┤
│   ┌────────────────────────────┐   │
│   │     Image Preview          │   │
│   │     with title overlay     │   │
│   └────────────────────────────┘   │
│                                    │
│   ┌──────┐ ┌──────┐ ┌──────┐       │
│   │  IG  │ │  WA  │ │  FB  │       │
│   │Stories│ │      │ │Msgr │       │
│   └──────┘ └──────┘ └──────┘       │
│                                    │
│   ┌───────────────────────────┐    │
│   │      Copy Link            │    │
│   └───────────────────────────┘    │
│   ┌───────────────────────────┐    │
│   │      More Options         │    │
│   └───────────────────────────┘    │
└────────────────────────────────────┘
```

### Important Notes

1. **Instagram Stories Limitation**: From web browsers, we cannot open Instagram Stories directly. Instead, we trigger the native share with an image file - the OS share sheet will show "Instagram Stories" as a destination on mobile devices.

2. **Desktop Behavior**: On desktop, the Instagram Stories button will show a tooltip explaining it's mobile-only, while WhatsApp and Messenger buttons will open web versions.

3. **Analytics Tracking**: Each button click will be tracked with its specific channel for business analytics.

