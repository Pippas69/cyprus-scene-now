import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AdminSettings = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>
      </div>

      <Tabs defaultValue="featured">
        <TabsList>
          <TabsTrigger value="featured">{t.settings.tabs.featured}</TabsTrigger>
          <TabsTrigger value="categories">{t.settings.tabs.categories}</TabsTrigger>
          <TabsTrigger value="audit">{t.settings.tabs.audit}</TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5" />
                Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Featured content management features will allow you to:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
                <li>Feature events or businesses</li>
                <li>Set feature duration</li>
                <li>Manage feature weight/priority</li>
                <li>View currently featured content</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5" />
                Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Category management features will allow you to:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
                <li>Add new categories with translations</li>
                <li>Edit existing categories</li>
                <li>Reorder categories</li>
                <li>Disable categories</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5" />
                Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Audit log viewer will show:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
                <li>All admin actions with timestamps</li>
                <li>Action details and changes made</li>
                <li>Filter by admin, action type, date</li>
                <li>Export audit logs</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
