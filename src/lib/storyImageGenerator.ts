/**
 * Generates a 9:16 vertical image optimized for Instagram Stories
 * AEGEAN NIGHT GLOW theme with SPLIT LAYOUT:
 *   - Top: Crisp image (no blur)
 *   - Middle: Wavy divider
 *   - Bottom: Navy panel with seafoam accents
 */

import { drawTopImage } from '@/lib/story/drawTopImage';

interface StoryImageOptions {
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  /** Price info (e.g., "€15" or "Δωρεάν") */
  price?: string;
  /** Discount percentage (e.g., "30%") */
  discountPercent?: string;
  /** Category or event type */
  category?: string;
}

// Brand colors
const AEGEAN_NAVY = '#0D3B66';
const SEAFOAM_TEAL = '#4ECDC4';
const OCEAN_BLUE = '#3D6B99';

/**
 * Load an image from URL and return as HTMLImageElement
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

/**
 * Draw the image in the top portion.
 * Keeps the wave overlay, but prevents top/left/right cropping by drawing
 * the crisp image as "contain" over a blurred "cover" background.
 */
const drawTopStoryImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  imageHeight: number
) => {
  drawTopImage(ctx, img, {
    canvasWidth,
    imageHeight,
    backgroundFill: AEGEAN_NAVY,
    backgroundBlurPx: 18,
    backgroundDarken: 0.2,
  });

  // Add a subtle gradient at the bottom edge for smooth transition to wave
  const edgeGradient = ctx.createLinearGradient(0, imageHeight - 100, 0, imageHeight);
  edgeGradient.addColorStop(0, 'rgba(13, 59, 102, 0)');
  edgeGradient.addColorStop(1, 'rgba(13, 59, 102, 0.7)');
  ctx.fillStyle = edgeGradient;
  ctx.fillRect(0, imageHeight - 100, canvasWidth, 100);
};

/**
 * Draw the wavy divider between image and text panel
 */
const drawWaveDivider = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  waveY: number
) => {
  const amplitude = 30;
  const wavelength = canvasWidth / 2;

  ctx.beginPath();
  ctx.moveTo(0, waveY);

  // Draw a smooth sine wave
  for (let x = 0; x <= canvasWidth; x += 5) {
    const y = waveY + Math.sin((x / wavelength) * Math.PI * 2) * amplitude;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(canvasWidth, waveY + 200);
  ctx.lineTo(0, waveY + 200);
  ctx.closePath();

  // Fill with navy
  ctx.fillStyle = AEGEAN_NAVY;
  ctx.fill();

  // Seafoam glow line on top of wave
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, waveY);
  for (let x = 0; x <= canvasWidth; x += 5) {
    const y = waveY + Math.sin((x / wavelength) * Math.PI * 2) * amplitude;
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = SEAFOAM_TEAL;
  ctx.lineWidth = 3;
  ctx.shadowColor = SEAFOAM_TEAL;
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.restore();
};

/**
 * Draw the bottom navy panel
 */
const drawBottomPanel = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  panelTop: number
) => {
  ctx.fillStyle = AEGEAN_NAVY;
  ctx.fillRect(0, panelTop, canvasWidth, canvasHeight - panelTop);
};

/**
 * Draw text content on the bottom panel
 */
const drawTextContent = (
  ctx: CanvasRenderingContext2D,
  options: StoryImageOptions,
  canvasWidth: number,
  startY: number
) => {
  const centerX = canvasWidth / 2;
  const padding = 60;
  ctx.textAlign = 'center';

  let currentY = startY;

  // Category badge
  if (options.category) {
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = SEAFOAM_TEAL;
    ctx.fillText(options.category.toUpperCase(), centerX, currentY);
    currentY += 50;
  }

  // Title (large, white)
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const titleLines = wrapText(ctx, options.title, canvasWidth - padding * 2);
  titleLines.forEach((line) => {
    ctx.fillText(line, centerX, currentY);
    currentY += 64;
  });

  currentY += 10;

  // Subtitle (business name)
  if (options.subtitle) {
    ctx.font = '500 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(options.subtitle, centerX, currentY);
    currentY += 50;
  }

  // Price/Discount badge
  if (options.discountPercent || options.price) {
    const badgeText = options.discountPercent
      ? `🔥 ${options.discountPercent} OFF`
      : `💰 ${options.price}`;

    // Draw pill background
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const pillWidth = textWidth + 40;
    const pillHeight = 48;
    const pillX = centerX - pillWidth / 2;
    const pillY = currentY - 32;

    // Seafoam glow pill
    ctx.save();
    ctx.shadowColor = SEAFOAM_TEAL;
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(78, 205, 196, 0.25)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 24);
    ctx.fill();
    ctx.restore();

    // Pill border
    ctx.strokeStyle = SEAFOAM_TEAL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 24);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badgeText, centerX, currentY);
    currentY += 60;
  }

  // Location
  if (options.location) {
    ctx.font = '400 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(`📍 ${options.location}`, centerX, currentY);
    currentY += 40;
  }

  // Date
  if (options.date) {
    ctx.font = '400 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(`🗓️ ${options.date}`, centerX, currentY);
    currentY += 40;
  }

  return currentY;
};

/**
 * Draw ΦΟΜΟ branding at the very bottom
 */
const drawBranding = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
) => {
  const brandY = canvasHeight - 90;
  const centerX = canvasWidth / 2;

  // Subtle divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(canvasWidth * 0.25, brandY - 50);
  ctx.lineTo(canvasWidth * 0.75, brandY - 50);
  ctx.stroke();

  // ΦΟΜΟ
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('ΦΟΜΟ', centerX, brandY);

  // fomo.com.cy
  ctx.font = '300 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = SEAFOAM_TEAL;
  ctx.fillText('fomo.com.cy', centerX, brandY + 34);
};

/**
 * Wrap text to fit within maxWidth
 */
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  // Max 2 lines with ellipsis on last line if truncated
  if (lines.length > 2) {
    const truncatedLines = lines.slice(0, 2);
    truncatedLines[1] = truncatedLines[1].slice(0, -3) + '...';
    return truncatedLines;
  }

  return lines;
};

/**
 * Generate a Story-optimized image (1080x1920, 9:16 aspect ratio)
 * Uses Aegean Night Glow theme with split layout
 */
export const generateStoryImage = async (
  imageUrl: string,
  options: StoryImageOptions
): Promise<File> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Layout constants
  const imageHeight = canvas.height * 0.48; // Top 48% for image
  const waveY = imageHeight - 30;
  const panelTop = waveY + 30;
  const textStartY = panelTop + 80;

  // 1. Fill background with navy first (in case image doesn't cover)
  ctx.fillStyle = AEGEAN_NAVY;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Load and draw the crisp top image
  const img = await loadImage(imageUrl);
  drawTopStoryImage(ctx, img, canvas.width, imageHeight);

  // 3. Draw the wave divider
  drawWaveDivider(ctx, canvas.width, waveY);

  // 4. Draw bottom panel
  drawBottomPanel(ctx, canvas.width, canvas.height, panelTop);

  // 5. Draw text content
  drawTextContent(ctx, options, canvas.width, textStartY);

  // 6. Draw branding
  drawBranding(ctx, canvas.width, canvas.height);

  // Convert to blob and return as File (PNG for best quality)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'fomo-story.png', {
            type: 'image/png',
            lastModified: Date.now(),
          });
          resolve(file);
        } else {
          reject(new Error('Failed to generate story image'));
        }
      },
      'image/png'
    );
  });
};
