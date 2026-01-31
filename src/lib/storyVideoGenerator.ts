/**
 * Generates an animated video for Instagram Stories
 * Creates a Spotify-like floating/swaying animation that exports as MP4
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface StoryVideoOptions {
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
}

// Video configuration
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const FPS = 30;
const DURATION_SECONDS = 3;
const TOTAL_FRAMES = FPS * DURATION_SECONDS;

// Animation configuration - INCREASED amplitudes for unmistakable motion
const ANIMATION = {
  floatY: { amplitude: 40, period: 3000 },       // Float up/down ±40px
  floatX: { amplitude: 15, period: 4500 },       // Drift left/right ±15px
  rotation: { amplitude: 7, period: 4000 },      // Sway ±7°
  scale: { min: 0.96, max: 1.04, period: 5000 }, // Breathing scale
  shadow: { min: 20, max: 45, period: 3500 },    // Shadow depth variation
  gradientShift: { period: 6000 },               // Background color shift
};

// FFmpeg instance (singleton)
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;
let usingSingleThreaded = false; // Track if we're using single-threaded mode

// Logging helper for consistent debugging output
const logStep = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[StoryVideo ${timestamp}] ${step}`, details ?? '');
};

const logError = (step: string, error: unknown) => {
  const timestamp = new Date().toISOString();
  console.error(`[StoryVideo ERROR ${timestamp}] ${step}:`, error);
};

/**
 * Load FFmpeg WASM with single-threaded fallback
 * First tries multi-threaded (requires SharedArrayBuffer), then falls back to single-threaded
 */
