import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { trackEngagement } from '@/lib/analyticsTracking';

// Types
export type ShareChannel = 
  | 'instagram'
  | 'messenger'
  | 'sms'
  | 'whatsapp'
  | 'snapchat'
  | 'telegram'
  | 'instagram-story'
  | 'facebook-story'
  | 'copy'
  | 'download-story'
  | 'native'
  | 'whatsapp-web'
  | 'telegram-web';

export type ShareObjectType = 'event' | 'discount' | 'business';

export interface ShareEventData {
  id: string;
  title: string;
  description?: string;
  location: string;
  startAt: string;
  endAt?: string;
  coverImageUrl?: string;
  businessName?: string;
  businessId?: string;
}

export interface ShareBusinessData {
  id: string;
  name: string;
  city?: string;
  address?: string;
  logoUrl?: string;
  coverUrl?: string;
}

export interface ShareOfferData {
  id: string;
  title: string;
  validUntil?: string;
  businessId: string;
  businessName?: string;
}

// Device detection utilities
export const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
export const isAndroid = () => /Android/i.test(navigator.userAgent);
export const hasNativeShare = () => typeof navigator !== 'undefined' && 'share' in navigator;

// Check if Web Share API supports file sharing (for native story sharing)
// More permissive check for iOS Safari 15+ and PWA where canShare may not exist
export const canShareFiles = (): boolean => {
  // Check basic requirements
  if (typeof navigator === 'undefined') return false;
  if (!('share' in navigator)) return false;
  
  // On iOS Safari 15+, canShare may not exist but share with files works
  // On Android Chrome 76+, both work
  // Skip the test if canShare doesn't exist - just try sharing
  if (typeof navigator.canShare !== 'function') {
    // iOS Safari may not have canShare but still supports file sharing
    // Return true and let the actual share call handle errors
    return 'share' in navigator && isMobile();
  }
  
  try {
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    // Some browsers throw on canShare - still try sharing on mobile
    return isMobile();
  }
};

// Convert DataURL to File object for Web Share API
export const dataURLtoFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
};

// Canonical URL generators (using fomo.cy domain for future-proofing)
const CANONICAL_DOMAIN = 'https://fomo.cy';

export const getEventUrl = (eventId: string) => `${CANONICAL_DOMAIN}/e/${eventId}`;
export const getOfferUrl = (offerId: string) => `${CANONICAL_DOMAIN}/o/${offerId}`;
export const getVenueUrl = (venueId: string) => `${CANONICAL_DOMAIN}/v/${venueId}`;
export const getBusinessUrl = (businessId: string) => `${CANONICAL_DOMAIN}/v/${businessId}`;

// Fallback URLs using current origin (for now, until canonical domain is set up)
export const getEventUrlFallback = (eventId: string) => `${window.location.origin}/event/${eventId}`;
export const getOfferUrlFallback = (offerId: string) => `${window.location.origin}/offer/${offerId}`;
export const getBusinessUrlFallback = (businessId: string) => `${window.location.origin}/business/${businessId}`;

// Share text formatters
export const formatEventShareText = (event: ShareEventData, language: 'el' | 'en' = 'el'): string => {
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
  const url = getEventUrlFallback(event.id);
  
  if (language === 'el') {
    return `${event.title} — ${dateStr}, ${timeStr} ${venueInfo}\nΔες λεπτομέρειες/εισιτήρια στο ΦΟΜΟ: ${url}`;
  }
  return `${event.title} — ${dateStr}, ${timeStr} ${venueInfo}\nSee details/tickets on ΦΟΜΟ: ${url}`;
};

export const formatBusinessShareText = (business: ShareBusinessData, language: 'el' | 'en' = 'el'): string => {
  const url = getBusinessUrlFallback(business.id);
  
  if (language === 'el') {
    return `Αυτό παίζει τώρα στο ΦΟΜΟ 👀\n${business.name}\n${url}`;
  }
  return `Check this out on ΦΟΜΟ 👀\n${business.name}\n${url}`;
};

export const formatOfferShareText = (offer: ShareOfferData, language: 'el' | 'en' = 'el'): string => {
  const url = getOfferUrlFallback(offer.id);
  const validUntil = offer.validUntil 
    ? new Date(offer.validUntil).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')
    : null;
  
  if (language === 'el') {
    return `Προσφορά στο ${offer.businessName || 'ΦΟΜΟ'} 🔥${validUntil ? `\nΙσχύει μέχρι ${validUntil}` : ''}\n${url}`;
  }
  return `Deal at ${offer.businessName || 'ΦΟΜΟ'} 🔥${validUntil ? `\nValid until ${validUntil}` : ''}\n${url}`;
};

interface UseShareReturn {
  isSharing: boolean;
  shareToChannel: (
    channel: ShareChannel,
    url: string,
    text: string,
    options?: {
      title?: string;
      objectType?: ShareObjectType;
      objectId?: string;
      businessId?: string;
      onImageDownload?: () => Promise<void>;
      onGenerateImage?: () => Promise<string | null>;
    }
  ) => Promise<void>;
  generateStoryImage: (elementRef: React.RefObject<HTMLElement>) => Promise<string | null>;
  downloadImage: (dataUrl: string, filename: string) => void;
}

