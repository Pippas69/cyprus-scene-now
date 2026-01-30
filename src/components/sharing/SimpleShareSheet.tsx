import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Share2, MessageCircle } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSimpleShare, isMobile } from '@/hooks/useSimpleShare';
import { StoryPreviewModal } from './StoryPreviewModal';

// Social media icons as simple SVG components
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MessengerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
  </svg>
);

interface SimpleShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  text: string;
  url: string;
  imageUrl?: string | null;
  language: 'el' | 'en';
  objectType?: 'event' | 'discount' | 'business';
  objectId?: string;
  businessId?: string;
  /** Event/offer date for Story image overlay */
  storyDate?: string;
  /** Location for Story image overlay */
  storyLocation?: string;
}

const translations = {
  el: {
    share: 'Κοινοποίηση',
    copyLink: 'Αντιγραφή Link',
    shareNative: 'Περισσότερα',
    instagramStories: 'Stories',
    whatsapp: 'WhatsApp',
    messenger: 'Messenger',
    mobileOnly: 'Διαθέσιμο μόνο σε κινητό',
  },
  en: {
    share: 'Share',
    copyLink: 'Copy Link',
    shareNative: 'More',
    instagramStories: 'Stories',
    whatsapp: 'WhatsApp',
    messenger: 'Messenger',
    mobileOnly: 'Available on mobile only',
  },
};

