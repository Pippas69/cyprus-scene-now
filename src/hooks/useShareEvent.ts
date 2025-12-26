import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { trackEngagement } from '@/lib/analyticsTracking';

export type SharePlatform = 
  | 'instagram-story' 
  | 'facebook-story' 
  | 'snapchat' 
  | 'facebook' 
  | 'twitter' 
  | 'linkedin' 
  | 'whatsapp' 
  | 'telegram' 
  | 'messenger' 
  | 'email' 
  | 'copy' 
  | 'native';

export type ShareType = 'story' | 'post' | 'dm' | 'other';

interface ShareEventData {
  id: string;
  title: string;
  description?: string;
  location: string;
  startAt: string;
  coverImageUrl?: string;
  businessName?: string;
  businessId?: string;
}

interface UseShareEventReturn {
  isSharing: boolean;
  shareToplatform: (platform: SharePlatform, eventData: ShareEventData) => Promise<void>;
  generateShareImage: (elementRef: React.RefObject<HTMLElement>) => Promise<string | null>;
  downloadImage: (dataUrl: string, filename: string) => void;
}

const getShareType = (platform: SharePlatform): ShareType => {
  if (['instagram-story', 'facebook-story', 'snapchat'].includes(platform)) return 'story';
  if (['facebook', 'twitter', 'linkedin'].includes(platform)) return 'post';
  if (['whatsapp', 'telegram', 'messenger'].includes(platform)) return 'dm';
  return 'other';
};

export const useShareEvent = (): UseShareEventReturn => {
  const [isSharing, setIsSharing] = useState(false);

  const generateShareImage = useCallback(async (elementRef: React.RefObject<HTMLElement>): Promise<string | null> => {
    if (!elementRef.current) return null;
    
    try {
      const canvas = await html2canvas(elementRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to generate share image:', error);
      return null;
    }
  }, []);

  const downloadImage = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const getEventUrl = (eventId: string) => {
    return `${window.location.origin}/event/${eventId}`;
  };

  const formatShareText = (eventData: ShareEventData, language: 'el' | 'en' = 'en') => {
    const date = new Date(eventData.startAt);
    const dateStr = date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    
    const prefix = language === 'el' ? 'Δες αυτό το event!' : 'Check out this event!';
    return `${prefix} ${eventData.title} - ${dateStr} @ ${eventData.location}`;
  };

  const shareToplatform = useCallback(async (platform: SharePlatform, eventData: ShareEventData) => {
    setIsSharing(true);
    const eventUrl = getEventUrl(eventData.id);
    const shareText = formatShareText(eventData);
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(eventUrl);
    const shareType = getShareType(platform);

    // Track the share attempt
    if (eventData.businessId) {
      trackEngagement(eventData.businessId, 'share', 'event', eventData.id, {
        platform,
        shareType,
      });
    }

    try {
      switch (platform) {
        case 'instagram-story':
          // Instagram doesn't have direct URL sharing for stories
          // User needs to download the image and share manually
          toast.info('Download the image and share it to your Instagram Story!');
          break;

        case 'facebook-story':
          window.open(`https://www.facebook.com/stories/create`, '_blank');
          toast.info('Share the image to your Facebook Story!');
          break;

        case 'snapchat':
          window.open(`https://www.snapchat.com/scan`, '_blank');
          toast.info('Share the image to your Snapchat Story!');
          break;

        case 'facebook':
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            '_blank',
            'width=600,height=400'
          );
          break;

        case 'twitter':
          window.open(
            `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
            '_blank',
            'width=600,height=400'
          );
          break;

        case 'linkedin':
          window.open(
            `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodeURIComponent(eventData.title)}&summary=${encodeURIComponent(eventData.description || '')}`,
            '_blank',
            'width=600,height=400'
          );
          break;

        case 'whatsapp':
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            window.open(`whatsapp://send?text=${encodedText}%20${encodedUrl}`, '_blank');
          } else {
            window.open(
              `https://web.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
              '_blank'
            );
          }
          break;

        case 'telegram':
          window.open(
            `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
            '_blank'
          );
          break;

        case 'messenger':
          window.open(
            `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodedUrl}`,
            '_blank',
            'width=600,height=400'
          );
          break;

        case 'email':
          const emailSubject = encodeURIComponent(`Check out: ${eventData.title}`);
          const emailBody = encodeURIComponent(
            `${shareText}\n\n${eventUrl}`
          );
          window.location.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;
          break;

        case 'copy':
          await navigator.clipboard.writeText(eventUrl);
          toast.success('Link copied to clipboard!');
          break;

        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: eventData.title,
              text: shareText,
              url: eventUrl,
            });
          } else {
            await navigator.clipboard.writeText(eventUrl);
            toast.success('Link copied to clipboard!');
          }
          break;
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback to copy
      try {
        await navigator.clipboard.writeText(eventUrl);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Failed to share');
      }
    } finally {
      setIsSharing(false);
    }
  }, []);

  return {
    isSharing,
    shareToplatform,
    generateShareImage,
    downloadImage,
  };
};
