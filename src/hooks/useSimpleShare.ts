import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { trackEngagement } from '@/lib/analyticsTracking';

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
  },
  en: {
    linkCopied: 'Link copied!',
    shareSuccess: 'Shared! 🎉',
    shareFailed: 'Share cancelled',
    shareNotSupported: 'Link copied to clipboard',
  },
};

interface ShareData {
  title: string;
  text: string;
  url: string;
}

interface ShareOptions {
  objectType?: ShareObjectType;
  objectId?: string;
  businessId?: string;
}

interface UseSimpleShareReturn {
  isSharing: boolean;
  share: (data: ShareData, options?: ShareOptions) => Promise<void>;
  copyLink: (url: string, options?: ShareOptions) => Promise<void>;
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
        if (hasNativeShare()) {
          await navigator.share({
            title: data.title,
            text: data.text,
            url: data.url,
          });
          // User successfully shared (didn't cancel)
        } else {
          // Fallback: copy link to clipboard
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

  return {
    isSharing,
    share,
    copyLink,
    hasNativeShare: hasNativeShare(),
  };
};
