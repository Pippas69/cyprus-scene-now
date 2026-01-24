import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useShare, isMobile, hasNativeShare, formatEventShareText, formatBusinessShareText, getEventUrlFallback, getBusinessUrlFallback, ShareChannel } from '@/hooks/useShare';
import { ShareableEventCard } from './ShareableEventCard';
import { ShareableBusinessCard } from './ShareableBusinessCard';

import instagramIcon from '@/assets/icons/instagram.png';
import telegramIcon from '@/assets/icons/telegram.png';
import snapchatIcon from '@/assets/icons/snapchat.png';

// Brand icons with exact sizing matching the reference
const ICON_SIZE = 44;

const WhatsAppIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="24" fill="#25D366" />
    <path
      d="M34.944 28.764c-.594-.298-3.516-1.734-4.06-1.934-.546-.198-.942-.296-1.34.3-.394.594-1.534 1.932-1.88 2.328-.346.398-.694.446-1.288.15-.594-.3-2.51-.926-4.78-2.95-1.766-1.576-2.96-3.522-3.306-4.118-.346-.594-.036-.916.26-1.212.268-.266.596-.694.892-1.04.298-.348.396-.596.596-.994.198-.396.1-.742-.05-1.04-.15-.298-1.338-3.224-1.832-4.414-.484-1.158-.974-1-.1338-1.02-.346-.016-.742-.02-1.14-.02-.396 0-1.04.148-1.584.744-.544.594-2.08 2.032-2.08 4.958 0 2.924 2.13 5.75 2.426 6.148.298.396 4.192 6.4 10.154 8.974 1.418.612 2.524.978 3.388 1.25 1.424.452 2.72.388 3.742.236 1.142-.17 3.516-1.438 4.012-2.826.496-1.388.496-2.578.346-2.826-.148-.248-.546-.396-1.14-.694z"
      fill="white"
    />
  </svg>
);

const InstagramIcon = () => (
  <img
    src={instagramIcon}
    alt="Instagram"
    draggable={false}
    className="select-none object-contain"
    style={{ width: ICON_SIZE, height: ICON_SIZE }}
  />
);

const MessengerIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="messenger-gradient-sheet" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0099FF" />
        <stop offset="100%" stopColor="#A033FF" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="24" fill="url(#messenger-gradient-sheet)" />
    <path
      d="M24 10C16 10 9 16.28 9 24c0 4.06 2.02 7.68 5.18 10.06V39l4.76-2.62c1.28.36 2.62.56 4.06.56 8 0 15-6.28 15-14S32 10 24 10zm1.5 18.88l-3.82-4.08-7.44 4.08 8.18-8.68 3.92 4.08 7.34-4.08-8.18 8.68z"
      fill="white"
    />
  </svg>
);

const TelegramIcon = () => (
  <img
    src={telegramIcon}
    alt="Telegram"
    draggable={false}
    className="select-none object-contain"
    style={{ width: ICON_SIZE + 4, height: ICON_SIZE + 4 }}
  />
);

const SnapchatIcon = () => (
  <img
    src={snapchatIcon}
    alt="Snapchat"
    draggable={false}
    className="select-none object-contain"
    style={{ width: ICON_SIZE + 4, height: ICON_SIZE + 4 }}
  />
);

const FacebookIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path
      d="M16.5 12.049l.41-2.67h-2.56v-1.73c0-.73.36-1.44 1.5-1.44h1.16v-2.27s-1.06-.18-2.07-.18c-2.11 0-3.49 1.28-3.49 3.6v2.03h-2.35v2.67h2.35v6.45a9.36 9.36 0 002.89 0v-6.45h2.15z"
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
    <div className="w-14 h-14 flex items-center justify-center">
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

        {/* Send to friend section */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-4">{t.sendToFriend}</h4>
          <div className="flex items-start justify-between gap-2">
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
                <div className="w-8 h-8 flex items-center justify-center">
                  <img src={instagramIcon} alt="" className="w-7 h-7 object-contain" />
                </div>
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
                <div className="w-8 h-8 flex items-center justify-center">
                  <FacebookIcon size={28} />
                </div>
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
