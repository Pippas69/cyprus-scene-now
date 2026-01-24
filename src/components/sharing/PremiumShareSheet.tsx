import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, MapPin, Download, MoreHorizontal } from 'lucide-react';
import { Drawer, DrawerContent, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useShare, isMobile, hasNativeShare, formatEventShareText, formatBusinessShareText, getEventUrlFallback, getBusinessUrlFallback, ShareChannel } from '@/hooks/useShare';
import { ShareableEventCard } from './ShareableEventCard';
import { ShareableBusinessCard } from './ShareableBusinessCard';

import instagramIcon from '@/assets/icons/instagram.png';
import telegramIcon from '@/assets/icons/telegram.png';
import snapchatIcon from '@/assets/icons/snapchat.png';

// Social Icons with brand colors - consistent sizing for all icons
const ICON_SIZE = 40;
const IG_ICON_SIZE = 44;
const TG_ICON_SIZE = 46;
const SNAP_ICON_SIZE = 46;
// Slightly smaller containers so the row fits better on mobile, while keeping icons large.
const CONTAINER_SIZE = 'w-12 h-12';

const WhatsAppIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#25D366" />
    <path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
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
    style={{ width: IG_ICON_SIZE, height: IG_ICON_SIZE }}
  />
);

const MessengerIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="messenger-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0099FF" />
        <stop offset="100%" stopColor="#A033FF" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="12" fill="url(#messenger-gradient)" />
    <path
      d="M12 5C7.75 5 4.5 7.94 4.5 11.5c0 2.03 1.01 3.84 2.59 5.03v2.47l2.38-1.31c.64.18 1.31.28 2.03.28 4.25 0 7.5-2.94 7.5-6.47S16.25 5 12 5zm.75 8.72l-1.91-2.04-3.72 2.04 4.09-4.34 1.96 2.04 3.67-2.04-4.09 4.34z"
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
    style={{ width: TG_ICON_SIZE, height: TG_ICON_SIZE }}
  />
);

const SnapchatIcon = () => (
  <img
    src={snapchatIcon}
    alt="Snapchat"
    draggable={false}
    className="select-none object-contain"
    style={{ width: SNAP_ICON_SIZE, height: SNAP_ICON_SIZE }}
  />
);

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path
      d="M16.5 12.049l.41-2.67h-2.56v-1.73c0-.73.36-1.44 1.5-1.44h1.16v-2.27s-1.06-.18-2.07-.18c-2.11 0-3.49 1.28-3.49 3.6v2.03h-2.35v2.67h2.35v6.45a9.36 9.36 0 002.89 0v-6.45h2.15z"
      fill="white"
    />
  </svg>
);

const DownloadIcon = () => (
  <Download className="text-primary" size={ICON_SIZE - 6} />
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
    downloadImage: 'Λήψη',
    instagramStory: 'Instagram Story',
    facebookStory: 'Facebook Story',
    moreOptions: 'Περισσότερες επιλογές',
    copyLink: 'Αντιγραφή link',
  },
  en: {
    share: 'Share',
    sendToFriend: 'Send to a friend',
    forStory: 'For Story',
    downloadImage: 'Download',
    instagramStory: 'Instagram Story',
    facebookStory: 'Facebook Story',
    moreOptions: 'More options',
    copyLink: 'Copy link',
  },
};

