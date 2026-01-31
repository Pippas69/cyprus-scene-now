/**
 * Generates a 9:16 vertical image optimized for Instagram Stories - Business Profile variant
 * AEGEAN NIGHT GLOW theme with SPLIT LAYOUT:
 *   - Top: Crisp cover image (no blur)
 *   - Middle: Wavy divider with seafoam glow
 *   - Bottom: Navy panel with logo, name, and "Follow us on ΦΟΜΟ" CTA
 */

import { drawTopImage } from '@/lib/story/drawTopImage';

interface BusinessStoryOptions {
  name: string;
  category?: string;
  location?: string;
  /** Logo URL for brand presence */
  logoUrl?: string | null;
}

// Brand colors
const AEGEAN_NAVY = '#0D3B66';
const SEAFOAM_TEAL = '#4ECDC4';

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
 * Draw the cover image in the top portion.
 * Keeps the wave overlay, but prevents top/left/right cropping by drawing
 * the crisp image as "contain" over a blurred "cover" background.
 */
const drawTopBusinessCover = (
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
    backgroundDarken: 0.18,
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
  const amplitude = 35;
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
  ctx.shadowBlur = 20;
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
 * Draw circular logo centered in the bottom panel
 */
const drawLogo = async (
  ctx: CanvasRenderingContext2D,
  logoUrl: string,
  canvasWidth: number,
  logoY: number
): Promise<void> => {
  try {
    const logo = await loadImage(logoUrl);

    const logoSize = 180;
    const logoX = canvasWidth / 2;

    // White circle background
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoSize / 2 + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
    ctx.restore();

    // Circular clip for logo
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw logo to fill the circle
    const logoRatio = logo.width / logo.height;
    let drawW: number, drawH: number;
    if (logoRatio > 1) {
      drawH = logoSize;
      drawW = drawH * logoRatio;
    } else {
      drawW = logoSize;
      drawH = drawW / logoRatio;
    }
    ctx.drawImage(logo, logoX - drawW / 2, logoY - drawH / 2, drawW, drawH);
    ctx.restore();

    // Seafoam ring around logo
    ctx.strokeStyle = SEAFOAM_TEAL;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  } catch {
    console.warn('Failed to load logo for business story');
  }
};

/**
 * Draw business info (category, name, location)
 */
const drawBusinessInfo = (
  ctx: CanvasRenderingContext2D,
  options: BusinessStoryOptions,
  canvasWidth: number,
  startY: number
) => {
  const centerX = canvasWidth / 2;
  ctx.textAlign = 'center';

  let currentY = startY;

  // Category badge
  if (options.category) {
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = SEAFOAM_TEAL;
    ctx.fillText(options.category.toUpperCase(), centerX, currentY);
    currentY += 50;
  }

  // Business name (large, white)
  ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const nameLines = wrapText(ctx, options.name, canvasWidth - 100);
  nameLines.forEach((line) => {
    ctx.fillText(line, centerX, currentY);
    currentY += 66;
  });

  currentY += 10;

  // Location
  if (options.location) {
    ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`📍 ${options.location}`, centerX, currentY);
    currentY += 44;
  }

  return currentY;
};

/**
 * Draw "Follow us on ΦΟΜΟ" CTA and branding
 */
const drawFollowCTA = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
) => {
  const centerX = canvasWidth / 2;
  const ctaY = canvasHeight - 180;

  // Decorative line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(canvasWidth * 0.2, ctaY - 40);
  ctx.lineTo(canvasWidth * 0.8, ctaY - 40);
  ctx.stroke();

  // "Follow us on" text
  ctx.font = '400 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('Follow us on', centerX, ctaY);

  // ΦΟΜΟ (large, bold)
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('ΦΟΜΟ', centerX, ctaY + 52);

  // fomo.com.cy
  ctx.font = '300 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = SEAFOAM_TEAL;
  ctx.fillText('fomo.com.cy', centerX, ctaY + 88);
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

  // Max 2 lines with ellipsis
  if (lines.length > 2) {
    const truncated = lines.slice(0, 2);
    truncated[1] = truncated[1].slice(0, -3) + '...';
    return truncated;
  }

  return lines;
};

/**
 * Generate a Business Profile Story image (1080x1920, 9:16 aspect ratio)
 * Uses Aegean Night Glow theme with split layout
 */
export const generateBusinessStoryImage = async (
  coverUrl: string,
  options: BusinessStoryOptions
): Promise<File> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Layout constants
  const imageHeight = canvas.height * 0.45; // Top 45% for cover image
  const waveY = imageHeight - 35;
  const panelTop = waveY + 35;
  const logoY = panelTop + 120; // Logo position
  const textStartY = logoY + 140; // Below logo

  // 1. Fill background with navy first
  ctx.fillStyle = AEGEAN_NAVY;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Load and draw the crisp top image
  const coverImg = await loadImage(coverUrl);
  drawTopBusinessCover(ctx, coverImg, canvas.width, imageHeight);

  // 3. Draw the wave divider
  drawWaveDivider(ctx, canvas.width, waveY);

  // 4. Draw bottom panel
  drawBottomPanel(ctx, canvas.width, canvas.height, panelTop);

  // 5. Draw logo if available
  if (options.logoUrl) {
    await drawLogo(ctx, options.logoUrl, canvas.width, logoY);
  }

  // 6. Draw business info
  drawBusinessInfo(ctx, options, canvas.width, options.logoUrl ? textStartY : panelTop + 80);

  // 7. Draw CTA section
  drawFollowCTA(ctx, canvas.width, canvas.height);

  // Convert to File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'fomo-business-story.png', {
            type: 'image/png',
            lastModified: Date.now(),
          });
          resolve(file);
        } else {
          reject(new Error('Failed to generate business story image'));
        }
      },
      'image/png'
    );
  });
};
