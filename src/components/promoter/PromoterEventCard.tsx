/**
 * Κάρτα event στο PR Dashboard.
 * Δείχνει στοιχεία event + κουμπί "Δημιουργία Link" ή share controls όταν υπάρχει link.
 */

import { useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  Link2,
  Copy,
  Check,
  QrCode,
  Share2,
  Eye,
  Ticket,
  Loader2,
} from 'lucide-react';
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
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const link = event.link;
  const shareUrl = link ? buildPromoterShareUrl(event.id, link.tracking_code) : null;

  const dateStr = new Date(event.start_at).toLocaleDateString('el-GR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCreate = () => {
    createLink.mutate(
      { businessId: event.business_id, eventId: event.id },
      {
        onSuccess: () => {
          toast({
            title: 'Έτοιμο! 🎉',
            description: 'Το link σου δημιουργήθηκε. Μπορείς να το μοιραστείς.',
          });
        },
      },
    );
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Αντιγράφηκε ✓', description: 'Το link είναι στο clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShowQr = async () => {
    if (!shareUrl) return;
    const dataUrl = await QRCode.toDataURL(shareUrl, {
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    setQrDataUrl(dataUrl);
    setQrOpen(true);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `fomo-${event.title.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Δες αυτό το event στο ΦΟΜΟ: ${event.title}`,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleShareWhatsapp = () => {
    if (!shareUrl) return;
    const text = `Δες αυτό το event στο ΦΟΜΟ: ${event.title}\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <>
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

            {!link ? (
              <Button
                onClick={handleCreate}
                disabled={createLink.isPending}
                size="sm"
                className="w-full sm:w-auto"
              >
                {createLink.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Δημιουργία Link
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Stats */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="h-3 w-3" /> {link.clicks_count} clicks
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Ticket className="h-3 w-3" /> {link.conversions_count} πωλήσεις
                  </Badge>
                </div>

                {/* Link box */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
                  <code className="text-xs flex-1 truncate text-muted-foreground">
                    {shareUrl}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Αντιγραφή
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShowQr}>
                    <QrCode className="h-4 w-4 mr-1" /> QR Code
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-1" /> Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleShareWhatsapp}
                    className="text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10"
                  >
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code για {event.title}</DialogTitle>
            <DialogDescription>
              Σκάναρε ή κατέβασε για να μοιραστείς εύκολα.
            </DialogDescription>
          </DialogHeader>
          {qrDataUrl && (
            <div className="space-y-3">
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-full rounded-lg border bg-white"
              />
              <Button onClick={handleDownloadQr} className="w-full">
                Κατέβασμα QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