// Quick action button component (circular icons with horizontal scroll support)
const QuickActionButton = ({
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
      'flex flex-col items-center gap-1 flex-shrink-0',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    )}
  >
    <div className={cn(
      CONTAINER_SIZE,
      'flex items-center justify-center rounded-full bg-background shadow-sm border border-border/50 hover:border-border transition-colors'
    )}>
      <Icon />
    </div>
    <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight whitespace-nowrap">
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
  const quickRowRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check if desktop on mount
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
    const baseOptions = {
      title: type === 'event' ? event?.title : business?.name,
      objectType: type as 'event' | 'business',
      objectId: type === 'event' ? event?.id : business?.id,
      businessId: type === 'event' ? event?.businesses?.id : business?.id,
    };
    return baseOptions;
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

  // Mouse wheel should also scroll the horizontal quick-actions row (desktop mouse support)
  const handleQuickRowWheel = useCallback((e: React.WheelEvent) => {
    const el = quickRowRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  // Format date for preview
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Preview component
  const PreviewCard = () => {
    if (type === 'event' && event) {
      return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-aegean to-seafoam flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🌊</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-sm">{event.title}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(event.start_at)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.businesses?.name || event.location}</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'business' && business) {
      const locationLabel = [business.city, business.address].filter(Boolean).join(' • ');
      return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🏷️</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-sm">{business.name}</h3>
            {locationLabel && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{locationLabel}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Share content component
  const ShareContent = () => (
    <div className="px-4 pb-6 pt-2 space-y-5">
      {/* Preview */}
      <PreviewCard />

      {/* Send to friend section - with horizontal scroll */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-muted-foreground">💬</span>
          <h4 className="text-sm font-medium text-foreground">{t.sendToFriend}</h4>
        </div>
        <div 
          ref={quickRowRef}
          onWheel={handleQuickRowWheel}
          className={cn(
            'flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 pr-8 overscroll-x-contain',
            'touch-pan-x'
          )}
          style={{ 
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <QuickActionButton
            icon={InstagramIcon}
            label="Instagram"
            onClick={() => handleShare('instagram')}
            disabled={isSharing}
          />
          <QuickActionButton
            icon={MessengerIcon}
            label="Messenger"
            onClick={() => handleShare('messenger')}
            disabled={isSharing}
          />
          <QuickActionButton
            icon={WhatsAppIcon}
            label="WhatsApp"
            onClick={() => handleShare('whatsapp')}
            disabled={isSharing}
          />
          <QuickActionButton
            icon={SnapchatIcon}
            label="Snapchat"
            onClick={() => handleShare('snapchat')}
            disabled={isSharing}
          />
          <QuickActionButton
            icon={TelegramIcon}
            label="Telegram"
            onClick={() => handleShare('telegram')}
            disabled={isSharing}
          />
          <QuickActionButton
            icon={DownloadIcon}
            label={t.downloadImage}
            onClick={handleDownloadStoryImage}
            disabled={isSharing}
          />
        </div>
      </div>

      {/* For Story section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-muted-foreground">✨</span>
          <h4 className="text-sm font-medium text-foreground">{t.forStory}</h4>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-10 px-3 gap-1.5 text-xs font-semibold whitespace-nowrap"
            onClick={() => handleShare('instagram-story')}
            disabled={isSharing}
          >
            <img src={instagramIcon} alt="" className="w-4.5 h-4.5 object-contain" />
            {t.instagramStory}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 px-3 gap-1.5 text-xs font-semibold whitespace-nowrap"
            onClick={() => handleShare('facebook-story')}
            disabled={isSharing}
          >
            <FacebookIcon size={18} />
            {t.facebookStory}
          </Button>
        </div>
      </div>

      {/* Primary CTA: System share sheet - smaller button */}
      <button
        type="button"
        onClick={() => handleShare('native')}
        disabled={isSharing}
        className={cn(
          'w-fit inline-flex items-center gap-1.5',
          'text-xs font-medium text-muted-foreground hover:text-foreground',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label={t.moreOptions}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span>{t.moreOptions}</span>
      </button>
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
          <DialogContent className="sm:max-w-[400px] p-0 gap-0 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
              <h2 className="text-lg font-semibold text-foreground">{t.share}</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <ShareContent />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Mobile/Tablet uses Drawer (bottom sheet)
  return (
    <>
      <HiddenStoryCard />
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] rounded-t-3xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border/30">
            <h2 className="text-lg font-semibold text-foreground">{t.share}</h2>
            <DrawerClose asChild>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </DrawerClose>
          </div>
          <ShareContent />
        </DrawerContent>
      </Drawer>
    </>
  );
};
