import { SimpleShareSheet } from './SimpleShareSheet';
import { formatOfferShareText, getOfferUrlFallback } from '@/hooks/useSimpleShare';

interface ShareOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
    id: string;
    title: string;
    description?: string | null;
    percent_off?: number | null;
    special_deal_text?: string | null;
    end_at: string;
    category?: string | null;
    offer_image_url?: string | null;
    businesses: {
      id: string;
      name: string;
      city?: string | null;
      cover_url?: string | null;
      logo_url?: string | null;
    };
  };
  language: 'el' | 'en';
}

export const ShareOfferDialog = ({
  open,
  onOpenChange,
  offer,
  language,
}: ShareOfferDialogProps) => {
  const url = getOfferUrlFallback(offer.id);
  const shareText = formatOfferShareText(
    {
      title: offer.title,
      validUntil: offer.end_at,
      businessName: offer.businesses.name,
    },
    language
  );
  const imageUrl = offer.offer_image_url || offer.businesses.cover_url || offer.businesses.logo_url;

  // Format end date for story
  const endDate = new Date(offer.end_at);
  const storyDate = language === 'el' 
    ? `Ισχύει έως ${endDate.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}`
    : `Valid until ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;

  // Get discount percent for story
  const storyDiscountPercent = offer.percent_off && offer.percent_off > 0 
    ? `${offer.percent_off}%` 
    : undefined;

  // Get location from business
  const storyLocation = offer.businesses.city || undefined;

  return (
    <SimpleShareSheet
      open={open}
      onOpenChange={onOpenChange}
      title={offer.title}
      subtitle={offer.businesses.name}
      text={shareText}
      url={url}
      imageUrl={imageUrl}
      language={language}
      objectType="discount"
      objectId={offer.id}
      businessId={offer.businesses.id}
      storyDate={storyDate}
      storyLocation={storyLocation}
      storyDiscountPercent={storyDiscountPercent}
      storyCategory={offer.category || undefined}
    />
  );
};