const loadFFmpeg = async (): Promise<FFmpeg> => {
  // Return cached instance if available
  if (ffmpegInstance && ffmpegLoaded) {
    logStep('FFmpeg already loaded, returning cached instance', { singleThreaded: usingSingleThreaded });
    return ffmpegInstance;
  }

  // If already loading, wait for that promise
  if (ffmpegLoadingPromise) {
    logStep('FFmpeg already loading, waiting for existing promise');
    return ffmpegLoadingPromise;
  }

  // Create new loading promise
  ffmpegLoadingPromise = (async () => {
    logStep('Starting FFmpeg WASM load');
    
    // Check environment capabilities
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    const isCrossOriginIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true;
    
    logStep('Environment check', { 
      hasSharedArrayBuffer, 
      isCrossOriginIsolated,
      crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : 'undefined'
    });
    
    try {
      ffmpegInstance = new FFmpeg();
      
      // Determine which FFmpeg core to use based on SharedArrayBuffer availability
      // Multi-threaded requires SharedArrayBuffer, single-threaded doesn't
      const useMultiThreaded = hasSharedArrayBuffer && isCrossOriginIsolated;
      usingSingleThreaded = !useMultiThreaded;
      
      // Use the appropriate FFmpeg core
      // Single-threaded core path for browsers without SharedArrayBuffer
      const baseURL = useMultiThreaded 
        ? 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
        : 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'; // Same core, but without worker
      
      logStep('Fetching FFmpeg core files', { baseURL, useMultiThreaded, usingSingleThreaded });
      
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      ]);
      
      logStep('FFmpeg core files fetched, loading into instance');
      
      // Load FFmpeg - for single-threaded mode, we don't pass the worker URL
      const loadConfig: { coreURL: string; wasmURL: string } = {
        coreURL,
        wasmURL,
      };
      
      await ffmpegInstance.load(loadConfig);
      
      ffmpegLoaded = true;
      logStep('FFmpeg loaded successfully', { singleThreaded: usingSingleThreaded });
      
      return ffmpegInstance;
    } catch (error) {
      logError('FFmpeg load failed', error);
      
      // If multi-threaded failed and we haven't tried single-threaded yet, try it
      if (!usingSingleThreaded) {
        logStep('Attempting single-threaded fallback after multi-threaded failure');
        usingSingleThreaded = true;
        
        try {
          ffmpegInstance = new FFmpeg();
          
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          
          const [coreURL, wasmURL] = await Promise.all([
            toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          ]);
          
          await ffmpegInstance.load({ coreURL, wasmURL });
          
          ffmpegLoaded = true;
          logStep('FFmpeg single-threaded fallback loaded successfully');
          
          return ffmpegInstance;
        } catch (fallbackError) {
          logError('FFmpeg single-threaded fallback also failed', fallbackError);
        }
      }
      
      ffmpegInstance = null;
      ffmpegLoaded = false;
      ffmpegLoadingPromise = null;
      throw new Error(`FFmpeg WASM failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  })();

  return ffmpegLoadingPromise;
};

/**
 * Load an image from URL
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      logStep('Image loaded', { width: img.width, height: img.height });
      resolve(img);
    };
    img.onerror = (e) => {
      logError('Image load failed', e);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

/**
 * Calculate animation values for a given frame
 */
const getAnimationValues = (frameIndex: number) => {
  const timeMs = (frameIndex / FPS) * 1000;
  
  // Sinusoidal animations with different phases for organic feel
  const floatY = Math.sin((timeMs / ANIMATION.floatY.period) * 2 * Math.PI) * ANIMATION.floatY.amplitude;
  const floatX = Math.sin((timeMs / ANIMATION.floatX.period) * 2 * Math.PI + Math.PI / 4) * ANIMATION.floatX.amplitude;
  const rotation = Math.sin((timeMs / ANIMATION.rotation.period) * 2 * Math.PI) * ANIMATION.rotation.amplitude;
  
  const scaleProgress = (Math.sin((timeMs / ANIMATION.scale.period) * 2 * Math.PI) + 1) / 2;
  const scale = ANIMATION.scale.min + scaleProgress * (ANIMATION.scale.max - ANIMATION.scale.min);
  
  const shadowProgress = (Math.sin((timeMs / ANIMATION.shadow.period) * 2 * Math.PI) + 1) / 2;
  const shadowBlur = ANIMATION.shadow.min + shadowProgress * (ANIMATION.shadow.max - ANIMATION.shadow.min);
  
  const gradientPhase = (timeMs / ANIMATION.gradientShift.period) * 2 * Math.PI;
  
  return { floatY, floatX, rotation, scale, shadowBlur, gradientPhase };
};

/**
 * Draw animated gradient background
 */
const drawAnimatedBackground = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  gradientPhase: number
) => {
  // Base dark color
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Calculate cover dimensions
  const imgRatio = img.width / img.height;
  const canvasRatio = VIDEO_WIDTH / VIDEO_HEIGHT;
  let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

  if (imgRatio > canvasRatio) {
    drawHeight = VIDEO_HEIGHT;
    drawWidth = drawHeight * imgRatio;
    offsetX = (VIDEO_WIDTH - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = VIDEO_WIDTH;
    drawHeight = drawWidth / imgRatio;
    offsetX = 0;
    offsetY = (VIDEO_HEIGHT - drawHeight) / 2;
  }

  // Apply blur
  ctx.filter = 'blur(30px)';
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  ctx.filter = 'none';

  // Animated color overlay with stronger shifting hue
  const hueShift = Math.sin(gradientPhase) * 15;
  const opacity = 0.28 + Math.sin(gradientPhase * 0.5) * 0.08;
  ctx.fillStyle = `hsla(${260 + hueShift}, 35%, 10%, ${opacity})`;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Top gradient
  const topGradient = ctx.createLinearGradient(0, 0, 0, 300);
  topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  topGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
  topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, VIDEO_WIDTH, 300);

  // Bottom gradient
  const bottomGradient = ctx.createLinearGradient(0, VIDEO_HEIGHT - 450, 0, VIDEO_HEIGHT);
  bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.25)');
  bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, VIDEO_HEIGHT - 450, VIDEO_WIDTH, 450);
};

/**
 * Draw animated card with floating/rotation effects
 */
const drawAnimatedCard = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  floatY: number,
  floatX: number,
  rotation: number,
  scale: number,
  shadowBlur: number
): { imageBottom: number } => {
  const padding = 60;
  const availableWidth = VIDEO_WIDTH - padding * 2;
  const availableHeight = VIDEO_HEIGHT * 0.45;
  const baseOffsetY = VIDEO_HEIGHT * 0.15;

  const imgRatio = img.width / img.height;
  let drawWidth: number, drawHeight: number;

  if (img.width / availableWidth > img.height / availableHeight) {
    drawWidth = availableWidth;
    drawHeight = drawWidth / imgRatio;
  } else {
    drawHeight = availableHeight;
    drawWidth = drawHeight * imgRatio;
  }

  const centerX = VIDEO_WIDTH / 2 + floatX;
  const centerY = baseOffsetY + drawHeight / 2 + floatY;
  const radius = 24;

  ctx.save();
  
  // Apply transformations from center
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);

  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = 15;
  ctx.shadowOffsetX = 0;

  // Calculate position
  const x = (VIDEO_WIDTH - drawWidth) / 2 + floatX;
  const y = baseOffsetY + floatY;

  // Draw rounded rectangle with image
  ctx.beginPath();
  ctx.roundRect(x, y, drawWidth, drawHeight, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
  
  ctx.restore();

  return { imageBottom: baseOffsetY + drawHeight + floatY };
};

/**
 * Draw text overlay
 */
const drawTextOverlay = (
  ctx: CanvasRenderingContext2D,
  options: StoryVideoOptions,
  imageBottom: number
) => {
  const padding = 60;
  const textAreaTop = imageBottom + 60;
  const centerX = VIDEO_WIDTH / 2;

  // Text gradient overlay
  const gradient = ctx.createLinearGradient(0, textAreaTop - 40, 0, VIDEO_HEIGHT);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, textAreaTop - 40, VIDEO_WIDTH, VIDEO_HEIGHT - textAreaTop + 40);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';

  let currentY = textAreaTop + 40;

  // Title
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const titleLines = wrapText(ctx, options.title, VIDEO_WIDTH - padding * 2);
  titleLines.forEach((line) => {
    ctx.fillText(line, centerX, currentY);
    currentY += 64;
  });

  currentY += 20;

  // Subtitle
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
  }
};

/**
 * Draw branding
 */
const drawBranding = (ctx: CanvasRenderingContext2D) => {
  const brandY = VIDEO_HEIGHT - 80;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(VIDEO_WIDTH * 0.3, brandY - 40);
  ctx.lineTo(VIDEO_WIDTH * 0.7, brandY - 40);
  ctx.stroke();

  ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('ΦΟΜΟ', VIDEO_WIDTH / 2, brandY);

  ctx.font = '300 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('fomo.com.cy', VIDEO_WIDTH / 2, brandY + 36);
};

/**
 * Wrap text to fit width
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

  if (lines.length > 2) {
    const truncatedLines = lines.slice(0, 2);
    truncatedLines[1] = truncatedLines[1].slice(0, -3) + '...';
    return truncatedLines;
  }

  return lines;
};

/**
 * Render a single frame - creates new canvas context state each time
 */
const renderFrame = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  options: StoryVideoOptions,
  frameIndex: number
) => {
  const { floatY, floatX, rotation, scale, shadowBlur, gradientPhase } = getAnimationValues(frameIndex);

  // Reset canvas context state completely
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Clear canvas completely
  ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Draw layers
  drawAnimatedBackground(ctx, img, gradientPhase);
  const { imageBottom } = drawAnimatedCard(ctx, img, floatY, floatX, rotation, scale, shadowBlur);
  drawTextOverlay(ctx, options, imageBottom);
  drawBranding(ctx);
};

/**
 * Compute a simple hash of pixel data for frame comparison
 */
const computeFrameHash = (data: Uint8Array): number => {
  let hash = 0;
  // Sample every 1000th byte to keep it fast
  for (let i = 0; i < data.length; i += 1000) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  return hash;
};

/**
 * Result of video generation attempt
 */
export interface VideoGenerationResult {
  success: boolean;
  file: File;
  isVideo: boolean;
  error?: string;
}

/**
 * Generate all frames and encode to video
 */
export const generateStoryVideo = async (
  imageUrl: string,
  options: StoryVideoOptions,
  onProgress?: (progress: number) => void
): Promise<File> => {
  logStep('Starting video generation', { title: options.title });
  
  // Create canvas with fresh context
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d', { 
    willReadFrequently: true,
    alpha: false  // Opaque canvas for better performance
  });

  if (!ctx) {
    logError('Canvas context creation', 'Could not get 2D context');
    throw new Error('Could not get canvas context');
  }

  logStep('Canvas created', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });

  // Load image
  const img = await loadImage(imageUrl);
  onProgress?.(0.1);

  // Generate frames as PNGs
  const frames: Uint8Array[] = [];
  const sampleHashes: number[] = [];
  const sampleFrameIndices = [0, 15, 45, TOTAL_FRAMES - 1];
  
  logStep('Starting frame generation', { totalFrames: TOTAL_FRAMES, fps: FPS });

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    renderFrame(ctx, img, options, i);
    
    // Convert canvas to PNG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create frame blob')), 'image/png');
    });
    
    const arrayBuffer = await blob.arrayBuffer();
    const frameData = new Uint8Array(arrayBuffer);
    frames.push(frameData);
    
    // Sample frames for hash validation
    if (sampleFrameIndices.includes(i)) {
      const hash = computeFrameHash(frameData);
      sampleHashes.push(hash);
      logStep(`Frame ${i} hash`, { hash, size: frameData.length });
    }
    
    // Progress: 10% to 60% for frame generation
    onProgress?.(0.1 + (i / TOTAL_FRAMES) * 0.5);
  }

  logStep('Frame generation complete', { framesGenerated: frames.length });

  // Validate frames are different
  const uniqueHashes = new Set(sampleHashes);
  if (uniqueHashes.size <= 1) {
    logError('Frame validation', { 
      message: 'All sampled frames are identical!',
      hashes: sampleHashes 
    });
    throw new Error('Generated frames are identical - animation not rendering correctly');
  }
  
  logStep('Frame validation passed', { 
    uniqueHashes: uniqueHashes.size, 
    totalSamples: sampleHashes.length 
  });

  onProgress?.(0.6);

  // Load FFmpeg with timeout
  logStep('Loading FFmpeg WASM');
  
  const ffmpegTimeout = 30000; // 30 seconds timeout
  const ffmpeg = await Promise.race([
    loadFFmpeg(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('FFmpeg load timeout')), ffmpegTimeout)
    )
  ]);
  
  onProgress?.(0.7);
  logStep('FFmpeg loaded, writing frames to virtual filesystem');

  // Write frames to FFmpeg filesystem
  for (let i = 0; i < frames.length; i++) {
    const frameNum = String(i).padStart(4, '0');
    await ffmpeg.writeFile(`frame${frameNum}.png`, frames[i]);
  }

  logStep('All frames written to FFmpeg filesystem');
  onProgress?.(0.8);

  // Encode to MP4 with explicit settings for maximum compatibility
  logStep('Starting MP4 encoding');
  
  await ffmpeg.exec([
    '-framerate', String(FPS),
    '-start_number', '0',
    '-i', 'frame%04d.png',
    '-t', String(DURATION_SECONDS),
    '-c:v', 'libx264',
    '-r', String(FPS),
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '23',
    '-movflags', '+faststart',
    '-brand', 'mp42',  // Better iOS compatibility
    '-vf', 'scale=1080:1920:flags=lanczos',  // Ensure exact dimensions
    'output.mp4'
  ]);

  logStep('MP4 encoding complete');
  onProgress?.(0.95);

  // Read output file
  const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
  logStep('Output file read', { size: data.length });
  
  // Cleanup virtual filesystem
  for (let i = 0; i < frames.length; i++) {
    const frameNum = String(i).padStart(4, '0');
    await ffmpeg.deleteFile(`frame${frameNum}.png`);
  }
  await ffmpeg.deleteFile('output.mp4');
  
  logStep('Cleanup complete');
  onProgress?.(1);

  // Create File object
  const videoBlob = new Blob([new Uint8Array(data)], { type: 'video/mp4' });
  const videoFile = new File([videoBlob], 'fomo-story.mp4', {
    type: 'video/mp4',
    lastModified: Date.now(),
  });
  
  logStep('Video file created successfully', { 
    size: videoFile.size, 
    type: videoFile.type,
    name: videoFile.name 
  });

  return videoFile;
};

/**
 * Check if video generation is supported in this browser
 * Now supports single-threaded mode for browsers without SharedArrayBuffer
 */
export const isVideoGenerationSupported = (): boolean => {
  const hasCanvas = typeof OffscreenCanvas !== 'undefined' || typeof HTMLCanvasElement !== 'undefined';
  const hasWasm = typeof WebAssembly !== 'undefined';
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true;
  
  // iOS Safari check - FFmpeg WASM may have issues on older versions
  const isIOSSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
                      /Safari/.test(navigator.userAgent) && 
                      !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);
  
  // Check for iOS version (FFmpeg WASM works better on iOS 15+)
  let iosVersion = 0;
  const iosMatch = navigator.userAgent.match(/OS (\d+)_/);
  if (iosMatch) {
    iosVersion = parseInt(iosMatch[1], 10);
  }
  
  // Check if we're in an in-app browser (WebView)
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line|Snapchat|WeChat/i.test(navigator.userAgent);
  
  // Basic requirements: Canvas and WebAssembly
  const basicSupport = hasCanvas && hasWasm;
  
  // Multi-threaded FFmpeg requires SharedArrayBuffer + cross-origin isolation
  const multiThreadedSupport = hasSharedArrayBuffer && isCrossOriginIsolated;
  
  // We now support both multi-threaded AND single-threaded modes
  // Single-threaded is slower but works without SharedArrayBuffer
  const supported = basicSupport; // Allow video gen even without SharedArrayBuffer
  
  logStep('Video generation support check', {
    hasCanvas,
    hasWasm,
    hasSharedArrayBuffer,
    isCrossOriginIsolated,
    multiThreadedSupport,
    isIOSSafari,
    iosVersion,
    isInAppBrowser,
    supported,
    mode: multiThreadedSupport ? 'multi-threaded' : 'single-threaded'
  });
  
  // Disable on iOS Safari < 15 due to known WASM issues
  if (isIOSSafari && iosVersion < 15) {
    logStep('Disabling video generation on iOS Safari < 15');
    return false;
  }
  
  // Disable in in-app browsers (Instagram, Facebook, etc.) as they have limited WebAssembly support
  if (isInAppBrowser) {
    logStep('Disabling video generation in in-app browser');
    return false;
  }
  
  return supported;
};

/**
 * Get video generation diagnostics for debugging
 */
export const getVideoGenerationDiagnostics = (): Record<string, unknown> => {
  const hasCanvas = typeof OffscreenCanvas !== 'undefined' || typeof HTMLCanvasElement !== 'undefined';
  const hasWasm = typeof WebAssembly !== 'undefined';
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : 'unknown';
  
  const isIOSSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
                      /Safari/.test(navigator.userAgent) && 
                      !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);
  
  let iosVersion = 0;
  const iosMatch = navigator.userAgent.match(/OS (\d+)_/);
  if (iosMatch) {
    iosVersion = parseInt(iosMatch[1], 10);
  }
  
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line|Snapchat|WeChat/i.test(navigator.userAgent);
  
  return {
    hasCanvas,
    hasWasm,
    hasSharedArrayBuffer,
    isCrossOriginIsolated,
    isIOSSafari,
    iosVersion,
    isInAppBrowser,
    userAgent: navigator.userAgent,
    ffmpegLoaded,
    usingSingleThreaded,
    isSupported: isVideoGenerationSupported(),
  };
};
