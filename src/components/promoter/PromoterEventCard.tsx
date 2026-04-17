/**
 * Κάρτα event στο PR Dashboard.
 * Δείχνει στοιχεία event + στατιστικά + ΕΝΑ μόνο κουμπί: "Αντιγραφή Link".
 * (Αν δεν υπάρχει link, πατάς μία φορά → δημιουργείται και αντιγράφεται αυτόματα.)
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Copy, Check, Eye, Ticket, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  PromoterEventItem,
  buildPromoterShareUrl,
  useCreatePromoterLink,
} from '@/hooks/usePromoterLinks';

interface Props {
  event: PromoterEventItem;
  userId: string | undefined;
}

export const PromoterEventCard = ({ event, userId }: Props) => {
  const createLink = useCreatePromoterLink(userId);
  const [copied, setCopied] = useState(false);

  const link = event.link;
  const shareUrl = link ? buildPromoterShareUrl(event.id, link.tracking_code) : null;

  const dateStr = new Date(event.start_at).toLocaleDateString('el-GR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Αντιγράφηκε ✓', description: 'Το link είναι στο clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyOrCreate = () => {
    if (shareUrl) {
      copyToClipboard(shareUrl);
      return;
    }
    createLink.mutate(
      { businessId: event.business_id, eventId: event.id },
      {
        onSuccess: (newLink) => {
          const url = buildPromoterShareUrl(event.id, newLink.tracking_code);
          copyToClipboard(url);
        },
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Cover */}
        <div className="relative w-full sm:w-40 h-40 sm:h-auto bg-muted flex-shrink-0">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Calendar className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">{event.business_name}</p>
            <h3 className="font-semibold text-base sm:text-lg leading-tight">
              {event.title}
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {event.location}
              </span>
            </div>
          </div>

          {/* Stats: clicks + πωλήσεις */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{link?.clicks_count ?? 0}</span> clicks
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Ticket className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{link?.conversions_count ?? 0}</span> πωλήσεις
            </span>
          </div>

          {/* Single action: Copy link */}
          <Button
            onClick={handleCopyOrCreate}
            disabled={createLink.isPending}
            size="sm"
            className="w-full sm:w-auto"
          >
            {createLink.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Αντιγράφηκε' : 'Αντιγραφή Link'}
          </Button>
        </CardContent>
      </div>
    </Card>
  );
};
