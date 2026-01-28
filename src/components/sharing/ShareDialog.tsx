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

  // Format date for subtitle
  const date = new Date(event.start_at);
  const subtitle = date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <SimpleShareSheet
      open={open}
      onOpenChange={onOpenChange}
      title={event.title}
      subtitle={subtitle}
      text={shareText}
      url={url}
      imageUrl={event.cover_image_url}
      language={language}
      objectType="event"
      objectId={event.id}
      businessId={event.businesses?.id}
    />
  );
};