export const SimpleShareSheet = ({
  open,
  onOpenChange,
  title,
  subtitle,
  text,
  url,
  imageUrl,
  language,
  objectType,
  objectId,
  businessId,
  storyDate,
  storyLocation,
}: SimpleShareSheetProps) => {
  const t = translations[language];
  const { share, copyLink, shareToWhatsApp, shareToMessenger, generateStoryPreview, shareStoryFile, downloadStoryFile, isSharing, hasNativeShare } = useSimpleShare(language);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Story preview modal state
  const [showStoryPreview, setShowStoryPreview] = useState(false);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  useEffect(() => {
    setIsDesktop(!isMobile());
  }, []);

  const shareOptions = { objectType, objectId, businessId };

  const handleCopyLink = useCallback(async () => {
    await copyLink(url, shareOptions);
    onOpenChange(false);
  }, [copyLink, url, shareOptions, onOpenChange]);

  const handleShare = useCallback(async () => {
    await share({ title, text, url, imageUrl }, shareOptions);
    onOpenChange(false);
  }, [share, title, text, url, imageUrl, shareOptions, onOpenChange]);

  // Open Story preview modal and generate image
  const handleInstagramStories = useCallback(async () => {
    setIsGeneratingStory(true);
    setShowStoryPreview(true);
    
    const storyData = {
      title,
      text,
      url,
      imageUrl,
      subtitle,
      date: storyDate,
      location: storyLocation,
    };
    
    const result = await generateStoryPreview(storyData, shareOptions);
    
    if (result) {
      setStoryPreviewUrl(result.blobUrl);
      setStoryFile(result.file);
    }
    
    setIsGeneratingStory(false);
  }, [generateStoryPreview, title, text, url, imageUrl, subtitle, storyDate, storyLocation, shareOptions]);

  // Share the generated Story via native share
  const handleShareStory = useCallback(async () => {
    if (!storyFile) return;
    
    await shareStoryFile(storyFile, { title, text, url, imageUrl, subtitle, date: storyDate, location: storyLocation }, shareOptions);
    setShowStoryPreview(false);
    onOpenChange(false);
  }, [shareStoryFile, storyFile, title, text, url, imageUrl, subtitle, storyDate, storyLocation, shareOptions, onOpenChange]);

  // Download the generated Story image
  const handleDownloadStory = useCallback(() => {
    if (!storyFile) return;
    downloadStoryFile(storyFile, title);
  }, [downloadStoryFile, storyFile, title]);

  const handleWhatsApp = useCallback(() => {
    shareToWhatsApp(url, text, shareOptions);
    onOpenChange(false);
  }, [shareToWhatsApp, url, text, shareOptions, onOpenChange]);

  const handleMessenger = useCallback(() => {
    shareToMessenger(url, shareOptions);
    onOpenChange(false);
  }, [shareToMessenger, url, shareOptions, onOpenChange]);

  // Image Preview Card
  const ImagePreviewCard = () => (
    <div className="relative w-full h-28 sm:h-40 rounded-2xl overflow-hidden bg-muted">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Share2 className="h-12 w-12 text-primary/40" />
        </div>
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {subtitle && (
          <p className="text-white/90 text-sm font-medium">{subtitle}</p>
        )}
        <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
          {title}
        </h3>
      </div>
    </div>
  );

  // Share content
  const ShareContent = () => (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="w-8" />
        <h2 className="text-base font-semibold text-foreground">{t.share}</h2>
        <button
          onClick={() => onOpenChange(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-4 space-y-3 sm:space-y-4">
        {/* Image Preview */}
        <ImagePreviewCard />

        {/* Social Media Buttons */}
        <div className="flex justify-center gap-2 sm:gap-4">
          {/* Instagram Stories */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstagramStories}
                  disabled={isSharing}
                  className={cn(
                    "flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-xl transition-colors",
                    "hover:bg-muted/80 active:bg-muted",
                    isDesktop && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
                    <InstagramIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{t.instagramStories}</span>
                </motion.button>
              </TooltipTrigger>
              {isDesktop && (
                <TooltipContent>
                  <p>{t.mobileOnly}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* WhatsApp */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleWhatsApp}
            disabled={isSharing}
            className="flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-xl transition-colors hover:bg-muted/80 active:bg-muted"
          >
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-[#25D366] flex items-center justify-center">
              <WhatsAppIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{t.whatsapp}</span>
          </motion.button>

          {/* Messenger */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleMessenger}
            disabled={isSharing}
            className="flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-xl transition-colors hover:bg-muted/80 active:bg-muted"
          >
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#00B2FF] to-[#006AFF] flex items-center justify-center">
              <MessengerIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{t.messenger}</span>
          </motion.button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3">
          {/* Copy Link Button */}
          <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
            <Button
              variant="outline"
              className="w-full h-9 sm:h-12 gap-1.5 sm:gap-2 text-xs sm:text-base font-medium"
              onClick={handleCopyLink}
              disabled={isSharing}
            >
              <Copy className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              {t.copyLink}
            </Button>
          </motion.div>

          {/* Native Share Button (only if supported) */}
          {hasNativeShare && (
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                className="w-full h-9 sm:h-12 gap-1.5 sm:gap-2 text-xs sm:text-base font-medium"
                onClick={handleShare}
                disabled={isSharing}
              >
                <Share2 className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                {t.shareNative}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  // Desktop: Dialog
  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
            <ShareContent />
          </DialogContent>
        </Dialog>
        <StoryPreviewModal
          open={showStoryPreview}
          onOpenChange={setShowStoryPreview}
          imageUrl={storyPreviewUrl}
          isLoading={isGeneratingStory}
          onShare={handleShareStory}
          onDownload={handleDownloadStory}
          language={language}
        />
      </>
    );
  }

  // Mobile: Bottom Drawer
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={cn(
            'max-h-[85vh] rounded-t-3xl',
            'bg-background/95 backdrop-blur-xl',
            'border-t border-border/50'
          )}
        >
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mt-3" />
          <ShareContent />
          {/* Safe area padding for iOS */}
          <div className="h-safe-area-inset-bottom" />
        </DrawerContent>
      </Drawer>
      <StoryPreviewModal
        open={showStoryPreview}
        onOpenChange={setShowStoryPreview}
        imageUrl={storyPreviewUrl}
        isLoading={isGeneratingStory}
        onShare={handleShareStory}
        onDownload={handleDownloadStory}
        language={language}
      />
    </>
  );
};
