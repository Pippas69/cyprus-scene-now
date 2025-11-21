import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiscountScanStats } from '@/hooks/useDiscountScanStats';
import { QrCode, Eye, CheckCircle, Users, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface QRScanAnalyticsProps {
  businessId: string | undefined;
  language?: 'el' | 'en';
}

export const QRScanAnalytics = ({ businessId, language = 'en' }: QRScanAnalyticsProps) => {
  const { stats, loading } = useDiscountScanStats(businessId);

  const text = {
    el: {
      title: 'Στατιστικά QR Codes',
      description: 'Παρακολουθήστε πόσες φορές σαρώθηκαν τα QR codes των προσφορών σας',
      offerTitle: 'Προσφορά',
      totalScans: 'Συνολικές Σαρώσεις',
      views: 'Προβολές',
      verifications: 'Επαληθεύσεις',
      redemptions: 'Εξαργυρώσεις',
      uniqueUsers: 'Μοναδικοί Χρήστες',
      last24h: 'Τελευταίες 24ώρες',
      last7d: 'Τελευταίες 7 μέρες',
      lastScanned: 'Τελευταία σάρωση',
      never: 'Ποτέ',
      noData: 'Δεν υπάρχουν δεδομένα σαρώσεων ακόμα',
    },
    en: {
      title: 'QR Code Analytics',
      description: 'Track how many times your offer QR codes have been scanned',
      offerTitle: 'Offer',
      totalScans: 'Total Scans',
      views: 'Views',
      verifications: 'Verifications',
      redemptions: 'Redemptions',
      uniqueUsers: 'Unique Users',
      last24h: 'Last 24 hours',
      last7d: 'Last 7 days',
      lastScanned: 'Last scanned',
      never: 'Never',
      noData: 'No scan data yet',
    },
  };

  const t = text[language];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <QrCode className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>{t.noData}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => (
            <Card key={stat.discount_id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{stat.title}</CardTitle>
                    {stat.last_scanned_at && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {t.lastScanned}: {formatDistanceToNow(new Date(stat.last_scanned_at), { addSuffix: true })}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {stat.total_scans}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Eye className="h-4 w-4" />
                      {t.views}
                    </div>
                    <div className="text-2xl font-bold">{stat.total_views}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <QrCode className="h-4 w-4" />
                      {t.verifications}
                    </div>
                    <div className="text-2xl font-bold">{stat.total_verifications}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <CheckCircle className="h-4 w-4" />
                      {t.redemptions}
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {stat.total_redemptions}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Users className="h-4 w-4" />
                      {t.uniqueUsers}
                    </div>
                    <div className="text-2xl font-bold">{stat.unique_scanners}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <TrendingUp className="h-4 w-4" />
                      {t.last24h}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stat.scans_last_24h}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
