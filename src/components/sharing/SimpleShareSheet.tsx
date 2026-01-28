import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Share2 } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSimpleShare, isMobile } from '@/hooks/useSimpleShare';

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
}

const translations = {
  el: {
    share: 'Κοινοποίηση',
    copyLink: 'Αντιγραφή Link',
    shareNative: 'Κοινοποίηση',
  },
  en: {
    share: 'Share',
    copyLink: 'Copy Link',
    shareNative: 'Share',
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
}: SimpleShareSheetProps) => {
  const t = translations[language];
  const { share, copyLink, isSharing, hasNativeShare } = useSimpleShare(language);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(!isMobile());
  }, []);

  const handleCopyLink = useCallback(async () => {
    await copyLink(url, { objectType, objectId, businessId });
    onOpenChange(false);
  }, [copyLink, url, objectType, objectId, businessId, onOpenChange]);

  const handleShare = useCallback(async () => {
    await share({ title, text, url }, { objectType, objectId, businessId });
    onOpenChange(false);
  }, [share, title, text, url, objectType, objectId, businessId, onOpenChange]);

  // Image Preview Card
  const ImagePreviewCard = () => (
    <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-muted">
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

      <div className="px-4 py-4 space-y-6">
        {/* Image Preview */}
        <ImagePreviewCard />

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Copy Link Button */}
          <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
            <Button
              variant="outline"
              className="w-full h-12 gap-2 text-base font-medium"
              onClick={handleCopyLink}
              disabled={isSharing}
            >
              <Copy className="h-5 w-5" />
              {t.copyLink}
            </Button>
          </motion.div>

          {/* Native Share Button (only if supported) */}
          {hasNativeShare && (
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                className="w-full h-12 gap-2 text-base font-medium"
                onClick={handleShare}
                disabled={isSharing}
              >
                <Share2 className="h-5 w-5" />
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <ShareContent />
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Bottom Drawer
  return (
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
  );
};
