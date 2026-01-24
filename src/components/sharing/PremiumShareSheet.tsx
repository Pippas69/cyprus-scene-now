import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useShare, isMobile, hasNativeShare, formatEventShareText, formatBusinessShareText, getEventUrlFallback, getBusinessUrlFallback, ShareChannel } from '@/hooks/useShare';
import { ShareableEventCard } from './ShareableEventCard';
import { ShareableBusinessCard } from './ShareableBusinessCard';

// Exact brand icons as rounded rectangles matching the reference images
const ICON_SIZE = 48;

// Instagram - gradient pink/purple/orange rounded square with camera icon
const InstagramIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="instagram-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="15%" stopColor="#FCAF45" />
        <stop offset="35%" stopColor="#F77737" />
        <stop offset="55%" stopColor="#F56040" />
        <stop offset="70%" stopColor="#FD1D1D" />
        <stop offset="85%" stopColor="#E1306C" />
        <stop offset="100%" stopColor="#C13584" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#instagram-grad)" />
    <rect x="12" y="12" width="24" height="24" rx="6" stroke="white" strokeWidth="2.5" fill="none" />
    <circle cx="24" cy="24" r="5.5" stroke="white" strokeWidth="2.5" fill="none" />
    <circle cx="31" cy="17" r="2" fill="white" />
  </svg>
);

// Messenger - gradient purple/blue rounded square  
const MessengerIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="messenger-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0099FF" />
        <stop offset="50%" stopColor="#A033FF" />
        <stop offset="100%" stopColor="#FF5C87" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#messenger-grad)" />
    <path
      d="M24 10C16.268 10 10 15.73 10 22.92c0 3.906 1.916 7.394 4.916 9.72V38l5.09-2.792c1.362.376 2.806.58 4.294.58 7.732 0 14-5.73 14-12.868C38.3 15.73 31.732 10 24 10zm1.434 17.356l-3.572-3.812-6.974 3.812 7.67-8.14 3.66 3.812 6.886-3.812-7.67 8.14z"
      fill="white"
    />
  </svg>
);

// WhatsApp - green rounded square with phone icon
const WhatsAppIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 48 48" fill="none">
    <rect x="0" y="0" width="48" height="48" rx="12" fill="#25D366" />
    <path
      d="M34.6 13.3C31.7 10.4 27.9 8.8 24 8.8c-8.1 0-14.7 6.6-14.7 14.7 0 2.6.7 5.1 1.9 7.3L9.3 39l8.4-2.2c2.1 1.2 4.5 1.8 6.9 1.8h0c8.1 0 14.7-6.6 14.7-14.7.1-3.9-1.5-7.6-4.4-10.5l-.3-.1zm-10.6 22.6c-2.2 0-4.3-.6-6.2-1.7l-.4-.3-4.5 1.2 1.2-4.4-.3-.5c-1.2-1.9-1.8-4.1-1.8-6.4 0-6.6 5.4-12 12-12 3.2 0 6.2 1.3 8.5 3.5 2.3 2.3 3.5 5.3 3.5 8.5 0 6.6-5.4 12-12 12zm6.6-9c-.4-.2-2.1-1.1-2.5-1.2-.4-.1-.6-.2-.9.2-.2.4-1 1.2-1.2 1.4-.2.2-.5.3-.9.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.3-2.1-2.7-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.2-.4.4-.6.1-.2.1-.5 0-.7-.1-.2-1-2.3-1.3-3.2-.3-.8-.7-.7-.9-.7h-.8c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.4 3.6c.1.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .8.8.2 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.2-.3-.3-.7-.5z"
      fill="white"
    />
  </svg>
);

