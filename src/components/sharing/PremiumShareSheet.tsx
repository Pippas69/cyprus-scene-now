import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Download, Check, Share2, Link2, MoreHorizontal } from 'lucide-react';
import { Drawer, DrawerContent, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useShare, isMobile, hasNativeShare, formatEventShareText, formatBusinessShareText, getEventUrlFallback, getBusinessUrlFallback, ShareChannel } from '@/hooks/useShare';
import { ShareableEventCard } from './ShareableEventCard';
import { ShareableBusinessCard } from './ShareableBusinessCard';

// Social Icons with brand colors
const WhatsAppIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#25D366" />
    <path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
      fill="white"
    />
  </svg>
);

const InstagramIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#F77737" />
        <stop offset="50%" stopColor="#E1306C" />
        <stop offset="75%" stopColor="#C13584" />
        <stop offset="100%" stopColor="#833AB4" />
      </linearGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#ig-gradient)" />
    <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" />
    <circle cx="17" cy="7" r="1" fill="white" />
  </svg>
);

const MessengerIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

const TelegramIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#0088CC" />
    <path
      d="M9.417 15.181l-.397 3.298s-.164.774.676 0c.84-.775 1.644-1.487 1.644-1.487l3.421 2.523s.591.366.795-.202l1.437-9.028s.367-1.418-.818-.897l-11.56 4.464s-.882.325-.815.97c.066.646.788.939.788.939l2.979 1.003 6.893-4.558s.398-.243.381 0c0 0 .072.044-.142.266-.215.221-5.449 4.859-5.449 4.859"
      fill="white"
    />
  </svg>
);

const SnapchatIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#FFFC00" />
    <path
      d="M12 4.5c-2.4 0-3.9 1.7-4.1 4.1 0 .4-.1.8-.1 1.1-.2 0-.5-.1-.7-.1-.4 0-.7.2-.7.5s.2.5.5.6c.2.1.4.1.7.2-.1.3-.3.6-.5.9-.4.5-.9 1-1.5 1.4-.2.1-.3.3-.2.5.1.3.4.4.7.4.4 0 .9-.1 1.3-.3.1 0 .2-.1.3-.1.1 0 .2.1.2.2.1.5.3 1 .7 1.4.8.8 2.1 1.2 3.4 1.2s2.6-.4 3.4-1.2c.4-.4.6-.9.7-1.4 0-.1.1-.2.2-.2.1 0 .2.1.3.1.4.2.9.3 1.3.3.3 0 .6-.1.7-.4.1-.2 0-.4-.2-.5-.6-.4-1.1-.9-1.5-1.4-.2-.3-.4-.6-.5-.9.3-.1.5-.1.7-.2.3-.1.5-.3.5-.6s-.3-.5-.7-.5c-.2 0-.5.1-.7.1 0-.3-.1-.7-.1-1.1-.2-2.4-1.7-4.1-4.1-4.1z"
      fill="white"
      stroke="black"
      strokeWidth="0.5"
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
    share: 'Κοινοποίησε',
    shareButton: 'Κοινοποίησε',
    sendToFriend: 'Στείλε σε φίλο',
    forStory: 'Για Story',
    moreOptions: 'Περισσότερα...',
    copyLink: 'Αντιγραφή link',
    downloadImage: 'Λήψη εικόνας',
    copied: 'Αντιγράφηκε!',
  },
  en: {
    share: 'Share',
    shareButton: 'Share',
    sendToFriend: 'Send to a friend',
    forStory: 'For Story',
    moreOptions: 'More...',
    copyLink: 'Copy link',
    downloadImage: 'Download image',
    copied: 'Copied!',
  },
};

// Quick action button component (circular icons)
const QuickActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.FC<{ size?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <motion.button
    whileTap={{ scale: 0.92 }}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex flex-col items-center gap-1.5 min-w-[60px]',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    )}
  >
    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-background shadow-sm border border-border/50 hover:border-border transition-colors">
      <Icon size={28} />
    </div>
    <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight whitespace-nowrap">
      {label}
    </span>
  </motion.button>
);

// Download icon for image download
const DownloadIcon = ({ size = 24 }: { size?: number }) => (
  <div 
    className="flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    <Link2 className="text-aegean" size={size * 0.8} />
  </div>
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

      {/* Main Share Button - Primary CTA */}
      <Button
        variant="default"
        className="w-full h-12 text-base font-medium gap-2 bg-primary hover:bg-primary/90"
        onClick={() => handleShare('native')}
        disabled={isSharing}
      >
        <Share2 className="h-4 w-4" />
        {t.shareButton}
      </Button>

      {/* Send to friend section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-muted-foreground">💬</span>
          <h4 className="text-sm font-medium text-foreground">{t.sendToFriend}</h4>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
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
            icon={TelegramIcon}
            label="Telegram"
            onClick={() => handleShare('telegram-web')}
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
            className="flex-1 h-11 gap-2 text-sm font-medium"
            onClick={handleDownloadStoryImage}
            disabled={isSharing}
          >
            <Download className="h-4 w-4" />
            {t.downloadImage}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2 text-sm font-medium"
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
                  <Check className="h-4 w-4 text-green-500" />
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
                  <Link2 className="h-4 w-4" />
                  {t.copyLink}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* More options */}
      {hasNativeShare() && (
        <button
          onClick={() => handleShare('native')}
          disabled={isSharing}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="h-4 w-4" />
          {t.moreOptions}
        </button>
      )}
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
