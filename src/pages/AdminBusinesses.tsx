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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Trash2, Building2, CheckCircle, XCircle } from 'lucide-react';
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
}

const AdminBusinesses = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BusinessRow | null>(null);

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, city, verified, created_at, category, user_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BusinessRow[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (businessId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('admin-delete-business', {
        body: { business_id: businessId },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.name} διαγράφηκε επιτυχώς`);
      if (data.warnings?.length) {
        console.warn('Deletion warnings:', data.warnings);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast.error(`Σφάλμα: ${error.message}`);
    },
  });

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminOceanHeader
        title={language === 'el' ? 'Διαχείριση Επιχειρήσεων' : 'Business Management'}
        subtitle={language === 'el' ? 'Διαγραφή & διαχείριση επιχειρήσεων' : 'Delete & manage businesses'}
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
                placeholder={language === 'el' ? 'Αναζήτηση...' : 'Search...'}
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
                    <TableHead>{language === 'el' ? 'Κατάσταση' : 'Status'}</TableHead>
                    <TableHead>{language === 'el' ? 'Ημερομηνία' : 'Created'}</TableHead>
                    <TableHead className="text-right">{language === 'el' ? 'Ενέργειες' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {language === 'el' ? 'Φόρτωση...' : 'Loading...'}
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {language === 'el' ? 'Δεν βρέθηκαν επιχειρήσεις' : 'No businesses found'}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(biz => (
                    <TableRow key={biz.id}>
                      <TableCell className="font-medium">{biz.name}</TableCell>
                      <TableCell>{biz.city}</TableCell>
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
                          onClick={() => setDeleteTarget(biz)}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'el' ? 'Οριστική Διαγραφή' : 'Permanent Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'el'
                ? `Είσαι σίγουρος ότι θέλεις να διαγράψεις το "${deleteTarget?.name}" (${deleteTarget?.city}); Αυτή η ενέργεια θα διαγράψει ΟΛΑ τα σχετικά δεδομένα (events, reservations, discounts κλπ) και δεν μπορεί να αναιρεθεί.`
                : `Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.city})? This will permanently delete ALL related data (events, reservations, discounts, etc.) and cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {language === 'el' ? 'Ακύρωση' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? (language === 'el' ? 'Διαγραφή...' : 'Deleting...')
                : (language === 'el' ? 'Διαγραφή' : 'Delete')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBusinesses;
