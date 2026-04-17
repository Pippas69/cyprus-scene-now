/**
 * PR Dashboard — Section 3: Τα Κέρδη μου (mini-CRM)
 * Πίνακας: Όνομα Πελάτη · Event · Ημερομηνία · Ποσό Αγοράς · Δικό σου Κέρδος
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet } from 'lucide-react';
import { usePromoterAttributions } from '@/hooks/usePromoterEarnings';

const PromoterEarningsPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);
    })();
  }, [navigate]);

  const { data: rows = [], isLoading } = usePromoterAttributions(userId);

  const totalEarnings = rows.reduce((s, r) => s + (r.commission_earned_cents || 0), 0);
  const totalRevenue = rows.reduce((s, r) => s + (r.order_amount_cents || 0), 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Τα Κέρδη μου</h1>
        <p className="text-sm text-muted-foreground">
          Λίστα με τους πελάτες που έφερες και το αντίστοιχο κέρδος σου.
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground">Σύνολο Πωλήσεων</p>
            <p className="text-2xl font-bold">€{(totalRevenue / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground">Σύνολο Κερδών</p>
            <p className="text-2xl font-bold text-primary">€{(totalEarnings / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            Πελάτες που Έφερες
            <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Φόρτωση…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Δεν υπάρχουν ακόμα κέρδη. Μόλις κάποιος αγοράσει μέσω του link σου, θα εμφανιστεί εδώ.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Όνομα Πελάτη</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Ημερομηνία</TableHead>
                    <TableHead className="text-right">Ποσό Αγοράς</TableHead>
                    <TableHead className="text-right">Κέρδος</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.customer_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.event_title || r.business_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        €{(r.order_amount_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        €{(r.commission_earned_cents / 100).toFixed(2)}
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

export default PromoterEarningsPage;
