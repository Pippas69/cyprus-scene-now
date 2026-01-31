/**
 * Shared rendering for Story top image area.
 * Goal: keep the wave overlay, but NEVER crop the image on top/left/right.
 *
 * Approach:
 * 1) Draw a blurred "cover" background (can crop) so the top area always feels filled.
 * 2) Draw the main image as crisp "contain" (no crop) top-aligned, centered horizontally.
 * 3) Clip everything to the top image region; the wave is drawn later on top.
 */

export type DrawTopImageOptions = {
  canvasWidth: number;
  imageHeight: number;
  /** Fallback fill behind everything (e.g., navy). */
  backgroundFill?: string;
  /** Blur amount for the background layer. */
  backgroundBlurPx?: number;
  /** Optional darken overlay on the background layer for legibility. */
  backgroundDarken?: number; // 0..1
};

const drawCoverBackground = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  imageHeight: number
) => {
  const imgRatio = img.width / img.height;
  const targetRatio = canvasWidth / imageHeight;

  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  // Cover: fill entire region, cropping allowed.
  if (imgRatio > targetRatio) {
    // Wider than target: fit height, crop sides.
    drawH = imageHeight;
    drawW = imageHeight * imgRatio;
    drawX = (canvasWidth - drawW) / 2;
    drawY = 0;
  } else {
    // Taller than target: fit width, crop top/bottom.
    drawW = canvasWidth;
    drawH = canvasWidth / imgRatio;
    drawX = 0;
    drawY = (imageHeight - drawH) / 2;
  }

  ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
};

const drawContainForegroundTopAligned = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  imageHeight: number
) => {
  // Contain: no cropping. Top-aligned (so the top of the image is always visible).
  const scale = Math.min(canvasWidth / img.width, imageHeight / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = (canvasWidth - drawW) / 2;
  const drawY = 0;

  ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
};

export const drawTopImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  {
    canvasWidth,
    imageHeight,
    backgroundFill,
    backgroundBlurPx = 18,
    backgroundDarken = 0.25,
  }: DrawTopImageOptions
) => {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clip to the image region so nothing bleeds past the wave area
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, imageHeight);
  ctx.clip();

  if (backgroundFill) {
    ctx.fillStyle = backgroundFill;
    ctx.fillRect(0, 0, canvasWidth, imageHeight);
  }

  // Background layer: blurred cover (cropping allowed)
  ctx.save();
  ctx.filter = `blur(${backgroundBlurPx}px)`;
  drawCoverBackground(ctx, img, canvasWidth, imageHeight);
  ctx.filter = 'none';
  ctx.restore();

  if (backgroundDarken > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${backgroundDarken})`;
    ctx.fillRect(0, 0, canvasWidth, imageHeight);
  }

  // Foreground: crisp contain, top-aligned (no crop)
  drawContainForegroundTopAligned(ctx, img, canvasWidth, imageHeight);

  ctx.restore();
};
