import { PremiumShareSheet } from './PremiumShareSheet';

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

export const ShareProfileDialog = ({ open, onOpenChange, business, language }: ShareProfileDialogProps) => {
  return (
    <PremiumShareSheet
      open={open}
      onOpenChange={onOpenChange}
      type="business"
      business={business}
      language={language}
    />
  );
};
