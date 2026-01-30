
## What’s actually happening (based on code + your answers)

- You are on **iOS**.
- The file you download from the preview modal is **not animated** (it plays as a still).
- Instagram Story editor shows a **still frame**.

That means the issue is **not Instagram stripping animation**. The issue is earlier: **we are producing a “video” that effectively contains identical frames (or a 0–1 frame video)** on iOS.

## Most likely root causes in the current implementation

### A) FFmpeg is only encoding one frame (or not reading the frame sequence correctly)
In `src/lib/storyVideoGenerator.ts`, we write frames `frame0000.png … frame0089.png`, but when encoding we call:

- `-i frame%04d.png` without explicitly telling FFmpeg where to start (`-start_number 0`)
- On some FFmpeg builds / demuxer behavior, **it may start at 1** (expecting `frame0001.png`) or behave unexpectedly when frame numbering starts at 0.
Result: it can end up encoding only a single frame (or failing silently in wasm), producing an MP4 that “plays” but doesn’t change.

### B) We are not verifying that frames differ before encoding
We currently generate 90 PNG blobs but do not validate whether they’re identical (e.g., due to iOS canvas quirks, timing, or a subtle bug).

### C) The share step may fall back to “text-only share” in some cases
In `shareStoryFile()` (useSimpleShare), we include `{ files: [file], title, url }`.
On iOS, `navigator.canShare()` can return false if `url` is included with certain file types. In that case we fallback to text-only share (no file).  
However: you said Instagram opens the Story editor with a still background, so you are likely sharing *a file*, but we’ll harden this anyway.

## The fix (implementation)

### 1) Make FFmpeg read the full sequence reliably
Update `generateStoryVideo()` encoding command to include:
- `-start_number 0`
- optionally `-vcodec libx264` + `-r 30` explicitly, and ensure duration is right

Example direction:
- `-framerate 30`
- `-start_number 0`
- `-i frame%04d.png`
- `-t 3` (optional, but helps enforce duration)
- `-pix_fmt yuv420p`
- `-movflags +faststart`

This is the single most important change for “only first frame” bugs.

### 2) Add “frame-difference verification” before encoding (debug + safety)
During generation we will:
- sample a few frames (e.g., frame 0, frame 10, frame 20, frame last)
- compute a quick hash / checksum from their bytes
- if they’re all identical, we log a clear error and fallback to a known-working path.

This will prevent shipping a “fake video” silently and give us clear console output.

### 3) Make the animation unmistakable in the exported video
Increase the animation amplitude inside `storyVideoGenerator.ts` so even Instagram’s rendering and iOS playback make it obvious:
- rotation: ±3° → ±6–8°
- floatY: ±15px → ±35–45px
- add subtle x drift (currently preview has x drift but exported video does not)
- increase background hue shift/opacity a bit

This removes any doubt that “it is moving but too subtle”.

### 4) Fix iOS sharing compatibility (avoid canShare false)
In `shareStoryFile()`:
- When sharing a file, build the share payload as **files + title only** (no `url`).
- If we want the link included, put it in `text` only when not attaching files, or provide a “Copy link” UX separately (which you already have).

This prevents iOS from downgrading the share (and ensures the actual MP4 is sent).

### 5) Ensure the preview modal plays the generated MP4 (so you can confirm before sharing)
Right now `StoryPreviewModal` always renders an `<img src={imageUrl} />` even when `isVideo === true`.
That means:
- you cannot visually confirm the MP4 is animated in-app
- and you might think it’s working when it isn’t

We will update `StoryPreviewModal`:
- If `isVideo`, render a `<video src={blobUrl} autoPlay loop muted playsInline />`
- If not, render `<img />`

This is critical: you should see the exported video moving before tapping Share.

## Files that will be changed

1) `src/lib/storyVideoGenerator.ts`
- add x drift animation
- increase amplitudes
- add frame checksum validation
- update ffmpeg command with `-start_number 0` and stronger encoding args

2) `src/hooks/useSimpleShare.ts`
- adjust `shareStoryFile()` so sharing files on iOS doesn’t include `url` (avoid canShare failures)

3) `src/components/sharing/StoryPreviewModal.tsx`
- show `<video>` when `isVideo` so you can verify it’s truly animated
- keep existing loading/progress UI

## How we’ll confirm it’s fixed (end-to-end)

On iPhone:
1) Tap Instagram Stories
2) In preview modal, you must see the video moving (autoplay loop)
3) Tap Download → open Photos → confirm it plays and moves
4) Tap Share → choose Instagram → confirm Story editor shows moving background

If step (2) fails, we know generation is still wrong and we’ll have frame hashes + logs to pinpoint why.
