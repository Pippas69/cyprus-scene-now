import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { AdminOceanHeader } from '@/components/admin/AdminOceanHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, UserCheck, Calendar, Download, Search, Rocket } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

interface WaitlistUser {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  town: string | null;
  created_at: string;
}

const AdminWaitlist = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language].waitlist;
  const tCommon = adminTranslations[language].common;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch waitlist users
  const { data: waitlistUsers, isLoading } = useQuery({
    queryKey: ['admin-waitlist-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, email, city, town, created_at')
        .eq('is_waitlist', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WaitlistUser[];
    },
  });

  // Calculate stats
  const stats = {
    total: waitlistUsers?.length || 0,
    today: waitlistUsers?.filter(u => 
      isAfter(new Date(u.created_at), subDays(new Date(), 1))
    ).length || 0,
    thisWeek: waitlistUsers?.filter(u => 
      isAfter(new Date(u.created_at), subDays(new Date(), 7))
    ).length || 0,
  };

  // Filter users based on search
  const filteredUsers = waitlistUsers?.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const fullName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return (
      fullName.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.city?.toLowerCase().includes(searchLower) ||
      user.town?.toLowerCase().includes(searchLower)
    );
  });

  // Activate all users mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_waitlist: false })
        .eq('is_waitlist', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist-users'] });
      toast.success(language === 'el' ? 'Όλοι οι χρήστες ενεργοποιήθηκαν!' : 'All users have been activated!');
    },
    onError: () => {
      toast.error(language === 'el' ? 'Σφάλμα κατά την ενεργοποίηση' : 'Error activating users');
    },
  });

  // Export to CSV
  const handleExport = () => {
    if (!waitlistUsers?.length) return;

    const headers = ['Name', 'Email', 'City', 'Signed Up'];
    const rows = waitlistUsers.map(user => {
      const fullName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      return [
        fullName,
        user.email || '',
        user.city || user.town || '',
        format(new Date(user.created_at), 'yyyy-MM-dd HH:mm'),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waitlist-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(language === 'el' ? 'Εξαγωγή ολοκληρώθηκε' : 'Export completed');
  };

  const getUserDisplayName = (user: WaitlistUser) => {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return language === 'el' ? 'Χωρίς όνομα' : 'No name';
  };

  return (
    <div className="space-y-6">
      <AdminOceanHeader
        title={t.title}
        subtitle={t.subtitle}
      >
        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white">
          {stats.total} {t.users}
        </span>
      </AdminOceanHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.stats.total}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.stats.today}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.stats.thisWeek}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{t.manageTitle}</CardTitle>
              <CardDescription>{t.manageDescription}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} disabled={!waitlistUsers?.length}>
                <Download className="h-4 w-4 mr-2" />
                {tCommon.export}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="gradient" 
                    disabled={!waitlistUsers?.length || activateMutation.isPending}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    {t.activateAll}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.activateConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.activateConfirmDescription.replace('{count}', String(stats.total))}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => activateMutation.mutate()}>
                      {tCommon.confirm}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !filteredUsers?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t.noUsers}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.table.name}</TableHead>
                    <TableHead>{t.table.email}</TableHead>
                    <TableHead>{t.table.city}</TableHead>
                    <TableHead>{t.table.signedUp}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {getUserDisplayName(user)}
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        {user.city || user.town || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {format(new Date(user.created_at), 'dd/MM/yyyy')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWaitlist;