// Toast messages (bilingual)
const toasts = {
  el: {
    linkCopied: 'Το link αντιγράφηκε',
    imageSaved: 'Η εικόνα αποθηκεύτηκε',
    openingWhatsApp: 'Άνοιξε το WhatsApp…',
    openingMessenger: 'Άνοιξε το Messenger…',
    openingTelegram: 'Άνοιξε το Telegram…',
    openingInstagram: 'Άνοιξε το Instagram…',
    openingSnapchat: 'Άνοιξε το Snapchat…',
    storyInstruction: 'Ανέβασε την εικόνα στο Story και πρόσθεσε το link',
    shareFailed: 'Αποτυχία κοινοποίησης',
    nativeShareSuccess: 'Κοινοποιήθηκε! 🎉',
    nativeShareUnavailable: 'Το share sheet δεν υποστηρίζεται εδώ',
    appOpenFailed: 'Δεν άνοιξε η εφαρμογή — δοκίμασε ξανά',
    storyShared: 'Επέλεξε την εφαρμογή για Story',
  },
  en: {
    linkCopied: 'Link copied',
    imageSaved: 'Image saved',
    openingWhatsApp: 'Opening WhatsApp…',
    openingMessenger: 'Opening Messenger…',
    openingTelegram: 'Opening Telegram…',
    openingInstagram: 'Opening Instagram…',
    openingSnapchat: 'Opening Snapchat…',
    storyInstruction: 'Upload the image to your Story and add the link',
    shareFailed: 'Share failed',
    nativeShareSuccess: 'Shared! 🎉',
    nativeShareUnavailable: 'System share is not supported here',
    appOpenFailed: 'Could not open the app — try again',
    storyShared: 'Choose the app for your Story',
  },
};

