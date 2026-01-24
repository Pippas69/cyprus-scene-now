import { PremiumShareSheet } from './PremiumShareSheet';

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
  return (
    <PremiumShareSheet
      open={open}
      onOpenChange={onOpenChange}
      type="event"
      event={event}
      language={language}
    />
  );
};
