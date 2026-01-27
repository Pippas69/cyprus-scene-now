import { PremiumShareSheet } from './PremiumShareSheet';

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
  return (
    <PremiumShareSheet
      open={open}
      onOpenChange={onOpenChange}
      type="offer"
      offer={{
        id: offer.id,
        title: offer.title,
        description: offer.description ?? undefined,
        percent_off: offer.percent_off,
        special_deal_text: offer.special_deal_text,
        end_at: offer.end_at,
        offer_image_url: offer.offer_image_url ?? null,
        businesses: {
          id: offer.businesses.id,
          name: offer.businesses.name,
          cover_url: offer.businesses.cover_url,
          logo_url: offer.businesses.logo_url,
        },
      }}
      language={language}
    />
  );
};
