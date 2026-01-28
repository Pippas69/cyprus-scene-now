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
    offer_image_url?: string | null;
    businesses: {
      id: string;
      name: string;
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

  // Build subtitle
  const getSubtitle = () => {
    if (offer.percent_off && offer.percent_off > 0) {
      return `-${offer.percent_off}%`;
    }
    if (offer.special_deal_text) {
      return offer.special_deal_text;
    }
    return offer.businesses.name;
  };

  return (
    <SimpleShareSheet
      open={open}
      onOpenChange={onOpenChange}
      title={offer.title}
      subtitle={getSubtitle()}
      text={shareText}
      url={url}
      imageUrl={imageUrl}
      language={language}
      objectType="discount"
      objectId={offer.id}
      businessId={offer.businesses.id}
    />
  );
};
