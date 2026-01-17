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

interface ShareBusinessData {
  id: string;
  name: string;
  city?: string;
  address?: string;
  logoUrl?: string;
  coverUrl?: string;
}

interface UseShareProfileReturn {
  isSharing: boolean;
  shareToPlatform: (platform: SharePlatform, businessData: ShareBusinessData) => Promise<void>;
  generateShareImage: (elementRef: React.RefObject<HTMLElement>) => Promise<string | null>;
  downloadImage: (dataUrl: string, filename: string) => void;
}

const getShareType = (platform: SharePlatform): ShareType => {
  if (['instagram-story', 'facebook-story', 'snapchat'].includes(platform)) return 'story';
  if (['facebook', 'twitter', 'linkedin'].includes(platform)) return 'post';
  if (['whatsapp', 'telegram', 'messenger'].includes(platform)) return 'dm';
  return 'other';
};

export const useShareProfile = (): UseShareProfileReturn => {
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

  const getBusinessUrl = (businessId: string) => `${window.location.origin}/business/${businessId}`;

  const formatShareText = (business: ShareBusinessData, language: 'el' | 'en' = 'el') => {
    const prefix = language === 'el' ? 'Δες αυτό το προφίλ επιχείρησης!' : 'Check out this business profile!';
    const location = [business.city, business.address].filter(Boolean).join(' • ');
    return location ? `${prefix} ${business.name} - ${location}` : `${prefix} ${business.name}`;
  };

  const shareToPlatform = useCallback(async (platform: SharePlatform, business: ShareBusinessData) => {
    setIsSharing(true);

    const url = getBusinessUrl(business.id);
    const shareType = getShareType(platform);
    const shareText = formatShareText(business, 'el');
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(url);

    // Track share attempt
    trackEngagement(business.id, 'share', 'business', business.id, {
      platform,
      shareType,
    });

    try {
      switch (platform) {
        case 'instagram-story':
          if (navigator.share) {
            await navigator.share({ title: business.name, text: shareText, url });
          } else {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) window.open('instagram://story-camera', '_blank');
            toast.info('Κατεβάστε την εικόνα και μοιραστείτε την στο Instagram Story!');
          }
          break;

        case 'facebook-story': {
          const fbStoryUrl = `https://www.facebook.com/dialog/share?app_id=966242223397117&display=popup&href=${encodedUrl}&quote=${encodedText}`;
          window.open(fbStoryUrl, '_blank', 'width=600,height=500');
          break;
        }

        case 'snapchat': {
          const snapchatUrl = `https://www.snapchat.com/share?url=${encodedUrl}`;
          window.open(snapchatUrl, '_blank', 'width=600,height=500');
          break;
        }

        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'width=600,height=500');
          break;

        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'width=600,height=500');
          break;

        case 'linkedin':
          window.open(
            `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodeURIComponent(business.name)}`,
            '_blank',
            'width=600,height=500'
          );
          break;

        case 'whatsapp': {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            window.open(`whatsapp://send?text=${encodedText}%20${encodedUrl}`, '_blank');
          } else {
            window.open(`https://web.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank');
          }
          break;
        }

        case 'telegram':
          window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
          break;

        case 'messenger': {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            window.open(`fb-messenger://share/?link=${encodedUrl}`, '_blank');
          } else {
            window.open(
              `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.origin)}`,
              '_blank',
              'width=600,height=500'
            );
          }
          break;
        }

        case 'email': {
          const subject = encodeURIComponent(`Δες: ${business.name}`);
          const body = encodeURIComponent(`${shareText}\n\n${url}`);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
          break;
        }

        case 'copy':
          await navigator.clipboard.writeText(url);
          toast.success('Αντιγράφηκε!');
          break;

        case 'native':
          if (navigator.share) {
            await navigator.share({ title: business.name, text: shareText, url });
          } else {
            await navigator.clipboard.writeText(url);
            toast.success('Αντιγράφηκε!');
          }
          break;
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Αποτυχία κοινοποίησης');
    } finally {
      setIsSharing(false);
    }
  }, []);

  return { isSharing, shareToPlatform, generateShareImage, downloadImage };
};
