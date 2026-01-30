/**
 * Generates a 9:16 vertical image optimized for Instagram Stories
 * Creates a blurred background with centered original image and text overlay
 */

interface StoryImageOptions {
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
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
 * Draw background with extended edges and smooth gradient fades
 * Extends top/bottom edge pixels to fill the 9:16 canvas without cropping
 */
const drawClearBackground = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
) => {
  // Fill canvas with dark base color first
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate "contain" dimensions - fit entire image without cropping
  const imgRatio = img.width / img.height;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

  if (imgRatio > canvasRatio) {
    // Image is wider than canvas ratio - fit to width
    drawWidth = canvasWidth;
    drawHeight = drawWidth / imgRatio;
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  } else {
    // Image is taller than canvas ratio - fit to height
    drawHeight = canvasHeight;
    drawWidth = drawHeight * imgRatio;
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  }

  // Extend top edge pixels if there's a gap
  if (offsetY > 0) {
    // Create temporary canvas to sample top row
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      // Sample top row of image
      tempCtx.drawImage(img, 0, 0, img.width, 1, 0, 0, img.width, 1);
      // Apply brightness filter for background
      ctx.filter = 'brightness(0.8)';
      // Stretch top row to fill gap above image
      ctx.drawImage(tempCanvas, offsetX, 0, drawWidth, offsetY);
    }
  }

  // Extend bottom edge pixels if there's a gap
  if (offsetY > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      // Sample bottom row of image
      tempCtx.drawImage(img, 0, img.height - 1, img.width, 1, 0, 0, img.width, 1);
      // Apply brightness filter for background
      ctx.filter = 'brightness(0.8)';
      // Stretch bottom row to fill gap below image
      ctx.drawImage(tempCanvas, offsetX, offsetY + drawHeight, drawWidth, canvasHeight - offsetY - drawHeight);
    }
  }

  // Extend left edge pixels if there's a gap (for vertical images)
  if (offsetX > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      // Sample left column of image
      tempCtx.drawImage(img, 0, 0, 1, img.height, 0, 0, 1, img.height);
      ctx.filter = 'brightness(0.8)';
      // Stretch left column to fill gap
      ctx.drawImage(tempCanvas, 0, offsetY, offsetX, drawHeight);
    }
  }

  // Extend right edge pixels if there's a gap (for vertical images)
  if (offsetX > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      // Sample right column of image
      tempCtx.drawImage(img, img.width - 1, 0, 1, img.height, 0, 0, 1, img.height);
      ctx.filter = 'brightness(0.8)';
      // Stretch right column to fill gap
      ctx.drawImage(tempCanvas, offsetX + drawWidth, offsetY, canvasWidth - offsetX - drawWidth, drawHeight);
    }
  }

  // Apply slight darkening for contrast with foreground card
  ctx.filter = 'brightness(0.8)';
  
  // Draw full-resolution background image (contained, not cropped)
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  
  // Reset filter
  ctx.filter = 'none';

  // Add medium gradient fade at top (0 to 300px)
  const topGradient = ctx.createLinearGradient(0, 0, 0, 300);
  topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  topGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
  topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, canvasWidth, 300);

  // Add medium gradient fade at bottom (canvasHeight - 450px to canvasHeight)
  const bottomGradient = ctx.createLinearGradient(0, canvasHeight - 450, 0, canvasHeight);
  bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.25)');
  bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, canvasHeight - 450, canvasWidth, 450);
};

/**
 * Draw the main image centered on the canvas
 */
const drawCenteredImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
) => {
  const padding = 60;
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight * 0.45; // Use 45% of height for image
  const offsetY = canvasHeight * 0.15; // Start 15% from top

  const imgRatio = img.width / img.height;
  let drawWidth: number, drawHeight: number;

  if (img.width / availableWidth > img.height / availableHeight) {
    drawWidth = availableWidth;
    drawHeight = drawWidth / imgRatio;
  } else {
    drawHeight = availableHeight;
    drawWidth = drawHeight * imgRatio;
  }

  const x = (canvasWidth - drawWidth) / 2;
  const y = offsetY;

  // Draw rounded rectangle clip path
  const radius = 24;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, drawWidth, drawHeight, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
  ctx.restore();

  // Add subtle shadow effect around the image
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.strokeStyle = 'transparent';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, drawWidth, drawHeight, radius);
  ctx.stroke();
  ctx.restore();

  return { imageBottom: y + drawHeight };
};

/**
 * Draw text overlay with title, subtitle, and details
 */
const drawTextOverlay = (
  ctx: CanvasRenderingContext2D,
  options: StoryImageOptions,
  canvasWidth: number,
  canvasHeight: number,
  imageBottom: number
) => {
  const padding = 60;
  const textAreaTop = imageBottom + 60;
  const centerX = canvasWidth / 2;

  // Semi-transparent overlay for text area
  const gradient = ctx.createLinearGradient(0, textAreaTop - 40, 0, canvasHeight);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, textAreaTop - 40, canvasWidth, canvasHeight - textAreaTop + 40);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';

  let currentY = textAreaTop + 40;

  // Title
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const titleLines = wrapText(ctx, options.title, canvasWidth - padding * 2);
  titleLines.forEach((line) => {
    ctx.fillText(line, centerX, currentY);
    currentY += 64;
  });

  currentY += 20;

  // Subtitle (business name)
  if (options.subtitle) {
    ctx.font = '500 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(options.subtitle, centerX, currentY);
    currentY += 50;
  }

  // Location
  if (options.location) {
    ctx.font = '400 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`📍 ${options.location}`, centerX, currentY);
    currentY += 48;
  }

  // Date
  if (options.date) {
    ctx.font = '400 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`🗓️ ${options.date}`, centerX, currentY);
    currentY += 48;
  }
};

/**
 * Draw ΦΟΜΟ branding at the bottom
 */
const drawBranding = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
) => {
  const brandY = canvasHeight - 80;

  // Subtle divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(canvasWidth * 0.3, brandY - 40);
  ctx.lineTo(canvasWidth * 0.7, brandY - 40);
  ctx.stroke();

  // Brand name
  ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('ΦΟΜΟ', canvasWidth / 2, brandY);

  // Tagline
  ctx.font = '300 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('fomo.cy', canvasWidth / 2, brandY + 36);
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

  return lines.slice(0, 3); // Max 3 lines
};

/**
 * Generate a Story-optimized image (1080x1920, 9:16 aspect ratio)
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

  // Load the source image
  const img = await loadImage(imageUrl);

  // 1. Draw blurred background
  drawClearBackground(ctx, img, canvas.width, canvas.height);

  // 2. Draw centered main image
  const { imageBottom } = drawCenteredImage(ctx, img, canvas.width, canvas.height);

  // 3. Draw text overlay
  drawTextOverlay(ctx, options, canvas.width, canvas.height, imageBottom);

  // 4. Draw branding
  drawBranding(ctx, canvas.width, canvas.height);

  // Convert to blob and return as File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'fomo-story.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(file);
        } else {
          reject(new Error('Failed to generate story image'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
};
