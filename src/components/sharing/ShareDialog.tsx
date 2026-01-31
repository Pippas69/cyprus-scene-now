import { SimpleShareSheet } from './SimpleShareSheet';
import { formatEventShareText, getEventUrlFallback } from '@/hooks/useSimpleShare';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    description?: string;
    location: string;
    start_at: string;
    cover_image_url?: string;
    category?: string[];
    price?: number | null;
    businesses?: {
      id: string;
      name: string;
    };
  };
  language: 'el' | 'en';
}

export const ShareDialog = ({ open, onOpenChange, event, language }: ShareDialogProps) => {
  const url = getEventUrlFallback(event.id);
  const shareText = formatEventShareText(
    {
      title: event.title,
      startAt: event.start_at,
      location: event.location,
      businessName: event.businesses?.name,
    },
    language
  );

  // Format date for story overlay
  const date = new Date(event.start_at);
  const storyDate = date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format price for story
  const getStoryPrice = () => {
    if (event.price === 0 || event.price === null) {
      return language === 'el' ? 'Δωρεάν Είσοδος' : 'Free Entry';
    }
    if (event.price && event.price > 0) {
      return `€${event.price}`;
    }
    return undefined;
  };

  // Get first category for story
  const storyCategory = event.category?.[0];

  return (
    <SimpleShareSheet
      open={open}
      onOpenChange={onOpenChange}
      title={event.title}
      subtitle={event.businesses?.name}
      text={shareText}
      url={url}
      imageUrl={event.cover_image_url}
      language={language}
      objectType="event"
      objectId={event.id}
      businessId={event.businesses?.id}
      storyDate={storyDate}
      storyLocation={event.location}
      storyPrice={getStoryPrice()}
      storyCategory={storyCategory}
    />
  );
};
