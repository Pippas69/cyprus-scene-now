import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isMobile, hasNativeShare } from '@/hooks/useSimpleShare';

interface StoryPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  isLoading: boolean;
  onShare: () => Promise<void>;
  onDownload: () => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    preview: 'Προεπισκόπηση Story',
    shareToInstagram: 'Κοινοποίηση',
    downloadImage: 'Λήψη εικόνας',
    generating: 'Δημιουργία Story...',
    webInstructions: 'Άνοιξε την εικόνα στο Instagram και κοινοποίησε στο Story σου',
    mobileInstructions: 'Επίλεξε το Instagram Stories από το μενού',
  },
  en: {
    preview: 'Story Preview',
    shareToInstagram: 'Share',
    downloadImage: 'Download Image',
    generating: 'Generating Story...',
    webInstructions: 'Open the image on Instagram and share to your Story',
    mobileInstructions: 'Select Instagram Stories from the menu',
  },
};

export const StoryPreviewModal = ({
  open,
  onOpenChange,
  imageUrl,
  isLoading,
  onShare,
  onDownload,
  language,
}: StoryPreviewModalProps) => {
  const t = translations[language];
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setIsDesktop(!isMobile());
  }, []);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await onShare();
    } finally {
      setIsSharing(false);
    }
  };

  const PreviewContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="w-8" />
        <h2 className="text-base font-semibold text-foreground">{t.preview}</h2>
        <button
          onClick={() => onOpenChange(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden">
        {/* Image Preview Container */}
        <div className="flex-1 flex items-center justify-center min-h-0 mb-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t.generating}</p>
              </motion.div>
            ) : imageUrl ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full flex items-center justify-center p-8"
              >
                {/* Animated wrapper with Spotify-style floating effect */}
                <motion.div
                  animate={{
                    rotate: [-5, 5],
                    y: [-18, 18],
                  }}
                  transition={{
                    rotate: {
                      duration: 4,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    },
                    y: {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    },
                  }}
                  style={{ perspective: 1000 }}
                >
                  <motion.div
                    animate={{
                      x: [-8, 8],
                      scale: [0.98, 1.02],
                      boxShadow: [
                        "0 20px 40px rgba(0,0,0,0.3)",
                        "0 35px 60px rgba(0,0,0,0.45)",
                      ],
                    }}
                    transition={{
                      x: {
                        duration: 5,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                      },
                      scale: {
                        duration: 6,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                      },
                      boxShadow: {
                        duration: 3.5,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                      },
                    }}
                    className="rounded-xl"
                  >
                    <img
                      src={imageUrl}
                      alt="Story preview"
                      className="max-w-full max-h-full object-contain rounded-xl"
                      style={{ maxHeight: 'calc(100vh - 340px)', transform: 'scale(0.92)' }}
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Instructions */}
        {!isLoading && imageUrl && (
          <p className="text-center text-xs text-muted-foreground mb-4">
            {isDesktop ? t.webInstructions : t.mobileInstructions}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Download Button - Always available */}
          <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
            <Button
              variant="outline"
              className="w-full h-12 gap-2 text-base font-medium"
              onClick={onDownload}
              disabled={isLoading || !imageUrl}
            >
              <Download className="h-5 w-5" />
              {t.downloadImage}
            </Button>
          </motion.div>

          {/* Share Button - Only on mobile with native share */}
          {!isDesktop && hasNativeShare() && (
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                className="w-full h-12 gap-2 text-base font-medium"
                onClick={handleShare}
                disabled={isLoading || !imageUrl || isSharing}
              >
                {isSharing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Share2 className="h-5 w-5" />
                )}
                {t.shareToInstagram}
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
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[90vh]">
          <PreviewContent />
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Bottom Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          'max-h-[90vh] rounded-t-3xl',
          'bg-background/95 backdrop-blur-xl',
          'border-t border-border/50'
        )}
      >
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mt-3" />
        <PreviewContent />
        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </DrawerContent>
    </Drawer>
  );
};
