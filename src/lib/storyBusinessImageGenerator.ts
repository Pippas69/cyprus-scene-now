/**
 * Generates a 9:16 vertical image optimized for Instagram Stories - Business Profile variant
 * Features cover-focused layout with business branding and "Follow us on ΦΟΜΟ" CTA
 */

interface BusinessStoryOptions {
  name: string;
  category?: string;
  location?: string;
  /** Logo URL for brand presence */
  logoUrl?: string | null;
}

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
 * Draw full-bleed cover image as background with subtle gradient overlay
 * Uses minimal zoom to show more of the original image
 */
const drawCoverBackground = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
) => {
  // Ensure best possible scaling quality (helps avoid extra softness when upscaling)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'none';

  // Fill with dark base first
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate dimensions to fill canvas with minimal crop
  const imgRatio = img.width / img.height;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

  if (imgRatio > canvasRatio) {
    // Image is wider - fit to height with minimal overflow
    drawHeight = canvasHeight;
    drawWidth = drawHeight * imgRatio;
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  } else {
    // Image is taller - fit to width with minimal overflow
    drawWidth = canvasWidth;
    drawHeight = drawWidth / imgRatio;
    offsetX = 0;
    // Center vertically but bias slightly toward top to show more content
    offsetY = Math.min(0, (canvasHeight - drawHeight) / 3);
  }

  // Draw the cover image
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  // Add VERY subtle gradient overlay for text readability (even less "blurry/veiled")
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.02)');
  gradient.addColorStop(0.75, 'rgba(0, 0, 0, 0.10)');
  gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.28)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.40)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
};

/**
 * Draw circular logo if available
 */
const drawLogo = async (
  ctx: CanvasRenderingContext2D,
  logoUrl: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<number> => {
  try {
    const logo = await loadImage(logoUrl);
    
    // Larger logo for better visibility (was 160)
    const logoSize = 240;
    const logoX = canvasWidth / 2;
    const logoY = canvasHeight * 0.32;
    
    // Draw circular clip for logo
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Draw logo centered in circle
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
    
    // Draw white border around logo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
    
    return logoY + logoSize / 2 + 40; // Return bottom position + padding
  } catch {
    console.warn('Failed to load logo for story');
    return canvasHeight * 0.45;
  }
};

/**
 * Draw business info overlay (name, category, location)
 */
const drawBusinessInfo = (
  ctx: CanvasRenderingContext2D,
  options: BusinessStoryOptions,
  canvasWidth: number,
  canvasHeight: number,
  startY: number
) => {
  const centerX = canvasWidth / 2;
  ctx.textAlign = 'center';

  let currentY = startY;

  // Category tag
  if (options.category) {
    ctx.font = '600 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(78, 205, 196, 0.95)'; // Seafoam teal
    ctx.fillText(options.category.toUpperCase(), centerX, currentY);
    currentY += 50;
  }

  // Business Name (large, bold)
  ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  
  // Wrap text if needed
  const nameLines = wrapText(ctx, options.name, canvasWidth - 120);
  nameLines.forEach((line) => {
    ctx.fillText(line, centerX, currentY);
    currentY += 68;
  });

  currentY += 20;

  // Location
  if (options.location) {
    ctx.font = '400 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`📍 ${options.location}`, centerX, currentY);
    currentY += 48;
  }

  return currentY;
};

/**
 * Draw "Follow us on ΦΟΜΟ" CTA section
 */
const drawFollowCTA = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
) => {
  const centerX = canvasWidth / 2;
  const ctaY = canvasHeight - 200;

  // Decorative line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(canvasWidth * 0.2, ctaY - 40);
  ctx.lineTo(canvasWidth * 0.8, ctaY - 40);
  ctx.stroke();

  // "Follow us on" text
  ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('Follow us on', centerX, ctaY);

  // ΦΟΜΟ brand (large, bold)
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('ΦΟΜΟ', centerX, ctaY + 55);

  // Website
  ctx.font = '300 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('fomo.com.cy', centerX, ctaY + 95);
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

  // Load and draw cover image as full-bleed background
  const coverImg = await loadImage(coverUrl);
  drawCoverBackground(ctx, coverImg, canvas.width, canvas.height);

  // Draw logo if available
  let infoStartY = canvas.height * 0.5;
  if (options.logoUrl) {
    infoStartY = await drawLogo(ctx, options.logoUrl, canvas.width, canvas.height);
  }

  // Draw business info
  drawBusinessInfo(ctx, options, canvas.width, canvas.height, infoStartY);

  // Draw CTA section
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