// Snapchat - yellow rounded square with ghost outline
const SnapchatIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 48 48" fill="none">
    <rect x="0" y="0" width="48" height="48" rx="12" fill="#FFFC00" />
    <path
      d="M24.03 10.5c2.55 0 4.65.87 6.24 2.58 1.26 1.35 1.95 3.15 2.1 5.37.03.45.03.9 0 1.35-.03.3-.06.6-.06.87.24.06.51.09.78.09.45 0 .78-.09 1.02-.18.15-.06.3-.12.48-.12.36 0 .72.27.72.69 0 .33-.18.57-.42.72-.6.39-1.38.63-2.22.81-.03.12-.06.27-.09.42-.06.33-.12.69-.12.96 0 .18.06.3.24.39.42.18.9.36 1.47.54.99.33 2.22.75 2.73 1.41.21.27.27.54.18.84-.27.63-1.26 1.05-2.94 1.26-.09.03-.15.06-.21.21-.09.27-.18.57-.3.87-.12.3-.33.45-.57.45-.06 0-.12 0-.18-.03-.36-.09-.75-.33-1.26-.54-.66-.27-1.47-.57-2.52-.57-.42 0-.84.06-1.26.18-.78.27-1.47.75-2.19 1.32-1.08.84-2.22 1.71-3.93 1.71s-2.85-.87-3.93-1.71c-.72-.57-1.41-1.05-2.19-1.32-.42-.12-.84-.18-1.26-.18-1.05 0-1.86.3-2.52.57-.51.21-.9.45-1.26.54-.06.03-.12.03-.18.03-.24 0-.45-.15-.57-.45-.12-.3-.21-.6-.3-.87-.06-.15-.12-.18-.21-.21-1.68-.21-2.67-.63-2.94-1.26-.09-.3-.03-.57.18-.84.51-.66 1.74-1.08 2.73-1.41.57-.18 1.05-.36 1.47-.54.18-.09.24-.21.24-.39 0-.27-.06-.63-.12-.96-.03-.15-.06-.3-.09-.42-.84-.18-1.62-.42-2.22-.81-.24-.15-.42-.39-.42-.72 0-.42.36-.69.72-.69.18 0 .33.06.48.12.24.09.57.18 1.02.18.27 0 .54-.03.78-.09 0-.27-.03-.57-.06-.87-.03-.45-.03-.9 0-1.35.15-2.22.84-4.02 2.1-5.37 1.59-1.71 3.69-2.58 6.24-2.58z"
      fill="none"
      stroke="white"
      strokeWidth="1.8"
    />
  </svg>
);

// Telegram - light blue rounded square with paper plane
const TelegramIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 48 48" fill="none">
    <rect x="0" y="0" width="48" height="48" rx="12" fill="#29B6F6" />
    <path
      d="M35.3 13.2L10.9 22.8c-1.7.7-1.6 1.6-.3 2l6.3 2 2.4 7.3c.3.8.5.9 1.1.9.5 0 .7-.2 1-.5l2.9-2.8 6.1 4.5c1.1.6 1.9.3 2.2-.9l4-18.9c.4-1.7-.6-2.4-1.8-1.9zM19.7 26.8l-.5 5.3-.1.1-1.4-4.5 12.5-7.9-10.5 7z"
      fill="white"
    />
  </svg>
);

// Facebook - blue rounded square with F
const FacebookIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect x="0" y="0" width="48" height="48" rx="10" fill="#1877F2" />
    <path
      d="M32.5 24.06l.68-4.45h-4.27v-2.89c0-1.22.6-2.4 2.5-2.4h1.94V10.4s-1.76-.3-3.45-.3c-3.52 0-5.82 2.13-5.82 6v3.38h-3.91v4.45h3.91V38.4a15.56 15.56 0 004.82 0V24.06h3.6z"
      fill="white"
    />
  </svg>
);

// Types
interface ShareSheetEvent {
  id: string;
  title: string;
  description?: string;
  location: string;
  start_at: string;
  cover_image_url?: string;
  businesses?: {
    id: string;
    name: string;
  };
}

interface ShareSheetBusiness {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
}

interface PremiumShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'event' | 'business';
  event?: ShareSheetEvent;
  business?: ShareSheetBusiness;
  language: 'el' | 'en';
}

// Translations
const translations = {
  el: {
    share: 'Κοινοποίηση',
    sendToFriend: 'Στείλε σε φίλο',
    forStory: 'Για Story',
    instagramStory: 'Instagram Story',
    facebookStory: 'Facebook Story',
    moreOptions: 'Περισσότερες επιλογές...',
  },
  en: {
    share: 'Share',
    sendToFriend: 'Send to a friend',
    forStory: 'For Story',
    instagramStory: 'Instagram Story',
    facebookStory: 'Facebook Story',
    moreOptions: 'More options...',
  },
};

