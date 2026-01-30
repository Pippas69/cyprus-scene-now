import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { trackEngagement } from '@/lib/analyticsTracking';
import { generateStoryImage } from '@/lib/storyImageGenerator';
import { generateStoryVideo, isVideoGenerationSupported } from '@/lib/storyVideoGenerator';
import { getCacheKey, getCachedStoryMedia, setCachedStoryMedia } from '@/lib/storyMediaCache';

// Types
export type ShareObjectType = 'event' | 'discount' | 'business';

// Device detection utilities
export const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export const hasNativeShare = () => typeof navigator !== 'undefined' && 'share' in navigator;

// Canonical URL generators
const CANONICAL_DOMAIN = 'https://fomo.cy';

export const getEventUrl = (eventId: string) => `${CANONICAL_DOMAIN}/e/${eventId}`;
export const getOfferUrl = (offerId: string) => `${CANONICAL_DOMAIN}/o/${offerId}`;
export const getBusinessUrl = (businessId: string) => `${CANONICAL_DOMAIN}/v/${businessId}`;

// Fallback URLs using current origin
export const getEventUrlFallback = (eventId: string) => `${window.location.origin}/event/${eventId}`;
export const getOfferUrlFallback = (offerId: string) => `${window.location.origin}/offer/${offerId}`;
export const getBusinessUrlFallback = (businessId: string) => `${window.location.origin}/business/${businessId}`;

