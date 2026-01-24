import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Download, Check } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useShare, isMobile, hasNativeShare, formatEventShareText, formatBusinessShareText, getEventUrlFallback, getBusinessUrlFallback, ShareChannel } from '@/hooks/useShare';
import { ShareableEventCard } from './ShareableEventCard';
import { ShareableBusinessCard } from './ShareableBusinessCard';
import {
  InstagramIcon,
  MessengerIcon,
  WhatsAppIcon,
  SnapchatIcon,
  FacebookIcon,
  LinkIcon,
  TelegramIcon,
} from './SocialPlatformIcons';

// SMS Icon component
const SMSIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className="text-[#34C759]"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
    moreOptions: 'Περισσότερες επιλογές',
    copyLink: 'Αντιγραφή link',
    downloadStory: 'Λήψη εικόνας (Story)',
    copied: 'Αντιγράφηκε!',
    messages: 'Μηνύματα',
  },
  en: {
    share: 'Share',
    sendToFriend: 'Send to a friend',
    forStory: 'For Story',
    moreOptions: 'More options',
    copyLink: 'Copy link',
    downloadStory: 'Download image (Story)',
    copied: 'Copied!',
    messages: 'Messages',
  },
};

// Platform button component
const PlatformButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  isLoading,
}: {
  icon: React.FC<{ size?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}) => (
  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={onClick}
    disabled={disabled || isLoading}
    className={cn(
      'flex flex-col items-center gap-2 p-3 rounded-2xl min-w-[72px]',
      'bg-muted/50 hover:bg-muted/80 transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:bg-muted'
    )}
  >
    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-background shadow-sm">
      <Icon size={28} />
    </div>
    <span className="text-[11px] font-medium text-foreground/80 text-center leading-tight">
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
  const [copied, setCopied] = useState(false);
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
    
    if (channel === 'copy') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareToChannel, getShareUrl, getShareText, getShareOptions, handleDownloadStoryImage]);

  // Format date for preview
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Preview component
  const PreviewCard = () => {
    if (type === 'event' && event) {
      return (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-aegean to-seafoam flex items-center justify-center">
              <span className="text-2xl">🌊</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(event.start_at)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'business' && business) {
      const locationLabel = [business.city, business.address].filter(Boolean).join(' • ');
      return (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-2xl">🏷️</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{business.name}</h3>
            {locationLabel && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{locationLabel}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Mobile content (curated)
  const MobileContent = () => (
    <div className="space-y-6 pb-8">
      {/* Preview */}
      <PreviewCard />

      {/* Send to friend section */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">{t.sendToFriend}</h4>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <PlatformButton
            icon={InstagramIcon}
            label="Instagram"
            onClick={() => handleShare('instagram')}
            disabled={isSharing}
          />
          <PlatformButton
            icon={MessengerIcon}
            label="Messenger"
            onClick={() => handleShare('messenger')}
            disabled={isSharing}
          />
          <PlatformButton
            icon={SMSIcon}
            label={t.messages}
            onClick={() => handleShare('sms')}
            disabled={isSharing}
          />
          <PlatformButton
            icon={WhatsAppIcon}
            label="WhatsApp"
            onClick={() => handleShare('whatsapp')}
            disabled={isSharing}
          />
          <PlatformButton
            icon={SnapchatIcon}
            label="Snapchat"
            onClick={() => handleShare('snapchat')}
            disabled={isSharing}
          />
        </div>
      </div>

      {/* For Story section */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">{t.forStory}</h4>
        <div className="flex gap-2">
          <PlatformButton
            icon={InstagramIcon}
            label="Instagram Story"
            onClick={() => handleShare('instagram-story')}
            disabled={isSharing}
          />
          <PlatformButton
            icon={FacebookIcon}
            label="Facebook Story"
            onClick={() => handleShare('facebook-story')}
            disabled={isSharing}
          />
        </div>
      </div>

      {/* More options button */}
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium"
        onClick={() => handleShare('native')}
        disabled={isSharing}
      >
        {t.moreOptions}
      </Button>
    </div>
  );

  // Desktop content (simplified)
  const DesktopContent = () => (
    <div className="space-y-6">
      {/* Preview */}
      <PreviewCard />

      {/* Primary actions */}
      <div className="space-y-3">
        {/* Copy link - Primary */}
        <Button
          variant="default"
          className="w-full h-12 text-base font-medium gap-2"
          onClick={() => handleShare('copy')}
          disabled={isSharing}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2"
              >
                <Check className="h-5 w-5" />
                {t.copied}
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2"
              >
                <LinkIcon size={20} />
                {t.copyLink}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11 gap-2"
            onClick={() => handleShare('whatsapp-web')}
            disabled={isSharing}
          >
            <WhatsAppIcon size={20} />
            <span>WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            className="h-11 gap-2"
            onClick={() => handleShare('telegram-web')}
            disabled={isSharing}
          >
            <TelegramIcon size={20} />
            <span>Telegram</span>
          </Button>
        </div>

        {/* Download story image */}
        <Button
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={handleDownloadStoryImage}
          disabled={isSharing}
        >
          <Download className="h-5 w-5" />
          {t.downloadStory}
        </Button>

        {/* More options - only if native share is available */}
        {hasNativeShare() && (
          <Button
            variant="ghost"
            className="w-full h-10 text-sm text-muted-foreground"
            onClick={() => handleShare('native')}
            disabled={isSharing}
          >
            {t.moreOptions}
          </Button>
        )}
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

  // Render based on device
  if (isDesktop) {
    return (
      <>
        <HiddenStoryCard />
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{t.share}</DialogTitle>
            </DialogHeader>
            <DesktopContent />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Mobile: Bottom sheet / Drawer
  return (
    <>
      <HiddenStoryCard />
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between border-b border-border/50 pb-3">
            <DrawerTitle className="text-lg font-semibold">{t.share}</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pt-4 overflow-y-auto">
            <MobileContent />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default PremiumShareSheet;
