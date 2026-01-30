/**
 * In-memory cache for generated Story media (images and videos)
 * Provides instant re-share without regenerating files
 */

interface CacheEntry {
  file: File;
  blobUrl: string;
  timestamp: number;
  type: 'image' | 'video';
}

// Cache expiry time: 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// In-memory cache
const cache = new Map<string, CacheEntry>();

/**
 * Generate cache key from object type, ID, and media type
 */
export const getCacheKey = (objectType: string, objectId: string, mediaType: 'image' | 'video' = 'image'): string => {
  return `${objectType}-${objectId}-${mediaType}`;
};

/**
 * Get cached Story media if available and not expired
 */
export const getCachedStoryMedia = (key: string): CacheEntry | null => {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
    // Clean up expired entry
    URL.revokeObjectURL(entry.blobUrl);
    cache.delete(key);
    return null;
  }
  
  return entry;
};

/**
 * Store Story media in cache
 */
export const setCachedStoryMedia = (key: string, file: File, type: 'image' | 'video'): CacheEntry => {
  // Revoke old blob URL if replacing
  const existing = cache.get(key);
  if (existing) {
    URL.revokeObjectURL(existing.blobUrl);
  }
  
  const blobUrl = URL.createObjectURL(file);
  const entry: CacheEntry = {
    file,
    blobUrl,
    timestamp: Date.now(),
    type,
  };
  
  cache.set(key, entry);
  return entry;
};

/**
 * Clear all cached media (e.g., on logout)
 */
export const clearStoryMediaCache = (): void => {
  cache.forEach((entry) => {
    URL.revokeObjectURL(entry.blobUrl);
  });
  cache.clear();
};

/**
 * Remove a specific entry from cache
 */
export const removeCachedStoryMedia = (key: string): void => {
  const entry = cache.get(key);
  if (entry) {
    URL.revokeObjectURL(entry.blobUrl);
    cache.delete(key);
  }
};

/**
 * Clean up expired entries (can be called periodically)
 */
export const cleanupExpiredEntries = (): void => {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      URL.revokeObjectURL(entry.blobUrl);
      cache.delete(key);
    }
  });
};

// Re-export legacy functions for backward compatibility
export const getCachedStoryImage = getCachedStoryMedia;
export const setCachedStoryImage = (key: string, file: File) => setCachedStoryMedia(key, file, 'image');