// Share text formatters
export const formatEventShareText = (
  event: { title: string; startAt: string; location: string; businessName?: string },
  language: 'el' | 'en' = 'el'
): string => {
  const date = new Date(event.startAt);
  const dateStr = date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = date.toLocaleTimeString(language === 'el' ? 'el-GR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const venueInfo = event.businessName ? `@ ${event.businessName}` : `@ ${event.location}`;

  if (language === 'el') {
    return `${event.title} — ${dateStr}, ${timeStr} ${venueInfo}`;
  }
  return `${event.title} — ${dateStr}, ${timeStr} ${venueInfo}`;
};

export const formatBusinessShareText = (
  business: { name: string },
  language: 'el' | 'en' = 'el'
): string => {
  if (language === 'el') {
    return `Αυτό παίζει τώρα στο ΦΟΜΟ 👀\n${business.name}`;
  }
  return `Check this out on ΦΟΜΟ 👀\n${business.name}`;
};

export const formatOfferShareText = (
  offer: { title: string; validUntil?: string; businessName?: string },
  language: 'el' | 'en' = 'el'
): string => {
  const validUntil = offer.validUntil
    ? new Date(offer.validUntil).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')
    : null;

  if (language === 'el') {
    return `Προσφορά στο ${offer.businessName || 'ΦΟΜΟ'} 🔥${validUntil ? `\nΙσχύει μέχρι ${validUntil}` : ''}`;
  }
  return `Deal at ${offer.businessName || 'ΦΟΜΟ'} 🔥${validUntil ? `\nValid until ${validUntil}` : ''}`;
};

// Toast messages
const toasts = {
  el: {
    linkCopied: 'Το link αντιγράφηκε!',
    shareSuccess: 'Κοινοποιήθηκε! 🎉',
    shareFailed: 'Η κοινοποίηση ακυρώθηκε',
    shareNotSupported: 'Το link αντιγράφηκε στο clipboard',
    instagramMobileOnly: 'Διαθέσιμο μόνο σε κινητό',
  },
  en: {
    linkCopied: 'Link copied!',
    shareSuccess: 'Shared! 🎉',
    shareFailed: 'Share cancelled',
    shareNotSupported: 'Link copied to clipboard',
    instagramMobileOnly: 'Available on mobile only',
  },
};

interface ShareData {
  title: string;
  text: string;
  url: string;
  imageUrl?: string | null;
}

interface StoryShareData extends ShareData {
  subtitle?: string;
  date?: string;
  location?: string;
}

interface ShareOptions {
  objectType?: ShareObjectType;
  objectId?: string;
  businessId?: string;
}

export type SocialChannel = 'instagram_stories' | 'whatsapp' | 'messenger';

interface StoryPreviewResult {
  blobUrl: string;
  file: File;
}

interface UseSimpleShareReturn {
  isSharing: boolean;
  share: (data: ShareData, options?: ShareOptions) => Promise<void>;
  copyLink: (url: string, options?: ShareOptions) => Promise<void>;
  shareToInstagramStories: (data: StoryShareData, options?: ShareOptions) => Promise<void>;
  shareToWhatsApp: (url: string, text: string, options?: ShareOptions) => void;
  shareToMessenger: (url: string, options?: ShareOptions) => void;
  generateStoryPreview: (data: StoryShareData, options?: ShareOptions, onProgress?: (progress: number) => void) => Promise<StoryPreviewResult | null>;
  shareStoryFile: (file: File, data: StoryShareData, options?: ShareOptions) => Promise<void>;
  downloadStoryFile: (file: File, title: string) => void;
  hasNativeShare: boolean;
}

export const useSimpleShare = (language: 'el' | 'en' = 'el'): UseSimpleShareReturn => {
  const [isSharing, setIsSharing] = useState(false);
  const t = toasts[language];

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard write failed:', error);
      return false;
    }
  }, []);

  const copyLink = useCallback(
    async (url: string, options?: ShareOptions) => {
      // Track analytics
      if (options?.businessId) {
        trackEngagement(options.businessId, 'share', options.objectType || 'event', options.objectId || '', {
          channel: 'copy',
          source: 'share_sheet',
        });
      }

      const success = await copyToClipboard(url);
      if (success) {
        toast.success(t.linkCopied);
      }
    },
    [copyToClipboard, t]
  );

  const share = useCallback(
    async (data: ShareData, options?: ShareOptions) => {
      setIsSharing(true);

      // Track analytics
      if (options?.businessId) {
        trackEngagement(options.businessId, 'share', options.objectType || 'event', options.objectId || '', {
          channel: 'native',
          source: 'share_sheet',
        });
      }

      try {
        let files: File[] = [];

        // Fetch image and convert to File if imageUrl provided
        if (data.imageUrl) {
          try {
            const response = await fetch(data.imageUrl);
            const blob = await response.blob();
            const extension = blob.type.includes('png') ? 'png' : 'jpg';
            const file = new File([blob], `share-image.${extension}`, { 
              type: blob.type || 'image/jpeg' 
            });
            files = [file];
          } catch (imgError) {
            console.warn('Failed to fetch image for sharing:', imgError);
            // Continue without image
          }
        }

        // Build share data with files if available
        const shareData: { title: string; text: string; url: string; files?: File[] } = {
          title: data.title,
          text: data.text,
          url: data.url,
        };

        if (files.length > 0) {
          shareData.files = files;
        }

        // Check if device supports file sharing
        if (hasNativeShare()) {
          const canShareWithFiles = files.length > 0 && navigator.canShare && navigator.canShare(shareData);
          
          if (canShareWithFiles) {
            await navigator.share(shareData);
          } else {
            // Fallback: share without image
            await navigator.share({
              title: data.title,
              text: data.text,
              url: data.url,
            });
          }
        } else {
          // Final fallback: copy link to clipboard
          const success = await copyToClipboard(data.url);
          if (success) {
            toast.success(t.shareNotSupported);
          }
        }
      } catch (error) {
        const err = error as Error;
        
        // User cancelled the share - no action needed
        if (err?.name === 'AbortError') {
          return;
        }
        
        // NotAllowedError: iframe restrictions or permissions denied
        // Fall back to copy link
        if (err?.name === 'NotAllowedError') {
          const success = await copyToClipboard(data.url);
          if (success) {
            toast.success(t.shareNotSupported);
          }
          return;
        }
        
        // Other errors - log and fallback to copy
        console.error('Share failed:', error);
        const success = await copyToClipboard(data.url);
        if (success) {
          toast.success(t.shareNotSupported);
        }
      } finally {
        setIsSharing(false);
      }
    },
    [copyToClipboard, t]
  );

  // Instagram Stories - generates 9:16 Story image and triggers native share
  const shareToInstagramStories = useCallback(
    async (data: StoryShareData, options?: ShareOptions) => {
      // Track analytics
      if (options?.businessId) {
        trackEngagement(options.businessId, 'share', options.objectType || 'event', options.objectId || '', {
          channel: 'instagram_stories',
          source: 'share_sheet',
        });
      }

      // Instagram Stories only works on mobile via native share
      if (!isMobile()) {
        toast.info(t.instagramMobileOnly);
        return;
      }

      setIsSharing(true);

      try {
        let storyFile: File | null = null;

        // Generate 9:16 Story image if we have a source image
        if (data.imageUrl) {
          try {
            storyFile = await generateStoryImage(data.imageUrl, {
              title: data.title,
              subtitle: data.subtitle,
              date: data.date,
              location: data.location,
            });
          } catch (imgError) {
            console.warn('Failed to generate Story image:', imgError);
          }
        }

        if (storyFile && hasNativeShare()) {
          const shareData = {
            files: [storyFile],
            title: data.title,
            url: data.url,
          };

          if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else {
            // Fallback to regular share
            await navigator.share({
              title: data.title,
              text: data.text,
              url: data.url,
            });
          }
        } else if (hasNativeShare()) {
          // No image available, use regular share
          await navigator.share({
            title: data.title,
            text: data.text,
            url: data.url,
          });
        } else {
          const success = await copyToClipboard(data.url);
          if (success) {
            toast.success(t.shareNotSupported);
          }
        }
      } catch (error) {
        const err = error as Error;
        if (err?.name === 'AbortError') return;

        if (err?.name === 'NotAllowedError') {
          const success = await copyToClipboard(data.url);
          if (success) {
            toast.success(t.shareNotSupported);
          }
          return;
        }

        console.error('Instagram Stories share failed:', error);
        const success = await copyToClipboard(data.url);
        if (success) {
          toast.success(t.shareNotSupported);
        }
      } finally {
        setIsSharing(false);
      }
    },
    [copyToClipboard, t]
  );

  // WhatsApp direct share
  const shareToWhatsApp = useCallback(
    (url: string, text: string, options?: ShareOptions) => {
      // Track analytics
      if (options?.businessId) {
        trackEngagement(options.businessId, 'share', options.objectType || 'event', options.objectId || '', {
          channel: 'whatsapp',
          source: 'share_sheet',
        });
      }

      const message = encodeURIComponent(`${text}\n${url}`);
      const whatsappUrl = isMobile()
        ? `whatsapp://send?text=${message}`
        : `https://web.whatsapp.com/send?text=${message}`;

      window.open(whatsappUrl, '_blank');
    },
    []
  );

  // Messenger direct share
  const shareToMessenger = useCallback(
    (url: string, options?: ShareOptions) => {
      // Track analytics
      if (options?.businessId) {
        trackEngagement(options.businessId, 'share', options.objectType || 'event', options.objectId || '', {
          channel: 'messenger',
          source: 'share_sheet',
        });
      }

      const encodedUrl = encodeURIComponent(url);
      const messengerUrl = isMobile()
        ? `fb-messenger://share/?link=${encodedUrl}`
        : `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.href)}`;

      window.open(messengerUrl, '_blank');
    },
    []
  );

  // Generate Story preview video (with caching) - returns MP4 for animated Instagram Stories
  const generateStoryPreview = useCallback(
    async (data: StoryShareData, options?: ShareOptions, onProgress?: (progress: number) => void): Promise<StoryPreviewResult | null> => {
      if (!data.imageUrl) {
        return null;
      }

      // Check cache first (video cache)
      const videoCacheKey = options?.objectId && options?.objectType 
        ? getCacheKey(options.objectType, options.objectId, 'video')
        : null;
      
      if (videoCacheKey) {
        const cached = getCachedStoryMedia(videoCacheKey);
        if (cached) {
          return { blobUrl: cached.blobUrl, file: cached.file };
        }
      }

      // Try to generate video first (animated Story)
      if (isVideoGenerationSupported()) {
        try {
          const videoFile = await generateStoryVideo(data.imageUrl, {
            title: data.title,
            subtitle: data.subtitle,
            date: data.date,
            location: data.location,
          }, onProgress);

          // Cache the video result
          if (videoCacheKey) {
            const entry = setCachedStoryMedia(videoCacheKey, videoFile, 'video');
            return { blobUrl: entry.blobUrl, file: videoFile };
          }

          const blobUrl = URL.createObjectURL(videoFile);
          return { blobUrl, file: videoFile };
        } catch (videoError) {
          console.warn('Video generation failed, falling back to image:', videoError);
        }
      }

      // Fallback: Generate static image
      const imageCacheKey = options?.objectId && options?.objectType 
        ? getCacheKey(options.objectType, options.objectId, 'image')
        : null;

      if (imageCacheKey) {
        const cached = getCachedStoryMedia(imageCacheKey);
        if (cached) {
          return { blobUrl: cached.blobUrl, file: cached.file };
        }
      }

      try {
        const file = await generateStoryImage(data.imageUrl, {
          title: data.title,
          subtitle: data.subtitle,
          date: data.date,
          location: data.location,
        });

        if (imageCacheKey) {
          const entry = setCachedStoryMedia(imageCacheKey, file, 'image');
          return { blobUrl: entry.blobUrl, file };
        }

        const blobUrl = URL.createObjectURL(file);
        return { blobUrl, file };
      } catch (error) {
        console.error('Failed to generate Story preview:', error);
        return null;
      }
    },
    []
  );

  // Share the generated Story file via native share
  const shareStoryFile = useCallback(
    async (file: File, data: StoryShareData, options?: ShareOptions) => {
      // Track analytics
      if (options?.businessId) {
        trackEngagement(options.businessId, 'share', options.objectType || 'event', options.objectId || '', {
          channel: 'instagram_stories',
          source: 'story_preview',
        });
      }

      if (!hasNativeShare()) {
        toast.info(t.shareNotSupported);
        return;
      }

      try {
        const shareData = {
          files: [file],
          title: data.title,
          url: data.url,
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          // Fallback to text-only share
          await navigator.share({
            title: data.title,
            text: data.text,
            url: data.url,
          });
        }
      } catch (error) {
        const err = error as Error;
        if (err?.name === 'AbortError') return;

        console.error('Story share failed:', error);
        const success = await copyToClipboard(data.url);
        if (success) {
          toast.success(t.shareNotSupported);
        }
      }
    },
    [copyToClipboard, t]
  );

  // Download Story file to device (supports both image and video)
  const downloadStoryFile = useCallback((file: File, title: string) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    
    // Detect file type from MIME type
    const isVideo = file.type.startsWith('video/');
    const extension = isVideo ? 'mp4' : 'png';
    link.download = `${title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-story.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    const message = isVideo 
      ? (language === 'el' ? 'Το βίντεο αποθηκεύτηκε!' : 'Video saved!')
      : (language === 'el' ? 'Η εικόνα αποθηκεύτηκε!' : 'Image saved!');
    toast.success(message);
  }, [language]);

  return {
    isSharing,
    share,
    copyLink,
    shareToInstagramStories,
    shareToWhatsApp,
    shareToMessenger,
    generateStoryPreview,
    shareStoryFile,
    downloadStoryFile,
    hasNativeShare: hasNativeShare(),
  };
};
