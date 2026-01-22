import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  BookImage,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Download,
  Share2,
  MapPin,
  Check,
} from 'lucide-react';
import {
  InstagramIcon,
  FacebookIcon,
  WhatsAppIcon,
  TwitterIcon,
  TelegramIcon,
  SnapchatIcon,
  LinkedInIcon,
  MessengerIcon,
  EmailIcon,
  LinkIcon,
} from './SocialPlatformIcons';
import { ShareableBusinessCard } from './ShareableBusinessCard';
import { useShareProfile, SharePlatform } from '@/hooks/useShareProfile';
import { cn } from '@/lib/utils';
import { translateCity } from '@/lib/cityTranslations';

interface ShareProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: {
    id: string;
    name: string;
    city?: string | null;
    address?: string | null;
    logo_url?: string | null;
    cover_url?: string | null;
  };
  language: 'el' | 'en';
}

const translations = {
  el: {
    shareProfile: 'Κοινοποίηση Προφίλ',
    shareAsStory: 'Κοινοποίηση ως Story',
    shareAsPost: 'Κοινοποίηση ως Post',
    shareViaDM: 'Κοινοποίηση μέσω DM',
    moreOptions: 'Περισσότερες Επιλογές',
    copyLink: 'Αντιγραφή Link',
    email: 'Email',
    downloadImage: 'Λήψη Εικόνας',
    shareNative: 'Κοινοποίηση',
    storyFormat: 'Story Format',
    postFormat: 'Post Format',
    generating: 'Δημιουργία...',
    copied: 'Αντιγράφηκε!',
  },
  en: {
    shareProfile: 'Share Profile',
    shareAsStory: 'Share as Story',
    shareAsPost: 'Share as Post',
    shareViaDM: 'Share via DM',
    moreOptions: 'More Options',
    copyLink: 'Copy Link',
    email: 'Email',
    downloadImage: 'Download Image',
    shareNative: 'Share',
    storyFormat: 'Story Format',
    postFormat: 'Post Format',
    generating: 'Generating...',
    copied: 'Copied!',
  },
};

const storyPlatforms = [
  { id: 'instagram-story' as SharePlatform, name: 'Instagram', Icon: InstagramIcon },
  { id: 'facebook-story' as SharePlatform, name: 'Facebook', Icon: FacebookIcon },
  { id: 'snapchat' as SharePlatform, name: 'Snapchat', Icon: SnapchatIcon },
];

const postPlatforms = [
  { id: 'facebook' as SharePlatform, name: 'Facebook', Icon: FacebookIcon },
  { id: 'twitter' as SharePlatform, name: 'X', Icon: TwitterIcon },
  { id: 'linkedin' as SharePlatform, name: 'LinkedIn', Icon: LinkedInIcon },
];

const dmPlatforms = [
  { id: 'whatsapp' as SharePlatform, name: 'WhatsApp', Icon: WhatsAppIcon },
  { id: 'telegram' as SharePlatform, name: 'Telegram', Icon: TelegramIcon },
  { id: 'messenger' as SharePlatform, name: 'Messenger', Icon: MessengerIcon },
];

