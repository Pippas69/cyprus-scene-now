/**
 * Image loading utilities with intersection observer for lazy loading
 */

export interface ImageLoaderOptions {
  threshold?: number;
  rootMargin?: string;
}

// Create a tiny blur placeholder from dimensions
export const generateBlurPlaceholder = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create a simple gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'hsl(207, 72%, 22%)');
  gradient.addColorStop(1, 'hsl(174, 62%, 56%)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

// Intersection observer for lazy loading
const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  },
  {
    threshold: 0.01,
    rootMargin: '100px'
  }
);

export const observeImage = (img: HTMLImageElement) => {
  imageObserver.observe(img);
};

export const unobserveImage = (img: HTMLImageElement) => {
  imageObserver.unobserve(img);
};

// Check if WebP is supported
let webpSupported: boolean | null = null;

export const checkWebPSupport = (): Promise<boolean> => {
  if (webpSupported !== null) {
    return Promise.resolve(webpSupported);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      webpSupported = img.width === 1;
      resolve(webpSupported);
    };
    img.onerror = () => {
      webpSupported = false;
      resolve(false);
    };
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  });
};

// Get optimized image URL (if using CDN with format support)
export const getOptimizedImageUrl = (url: string, width?: number): string => {
  if (!url) return '';
  
  // If it's a Supabase URL, we could add transform parameters
  // For now, just return the original URL
  // In production, you might add: ?width=800&format=webp
  return url;
};