// Circular icon button for send to friend section
const SocialIconButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.FC;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex flex-col items-center gap-1.5 flex-shrink-0',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    )}
  >
    <div className="flex items-center justify-center">
      <Icon />
    </div>
    <span className="text-[11px] font-medium text-foreground text-center leading-tight">
      {label}
    </span>
  </motion.button>
);

export const PremiumShareSheet = ({
  open,
  onOpenChange,
  type,
  event,
  business,
  language,
}: PremiumShareSheetProps) => {
  const t = translations[language];
  const { shareToChannel, generateStoryImage, downloadImage, isSharing } = useShare(language);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(!isMobile());
  }, []);

  // Prepare share data
  const getShareUrl = useCallback(() => {
    if (type === 'event' && event) {
      return getEventUrlFallback(event.id);
    }
    if (type === 'business' && business) {
      return getBusinessUrlFallback(business.id);
    }
    return window.location.href;
  }, [type, event, business]);

  const getShareText = useCallback(() => {
    if (type === 'event' && event) {
      return formatEventShareText({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startAt: event.start_at,
        coverImageUrl: event.cover_image_url,
        businessName: event.businesses?.name,
        businessId: event.businesses?.id,
      }, language);
    }
    if (type === 'business' && business) {
      return formatBusinessShareText({
        id: business.id,
        name: business.name,
        city: business.city ?? undefined,
        address: business.address ?? undefined,
        logoUrl: business.logo_url ?? undefined,
        coverUrl: business.cover_url ?? undefined,
      }, language);
    }
    return '';
  }, [type, event, business, language]);

  const getShareOptions = useCallback(() => {
    return {
      title: type === 'event' ? event?.title : business?.name,
      objectType: type as 'event' | 'business',
      objectId: type === 'event' ? event?.id : business?.id,
      businessId: type === 'event' ? event?.businesses?.id : business?.id,
    };
  }, [type, event, business]);

  // Handle story image download
  const handleDownloadStoryImage = useCallback(async () => {
    const imageUrl = await generateStoryImage(storyCardRef);
    if (imageUrl) {
      const filename = type === 'event'
        ? `${event?.title?.replace(/\s+/g, '-').toLowerCase() || 'event'}-story.png`
        : `${business?.name?.replace(/\s+/g, '-').toLowerCase() || 'business'}-story.png`;
      downloadImage(imageUrl, filename);
    }
  }, [type, event, business, generateStoryImage, downloadImage]);

  // Share handlers
  const handleShare = useCallback(async (channel: ShareChannel) => {
    await shareToChannel(channel, getShareUrl(), getShareText(), {
      ...getShareOptions(),
      onImageDownload: handleDownloadStoryImage,
    });
  }, [shareToChannel, getShareUrl, getShareText, getShareOptions, handleDownloadStoryImage]);

  // Format date for preview
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  };

  // Image Preview Card - exactly like the reference image
  const ImagePreviewCard = () => {
    if (type === 'event' && event) {
      return (
        <div className="relative w-full h-40 rounded-2xl overflow-hidden">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-aegean to-seafoam flex items-center justify-center">
              <span className="text-4xl">🌊</span>
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white/90 text-sm font-medium">
              {formatDate(event.start_at)}
            </p>
            <h3 className="text-white font-bold text-lg leading-tight">
              {event.businesses?.name || event.location}
            </h3>
          </div>
        </div>
      );
    }

    if (type === 'business' && business) {
      const coverImage = business.cover_url || business.logo_url;
      return (
        <div className="relative w-full h-40 rounded-2xl overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-aegean to-seafoam flex items-center justify-center">
              <span className="text-4xl">🏷️</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-lg leading-tight">
              {business.name}
            </h3>
            {business.city && (
              <p className="text-white/90 text-sm font-medium">
                {business.city}
              </p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Main share content matching the reference design exactly
  const ShareContent = () => (
    <div className="flex flex-col">
      {/* Header with title and close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="w-8" /> {/* Spacer for centering */}
        <h2 className="text-base font-semibold text-foreground">{t.share}</h2>
        <button
          onClick={() => onOpenChange(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Image Preview Card */}
        <ImagePreviewCard />

        {/* Send to friend section - 5 icons in a row with equal spacing */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-4">{t.sendToFriend}</h4>
          <div className="flex items-start justify-between px-1">
            <SocialIconButton
              icon={InstagramIcon}
              label="Instagram"
              onClick={() => handleShare('instagram')}
              disabled={isSharing}
            />
            <SocialIconButton
              icon={MessengerIcon}
              label="Messenger"
              onClick={() => handleShare('messenger')}
              disabled={isSharing}
            />
            <SocialIconButton
              icon={WhatsAppIcon}
              label="WhatsApp"
              onClick={() => handleShare('whatsapp')}
              disabled={isSharing}
            />
            <SocialIconButton
              icon={SnapchatIcon}
              label="Snapchat"
              onClick={() => handleShare('snapchat')}
              disabled={isSharing}
            />
            <SocialIconButton
              icon={TelegramIcon}
              label="Telegram"
              onClick={() => handleShare('telegram')}
              disabled={isSharing}
            />
          </div>
        </div>

        {/* For Story section - full width buttons with chevrons */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">{t.forStory}</h4>
          <div className="space-y-2">
            {/* Instagram Story button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleShare('instagram-story')}
              disabled={isSharing}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3.5 rounded-xl',
                'bg-muted/50 hover:bg-muted transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                <svg width={28} height={28} viewBox="0 0 48 48" fill="none">
                  <defs>
                    <linearGradient id="ig-story-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FFDC80" />
                      <stop offset="15%" stopColor="#FCAF45" />
                      <stop offset="35%" stopColor="#F77737" />
                      <stop offset="55%" stopColor="#F56040" />
                      <stop offset="70%" stopColor="#FD1D1D" />
                      <stop offset="85%" stopColor="#E1306C" />
                      <stop offset="100%" stopColor="#C13584" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#ig-story-grad)" />
                  <rect x="12" y="12" width="24" height="24" rx="6" stroke="white" strokeWidth="2.5" fill="none" />
                  <circle cx="24" cy="24" r="5.5" stroke="white" strokeWidth="2.5" fill="none" />
                  <circle cx="31" cy="17" r="2" fill="white" />
                </svg>
                <span className="text-sm font-medium text-foreground">{t.instagramStory}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </motion.button>

            {/* Facebook Story button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleShare('facebook-story')}
              disabled={isSharing}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3.5 rounded-xl',
                'bg-muted/50 hover:bg-muted transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                <FacebookIcon size={28} />
                <span className="text-sm font-medium text-foreground">{t.facebookStory}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </motion.button>
          </div>
        </div>

        {/* More options link at the bottom */}
        <button
          type="button"
          onClick={() => handleShare('native')}
          disabled={isSharing || !hasNativeShare()}
          className={cn(
            'text-sm text-muted-foreground hover:text-foreground transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {t.moreOptions}
        </button>
      </div>
    </div>
  );

  // Hidden story card for image generation
  const HiddenStoryCard = () => (
    <div className="fixed -left-[9999px] top-0 pointer-events-none">
      {type === 'event' && event && (
        <ShareableEventCard
          ref={storyCardRef}
          event={{
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location,
            startAt: event.start_at,
            coverImageUrl: event.cover_image_url,
            businessName: event.businesses?.name,
          }}
          variant="story"
          language={language}
        />
      )}
      {type === 'business' && business && (
        <ShareableBusinessCard
          ref={storyCardRef}
          business={{
            id: business.id,
            name: business.name,
            city: business.city ?? undefined,
            address: business.address ?? undefined,
            logoUrl: business.logo_url ?? undefined,
            coverUrl: business.cover_url ?? undefined,
          }}
          variant="story"
          language={language}
        />
      )}
    </div>
  );

  // Desktop uses Dialog
  if (isDesktop) {
    return (
      <>
        <HiddenStoryCard />
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl overflow-hidden">
            <ShareContent />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Mobile uses Drawer (bottom sheet)
  return (
    <>
      <HiddenStoryCard />
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] rounded-t-2xl">
          <ShareContent />
          {/* Safe area bottom padding */}
          <div className="h-6" />
        </DrawerContent>
      </Drawer>
    </>
  );
};
