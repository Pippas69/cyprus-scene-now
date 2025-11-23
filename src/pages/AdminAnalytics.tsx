import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export const AdminAnalytics = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.analytics.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Platform analytics are being built. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
            <li>User analytics (DAU, MAU, retention)</li>
            <li>Event analytics (categories, engagement)</li>
            <li>Business analytics (most active)</li>
            <li>Geographic distribution</li>
            <li>Export capabilities</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
