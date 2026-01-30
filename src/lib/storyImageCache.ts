/**
 * In-memory cache for generated Story images
 * Provides instant re-share without regenerating images
 */

interface CacheEntry {
  file: File;
  blobUrl: string;
  timestamp: number;
}

// Cache expiry time: 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// In-memory cache
const cache = new Map<string, CacheEntry>();

/**
 * Generate cache key from object type and ID
 */
export const getCacheKey = (objectType: string, objectId: string): string => {
  return `${objectType}-${objectId}`;
};

/**
 * Get cached Story image if available and not expired
 */
export const getCachedStoryImage = (key: string): CacheEntry | null => {
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
 * Store Story image in cache
 */
export const setCachedStoryImage = (key: string, file: File): CacheEntry => {
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
  };
  
  cache.set(key, entry);
  return entry;
};

/**
 * Clear all cached images (e.g., on logout)
 */
export const clearStoryImageCache = (): void => {
  cache.forEach((entry) => {
    URL.revokeObjectURL(entry.blobUrl);
  });
  cache.clear();
};

/**
 * Remove a specific entry from cache
 */
export const removeCachedStoryImage = (key: string): void => {
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
