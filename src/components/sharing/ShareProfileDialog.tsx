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
    category?: string[];
    logo_url?: string | null;
    cover_url?: string | null;
  };
  language: 'el' | 'en';
}

export const ShareProfileDialog = ({ open, onOpenChange, business, language }: ShareProfileDialogProps) => {
  const url = getBusinessUrlFallback(business.id);
  const shareText = formatBusinessShareText({ name: business.name }, language);
  
  // For story: use cover as main image, logo as overlay
  const imageUrl = business.cover_url || business.logo_url;
  
  // Get first category for story
  const storyCategory = business.category?.[0];
  
  // Location: prefer city, fallback to address
  const storyLocation = business.city || business.address || undefined;

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
      storyLocation={storyLocation}
      storyCategory={storyCategory}
      storyLogoUrl={business.logo_url}
      isBusinessProfile={true}
    />
  );
};