export const ShareProfileDialog = ({ open, onOpenChange, business, language }: ShareProfileDialogProps) => {
  const t = translations[language];
  const { shareToPlatform, generateShareImage, downloadImage, isSharing } = useShareProfile();
  const storyCardRef = useRef<HTMLDivElement>(null);
  const postCardRef = useRef<HTMLDivElement>(null);
  const [activeFormat, setActiveFormat] = useState<'story' | 'post'>('story');
  const [copied, setCopied] = useState(false);

  const businessData = {
    id: business.id,
    name: business.name,
    city: business.city ?? undefined,
    address: business.address ?? undefined,
    logoUrl: business.logo_url ?? undefined,
    coverUrl: business.cover_url ?? undefined,
  };

  const handleShare = async (platform: SharePlatform) => {
    await shareToPlatform(platform, businessData);
  };

  const handleCopyLink = async () => {
    await shareToPlatform('copy', businessData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = async () => {
    const ref = activeFormat === 'story' ? storyCardRef : postCardRef;
    const imageUrl = await generateShareImage(ref);
    if (imageUrl) {
      const filename = `${business.name.replace(/\s+/g, '-').toLowerCase()}-${activeFormat}.png`;
      downloadImage(imageUrl, filename);
    }
  };

  const locationLabel = [translateCity(business.city, language), business.address].filter(Boolean).join(' • ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Share2 className="h-5 w-5 text-accent" />
            {t.shareProfile}
          </DialogTitle>
        </DialogHeader>

        {/* Profile Preview */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={`${business.name} logo`}
              className="w-16 h-16 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-2xl">🏷️</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{business.name}</h3>
            {locationLabel ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{locationLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Format Toggle */}
        <div className="flex gap-2">
          <Button
            variant={activeFormat === 'story' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFormat('story')}
            className="flex-1"
          >
            <BookImage className="h-4 w-4 mr-2" />
            {t.storyFormat}
          </Button>
          <Button
            variant={activeFormat === 'post' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFormat('post')}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t.postFormat}
          </Button>
        </div>

        {/* Hidden cards for image generation */}
        <div className="fixed -left-[9999px] top-0">
          <ShareableBusinessCard ref={storyCardRef} business={businessData} variant="story" language={language} />
          <ShareableBusinessCard ref={postCardRef} business={businessData} variant="post" language={language} />
        </div>

        <div className="space-y-4">
          {/* Story Platforms */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookImage className="h-4 w-4 text-accent" />
              <span className="font-medium text-sm">{t.shareAsStory}</span>
            </div>
            <div className="flex gap-2">
              {storyPlatforms.map(({ id, name, Icon }) => (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleShare(id)}
                  disabled={isSharing}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                    'bg-muted/50 hover:bg-muted transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Icon size={28} />
                  <span className="text-xs font-medium">{name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Post Platforms */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-accent" />
              <span className="font-medium text-sm">{t.shareAsPost}</span>
            </div>
            <div className="flex gap-2">
              {postPlatforms.map(({ id, name, Icon }) => (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleShare(id)}
                  disabled={isSharing}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                    'bg-muted/50 hover:bg-muted transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Icon size={28} />
                  <span className="text-xs font-medium">{name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <Separator />

          {/* DM Platforms */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-4 w-4 text-accent" />
              <span className="font-medium text-sm">{t.shareViaDM}</span>
            </div>
            <div className="flex gap-2">
              {dmPlatforms.map(({ id, name, Icon }) => (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleShare(id)}
                  disabled={isSharing}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                    'bg-muted/50 hover:bg-muted transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Icon size={28} />
                  <span className="text-xs font-medium">{name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <Separator />

          {/* More Options */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MoreHorizontal className="h-4 w-4 text-accent" />
              <span className="font-medium text-sm">{t.moreOptions}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                  'bg-muted/50 hover:bg-muted transition-colors'
                )}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="h-7 w-7 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div key="link" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <LinkIcon size={28} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="text-xs font-medium">{copied ? t.copied : t.copyLink}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleShare('email')}
                disabled={isSharing}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                  'bg-muted/50 hover:bg-muted transition-colors'
                )}
              >
                <EmailIcon size={28} />
                <span className="text-xs font-medium">{t.email}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadImage}
                disabled={isSharing}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                  'bg-muted/50 hover:bg-muted transition-colors'
                )}
              >
                <Download className="h-7 w-7 text-muted-foreground" />
                <span className="text-xs font-medium">{t.downloadImage}</span>
              </motion.button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleShare('native')}
                  disabled={isSharing}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                    'bg-muted/50 hover:bg-muted transition-colors'
                  )}
                >
                  <Share2 className="h-7 w-7 text-muted-foreground" />
                  <span className="text-xs font-medium">{t.shareNative}</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
