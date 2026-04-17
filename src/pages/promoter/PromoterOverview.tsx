/**
 * PR Dashboard — Section 1: Επισκόπηση
 * - 3 KPI cards (clicks / πωλήσεις / κέρδη)
 * - Λίστα ενεργών συνεργασιών με όρους αμοιβής
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, MousePointerClick, Ticket, Wallet } from 'lucide-react';
import { usePromoterApplications, usePromoterApplicationsRealtime } from '@/hooks/usePromoter';
import { usePromoterTotals } from '@/hooks/usePromoterEarnings';

const PromoterOverview = () => {
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

  const { data: applications = [], isLoading } = usePromoterApplications(userId);
  usePromoterApplicationsRealtime(userId);
  const { data: totals } = usePromoterTotals(userId);

  const accepted = applications.filter((a) => a.status === 'accepted');

  const formatCommission = (a: typeof accepted[number]) => {
    if (!a.commission_type) return 'Δεν έχει οριστεί';
    if (a.commission_type === 'percent') {
      return `${a.commission_percent ?? 0}% ποσοστό`;
    }
    const parts: string[] = [];
    if (a.commission_fixed_ticket_cents) {
      parts.push(`€${(a.commission_fixed_ticket_cents / 100).toFixed(2)} ανά εισιτήριο`);
    }
    if (a.commission_fixed_reservation_cents) {
      parts.push(`€${(a.commission_fixed_reservation_cents / 100).toFixed(2)} ανά κράτηση`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Δεν έχει οριστεί';
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Επισκόπηση</h1>
        <p className="text-sm text-muted-foreground">
          Σύνοψη της δραστηριότητάς σου ως PR.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Σύνολο Clicks</p>
                <p className="text-2xl font-bold">{totals?.totalClicks ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Σύνολο Πωλήσεων</p>
                <p className="text-2xl font-bold">{totals?.totalSales ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Σύνολο Κερδών</p>
                <p className="text-2xl font-bold">
                  €{((totals?.totalEarningsCents ?? 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active collaborations */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Οι Συνεργασίες μου
            <Badge variant="secondary" className="ml-2">{accepted.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Δεν έχεις ακόμα ενεργές συνεργασίες. Πήγαινε στις Ρυθμίσεις του λογαριασμού σου και κάνε αίτημα σε επιχείρηση.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accepted.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border bg-card"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={a.business?.logo_url || undefined} alt={a.business?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {a.business?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{a.business?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.business?.city}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Όροι αμοιβής:</span> {formatCommission(a)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoterOverview;
