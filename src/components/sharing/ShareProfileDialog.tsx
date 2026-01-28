import { SimpleShareSheet } from './SimpleShareSheet';
import { formatBusinessShareText, getBusinessUrlFallback } from '@/hooks/useSimpleShare';

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
  const url = getBusinessUrlFallback(business.id);
  const shareText = formatBusinessShareText({ name: business.name }, language);
  const imageUrl = business.cover_url || business.logo_url;

  return (
    <SimpleShareSheet
      open={open}
      onOpenChange={onOpenChange}
      title={business.name}
      subtitle={business.city ?? undefined}
      text={shareText}
      url={url}
      imageUrl={imageUrl}
      language={language}
      objectType="business"
      objectId={business.id}
      businessId={business.id}
    />
  );
};
