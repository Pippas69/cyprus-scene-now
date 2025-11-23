import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export const AdminReports = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.reports.title}</h1>
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
            Content moderation features are being built. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
            <li>View all user reports</li>
            <li>Filter by entity type and status</li>
            <li>Preview reported content</li>
            <li>Take moderation actions</li>
            <li>Add admin notes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
