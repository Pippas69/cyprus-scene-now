import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export const AdminUsers = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.users.title}</h1>
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
            User management features are being built. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
            <li>Search and filter users</li>
            <li>View user profiles and activity</li>
            <li>Manage user roles</li>
            <li>Suspend/delete users</li>
            <li>Export user data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
