import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { observeImage, unobserveImage, getOptimizedImageUrl } from '@/lib/imageLoader';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  showLoader?: boolean;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  showLoader = true,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Set up intersection observer for lazy loading
    observeImage(img);

    return () => {
      if (img) {
        unobserveImage(img);
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const optimizedSrc = getOptimizedImageUrl(src, width);

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      {showLoader && !isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      <img
        ref={imgRef}
        data-src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          hasError && 'bg-muted'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
};