export const useShare = (language: 'el' | 'en' = 'el'): UseShareReturn => {
  const [isSharing, setIsSharing] = useState(false);
  const t = toasts[language];

  // Try to open an app deep-link. If it doesn't switch away (blocked / not installed), run fallback.
  const tryOpenApp = useCallback(async (
    appUrl: string,
    fallback: () => Promise<void>,
    waitMs = 700
  ) => {
    let switchedAway = false;

    const onBlur = () => {
      switchedAway = true;
    };

    const onVis = () => {
      if (document.hidden) switchedAway = true;
    };

    window.addEventListener('blur', onBlur, { once: true });
    document.addEventListener('visibilitychange', onVis, { once: true });

    // Must happen synchronously after user gesture in most browsers.
    window.location.href = appUrl;

    await new Promise((r) => setTimeout(r, waitMs));

    if (!switchedAway) {
      await fallback();
    }
  }, []);

  // Generate story-ready image (1080x1920)
  const generateStoryImage = useCallback(async (elementRef: React.RefObject<HTMLElement>): Promise<string | null> => {
    if (!elementRef.current) return null;

    try {
      const canvas = await html2canvas(elementRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 3, // High quality for story
        width: 360,
        height: 640,
      });
      
      // Resize to 1080x1920
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = 1080;
      resizedCanvas.height = 1920;
      const ctx = resizedCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, 1080, 1920);
        return resizedCanvas.toDataURL('image/png');
      }
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to generate story image:', error);
      return null;
    }
  }, []);

  // Download image utility
  const downloadImage = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t.imageSaved);
  }, [t]);

  // Copy to clipboard utility
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard write failed:', error);
      return false;
    }
  }, []);

  // Main share function
  const shareToChannel = useCallback(async (
    channel: ShareChannel,
    url: string,
    text: string,
    options?: {
      title?: string;
      objectType?: ShareObjectType;
      objectId?: string;
      businessId?: string;
      onImageDownload?: () => Promise<void>;
      onGenerateImage?: () => Promise<string | null>;
    }
  ) => {
    setIsSharing(true);
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);

    // Track analytics
    if (options?.businessId) {
      trackEngagement(options.businessId, 'share', options.objectType || 'event', options.objectId || '', {
        channel,
        source: 'share_sheet',
      });
    }

    try {
      switch (channel) {
        // === DM PLATFORMS ===
        case 'instagram':
          toast.info(t.openingInstagram);
          if (isMobile()) {
            await tryOpenApp(
              'instagram://direct-inbox',
              async () => {
                // Fallback: open web instagram home (best-effort) without auto-copy
                window.open('https://www.instagram.com/', '_blank');
                toast.error(t.appOpenFailed);
              }
            );
          } else {
            window.open('https://www.instagram.com/', '_blank');
          }
          break;

        case 'messenger':
          if (isMobile()) {
            toast.success(t.openingMessenger);
            await tryOpenApp(
              `fb-messenger://share/?link=${encodedUrl}`,
              async () => {
                // Fallback: Facebook send dialog in browser
                window.open(
                  `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.origin)}`,
                  '_blank',
                  'width=600,height=500'
                );
              }
            );
          } else {
            // Desktop: open Messenger web share dialog
            window.open(
              `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.origin)}`,
              '_blank',
              'width=600,height=500'
            );
          }
          break;

        case 'sms':
          if (isMobile()) {
            // SMS deep link
            const smsBody = encodeURIComponent(`${text}`);
            if (isIOS()) {
              window.location.href = `sms:&body=${smsBody}`;
            } else {
              window.location.href = `sms:?body=${smsBody}`;
            }
          } else {
            // Desktop fallback - copy link
            await copyToClipboard(url);
            toast.success(t.linkCopied);
          }
          break;

        case 'whatsapp':
          toast.success(t.openingWhatsApp);
          if (isMobile()) {
            // Mobile: use whatsapp:// deep link
            setTimeout(() => {
              window.location.href = `whatsapp://send?text=${encodedText}`;
            }, 100);
          } else {
            // Desktop: open WhatsApp Web
            window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
          }
          break;

        case 'whatsapp-web':
          window.open(`https://web.whatsapp.com/send?text=${encodedText}`, '_blank');
          break;

        case 'telegram':
        case 'telegram-web':
          toast.success(t.openingTelegram);
          if (isMobile()) {
            await tryOpenApp(
              `tg://msg_url?url=${encodedUrl}&text=${encodedText}`,
              async () => {
                window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
              }
            );
          } else {
            // Desktop: open Telegram Web share
            window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
          }
          break;

        case 'snapchat':
          toast.info(t.openingSnapchat);
          if (isMobile()) {
            await tryOpenApp(
              'snapchat://',
              async () => {
                // Fallback: open Snapchat web with attachment
                window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`, '_blank');
              }
            );
          } else {
            window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`, '_blank');
          }
          break;

        // === STORY PLATFORMS (Web Share API with files) ===
        case 'instagram-story':
        case 'facebook-story': {
          // ALWAYS generate the image first
          let storyImageDataUrl: string | null = null;
          if (options?.onGenerateImage) {
            storyImageDataUrl = await options.onGenerateImage();
          }
          
          if (!storyImageDataUrl) {
            toast.error(t.shareFailed);
            break;
          }
          
          // Attempt 1: Web Share API with files (works on iOS Safari 15+, Chrome Android 76+)
          const storyFile = dataURLtoFile(storyImageDataUrl, 'fomo-story.png');
          
          try {
            // Build share data with the image file
            const shareData: ShareData = {
              files: [storyFile],
              title: options?.title || 'ΦΟΜΟ',
              text: text,
              url: url,
            };
            
            // Validate share capability if canShare exists
            if (navigator.canShare && !navigator.canShare(shareData)) {
              throw new Error('Cannot share files');
            }
            
            await navigator.share(shareData);
            toast.success(t.storyShared);
            break;
          } catch (e) {
            const error = e as Error;
            
            // User cancelled - stop here
            if (error?.name === 'AbortError') break;
            
            console.log('Web Share API with files failed:', error.message);
            
            // Attempt 2: Try sharing without files (just URL/text) - still opens share sheet
            try {
              await navigator.share({
                title: options?.title || 'ΦΟΜΟ',
                text: text,
                url: url,
              });
              toast.success(t.nativeShareSuccess);
              break;
            } catch (e2) {
              if ((e2 as Error)?.name === 'AbortError') break;
              console.log('Web Share API without files also failed:', e2);
            }
            
            // Attempt 3: Fallback - Save image and copy link (no deep links - they don't work)
            downloadImage(storyImageDataUrl, 'fomo-story.png');
            await copyToClipboard(url);
            toast.info(language === 'el' 
              ? 'Η εικόνα αποθηκεύτηκε και το link αντιγράφηκε! Άνοιξε το Instagram > Stories > Επίλεξε την εικόνα > Πρόσθεσε link sticker'
              : 'Image saved and link copied! Open Instagram > Stories > Select the image > Add link sticker',
              { duration: 6000 }
            );
          }
          break;
        }

        // === UTILITY ===
        case 'copy':
          await copyToClipboard(url);
          toast.success(t.linkCopied);
          break;

        case 'download-story':
          if (options?.onImageDownload) {
            await options.onImageDownload();
          }
          break;

        case 'native':
          if (hasNativeShare()) {
            try {
              await navigator.share({
                title: options?.title || '',
                text: text,
                url: url,
              });
              toast.success(t.nativeShareSuccess);
            } catch (error) {
              // User cancelled or failed
              if ((error as Error)?.name !== 'AbortError') {
                toast.error(t.nativeShareUnavailable);
              }
            }
          } else {
            toast.error(t.nativeShareUnavailable);
          }
          break;
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Always fallback to copy
      try {
        await copyToClipboard(url);
        toast.success(t.linkCopied);
      } catch {
        toast.error(t.shareFailed);
      }
    } finally {
      setIsSharing(false);
    }
  }, [t, copyToClipboard, tryOpenApp]);

  return {
    isSharing,
    shareToChannel,
    generateStoryImage,
    downloadImage,
  };
};
