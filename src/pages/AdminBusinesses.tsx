import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminOceanHeader } from '@/components/admin/AdminOceanHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Trash2, Building2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';

interface BusinessRow {
  id: string;
  name: string;
  city: string;
  verified: boolean | null;
  created_at: string;
  category: string[];
  user_id: string;
  owner_email?: string;
}

const AdminBusinesses = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BusinessRow | null>(null);
  const [confirmName, setConfirmName] = useState('');

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, city, verified, created_at, category, user_id, profiles!businesses_user_id_fkey(email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        city: b.city,
        verified: b.verified,
        created_at: b.created_at,
        category: b.category,
        user_id: b.user_id,
        owner_email: b.profiles?.email || '—',
      })) as BusinessRow[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (businessId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('admin-delete-business', {
        body: { business_id: businessId, delete_owner_account: true },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.name} — πλήρης διαγραφή ολοκληρώθηκε`);
      if (data.warnings?.length) {
        console.warn('Deletion warnings:', data.warnings);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      setDeleteTarget(null);
      setConfirmName('');
    },
    onError: (error: Error) => {
      toast.error(`Σφάλμα: ${error.message}`);
    },
  });

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.city.toLowerCase().includes(search.toLowerCase()) ||
    (b.owner_email || '').toLowerCase().includes(search.toLowerCase())
  );

  const canDelete = deleteTarget && confirmName.trim().toLowerCase() === deleteTarget.name.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-background">
      <AdminOceanHeader
        title={language === 'el' ? 'Διαχείριση Επιχειρήσεων' : 'Business Management'}
        subtitle={language === 'el' ? 'Πλήρης διαγραφή επιχειρήσεων & λογαριασμών' : 'Full deletion of businesses & accounts'}
      />

      <div className="p-4 sm:p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {language === 'el' ? 'Επιχειρήσεις' : 'Businesses'} ({filtered.length})
              </CardTitle>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'el' ? 'Αναζήτηση ονόματος, πόλης ή email...' : 'Search name, city or email...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'el' ? 'Όνομα' : 'Name'}</TableHead>
                    <TableHead>{language === 'el' ? 'Πόλη' : 'City'}</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>{language === 'el' ? 'Κατάσταση' : 'Status'}</TableHead>
                    <TableHead>{language === 'el' ? 'Ημερομηνία' : 'Created'}</TableHead>
                    <TableHead className="text-right">{language === 'el' ? 'Ενέργειες' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === 'el' ? 'Φόρτωση...' : 'Loading...'}
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === 'el' ? 'Δεν βρέθηκαν επιχειρήσεις' : 'No businesses found'}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(biz => (
                    <TableRow key={biz.id}>
                      <TableCell className="font-medium">{biz.name}</TableCell>
                      <TableCell>{biz.city}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{biz.owner_email}</TableCell>
                      <TableCell>
                        {biz.verified ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" /> Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(biz.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { setDeleteTarget(biz); setConfirmName(''); }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {language === 'el' ? 'Διαγραφή' : 'Delete'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setConfirmName(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === 'el' ? 'ΟΡΙΣΤΙΚΗ ΔΙΑΓΡΑΦΗ' : 'PERMANENT DELETION'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-foreground">
                {language === 'el'
                  ? `Πρόκειται να διαγράψεις ΟΡΙΣΤΙΚΑ το "${deleteTarget?.name}" (${deleteTarget?.city}).`
                  : `You are about to PERMANENTLY delete "${deleteTarget?.name}" (${deleteTarget?.city}).`
                }
              </p>
              <p>
                {language === 'el'
                  ? 'Θα διαγραφούν ΟΛΑ: ο λογαριασμός του ιδιοκτήτη, εκδηλώσεις, κρατήσεις, εισιτήρια, προσφορές, αρχεία, ειδοποιήσεις, CRM, analytics — ΤΙΠΟΤΑ δεν θα μείνει. Σαν να μην υπήρξε ποτέ στο ΦΟΜΟ.'
                  : 'ALL data will be deleted: owner account, events, reservations, tickets, offers, files, notifications, CRM, analytics — NOTHING will remain.'
                }
              </p>
              <p className="text-destructive font-bold">
                {language === 'el' ? 'Αυτή η ενέργεια ΔΕΝ μπορεί να αναιρεθεί!' : 'This action CANNOT be undone!'}
              </p>
              <div className="pt-2">
                <p className="text-sm mb-2">
                  {language === 'el'
                    ? `Πληκτρολόγησε "${deleteTarget?.name}" για επιβεβαίωση:`
                    : `Type "${deleteTarget?.name}" to confirm:`
                  }
                </p>
                <Input
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  placeholder={deleteTarget?.name || ''}
                  className="border-destructive"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {language === 'el' ? 'Ακύρωση' : 'Cancel'}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={!canDelete || deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? (language === 'el' ? 'Διαγραφή σε εξέλιξη...' : 'Deleting...')
                : (language === 'el' ? 'ΔΙΑΓΡΑΦΗ ΟΡΙΣΤΙΚΑ' : 'DELETE PERMANENTLY')
              }
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBusinesses;
