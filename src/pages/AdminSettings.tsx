import { useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { unifiedCategories, getCategoryLabelById, getCategoryIcon } from '@/lib/unifiedCategories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Star,
  Plus,
  Trash2,
  Calendar,
  Search,
  FileText,
  Download,
  ChevronRight,
  Tag,
  Building2,
  Ticket,
  Clock,
  User,
  Settings2,
} from 'lucide-react';

export const AdminSettings = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  const {
    featuredContent,
    isLoadingFeatured,
    addFeatured,
    isAddingFeatured,
    removeFeatured,
    auditLogs,
    isLoadingAudit,
    searchEntities,
  } = useAdminSettings();

  // Add Featured Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFeaturedType, setNewFeaturedType] = useState<'event' | 'business'>('event');
  const [newFeaturedEntityId, setNewFeaturedEntityId] = useState('');
  const [newFeaturedStartDate, setNewFeaturedStartDate] = useState('');
  const [newFeaturedEndDate, setNewFeaturedEndDate] = useState('');
  const [newFeaturedWeight, setNewFeaturedWeight] = useState('1');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entitySearchResults, setEntitySearchResults] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEntityName, setSelectedEntityName] = useState('');

  const handleEntitySearch = async () => {
    if (entitySearchQuery.length < 2) return;
    const results = await searchEntities(newFeaturedType, entitySearchQuery);
    setEntitySearchResults(results);
  };

  const handleAddFeatured = () => {
    if (!newFeaturedEntityId || !newFeaturedStartDate || !newFeaturedEndDate) return;
    
    addFeatured({
      entity_type: newFeaturedType,
      entity_id: newFeaturedEntityId,
      start_date: new Date(newFeaturedStartDate).toISOString(),
      end_date: new Date(newFeaturedEndDate).toISOString(),
      weight: parseInt(newFeaturedWeight) || 1,
      created_by: null,
    });
    
    setIsAddDialogOpen(false);
    setNewFeaturedEntityId('');
    setNewFeaturedStartDate('');
    setNewFeaturedEndDate('');
    setEntitySearchQuery('');
    setSelectedEntityName('');
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditSearch) {
      const search = auditSearch.toLowerCase();
      const matchesAction = log.action_type.toLowerCase().includes(search);
      const matchesAdmin = log.admin_name?.toLowerCase().includes(search);
      const matchesEntity = log.entity_type.toLowerCase().includes(search);
      if (!matchesAction && !matchesAdmin && !matchesEntity) return false;
    }
    if (auditActionFilter !== 'all' && !log.action_type.includes(auditActionFilter)) return false;
    return true;
  });

  // Export audit logs as CSV
  const exportAuditLogs = () => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Entity Type', 'Entity ID'];
    const rows = filteredAuditLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.admin_name || 'System',
      log.action_type,
      log.entity_type,
      log.entity_id || '-',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>
        <p className="text-muted-foreground mt-1">Manage platform settings and configuration</p>
      </div>

      <Tabs defaultValue="featured">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="featured" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings.tabs.featured}</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings.tabs.categories}</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings.tabs.audit}</span>
          </TabsTrigger>
        </TabsList>

        {/* Featured Content Tab */}
        <TabsContent value="featured" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t.settings.featured.title}</CardTitle>
                <CardDescription>Manage which events and businesses appear in featured sections</CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.settings.featured.add}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.settings.featured.add}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>{t.settings.featured.type}</Label>
                      <Select value={newFeaturedType} onValueChange={(v: 'event' | 'business') => {
                        setNewFeaturedType(v);
                        setEntitySearchResults([]);
                        setSelectedEntityName('');
                        setNewFeaturedEntityId('');
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t.settings.featured.entity}</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Search ${newFeaturedType}s...`}
                          value={entitySearchQuery}
                          onChange={(e) => setEntitySearchQuery(e.target.value)}
                        />
                        <Button variant="outline" onClick={handleEntitySearch}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      {entitySearchResults.length > 0 && (
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {entitySearchResults.map((entity) => (
                            <button
                              key={entity.id}
                              className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                                newFeaturedEntityId === entity.id ? 'bg-muted' : ''
                              }`}
                              onClick={() => {
                                setNewFeaturedEntityId(entity.id);
                                setSelectedEntityName(entity.name);
                              }}
                            >
                              {entity.name}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedEntityName && (
                        <p className="text-sm text-muted-foreground">
                          Selected: <span className="font-medium">{selectedEntityName}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t.settings.featured.startDate}</Label>
                        <Input
                          type="datetime-local"
                          value={newFeaturedStartDate}
                          onChange={(e) => setNewFeaturedStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.settings.featured.endDate}</Label>
                        <Input
                          type="datetime-local"
                          value={newFeaturedEndDate}
                          onChange={(e) => setNewFeaturedEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t.settings.featured.weight}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={newFeaturedWeight}
                        onChange={(e) => setNewFeaturedWeight(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Higher weight = higher priority</p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleAddFeatured}
                      disabled={!newFeaturedEntityId || !newFeaturedStartDate || !newFeaturedEndDate || isAddingFeatured}
                    >
                      Add to Featured
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingFeatured ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : featuredContent.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No featured content configured</p>
                  <p className="text-sm">Add events or businesses to feature them on the platform</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.settings.featured.type}</TableHead>
                        <TableHead>{t.settings.featured.entity}</TableHead>
                        <TableHead>{t.settings.featured.startDate}</TableHead>
                        <TableHead>{t.settings.featured.endDate}</TableHead>
                        <TableHead>{t.settings.featured.weight}</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featuredContent.map((item) => {
                        const isActive = new Date() >= new Date(item.start_date) && new Date() <= new Date(item.end_date);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.entity_type === 'event' ? (
                                  <Ticket className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="capitalize">{item.entity_type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.entity_name}</span>
                                {isActive && (
                                  <Badge variant="default" className="text-xs">Active</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(item.start_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(item.end_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.weight || 1}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFeatured(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.categories.title}</CardTitle>
              <CardDescription>
                View the platform's category structure. Categories are defined in code for consistency.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unifiedCategories.map((category) => (
                  <div key={category.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <p className="font-medium">{category.label.en}</p>
                          <p className="text-sm text-muted-foreground">{category.label.el}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{category.id}</Badge>
                    </div>
                    
                    {category.subOptions && category.subOptions.length > 0 && (
                      <div className="mt-4 pl-12 space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Subcategories</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {category.subOptions.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-2"
                            >
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span>{sub.label.en}</span>
                              <span className="text-muted-foreground">/ {sub.label.el}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t.settings.audit.title}</CardTitle>
                <CardDescription>Track all administrative actions</CardDescription>
              </div>
              <Button variant="outline" onClick={exportAuditLogs}>
                <Download className="h-4 w-4 mr-2" />
                {t.common.export}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search audit logs..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="suspend">Suspensions</SelectItem>
                    <SelectItem value="verify">Verifications</SelectItem>
                    <SelectItem value="report">Reports</SelectItem>
                    <SelectItem value="delete">Deletions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingAudit ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.settings.audit.timestamp}</TableHead>
                        <TableHead>{t.settings.audit.admin}</TableHead>
                        <TableHead>{t.settings.audit.action}</TableHead>
                        <TableHead>{t.settings.audit.entity}</TableHead>
                        <TableHead>{t.settings.audit.details}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(log.created_at), 'MMM d, HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{log.admin_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {log.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm capitalize">{log.entity_type}</span>
                          </TableCell>
                          <TableCell>
                            {log.new_value && (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {JSON.stringify(log.new_value).slice(0, 50)}...
                              </code>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;