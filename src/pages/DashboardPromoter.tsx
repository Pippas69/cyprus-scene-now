import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, Building2, Sparkles, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePromoterApplications, usePromoterApplicationsRealtime } from '@/hooks/usePromoter';

const DashboardPromoter = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    })();
  }, [navigate]);

  const { data: applications = [], isLoading } = usePromoterApplications(user?.id);
  usePromoterApplicationsRealtime(user?.id);

  const accepted = applications.filter((a) => a.status === 'accepted');

  const t = language === 'el' ? {
    title: 'PR Dashboard',
    subtitle: 'Διαχείριση των συνεργασιών σου ως Promoter',
    back: 'Πίσω',
    activeCollab: 'Ενεργές Συνεργασίες',
    noCollab: 'Δεν έχεις ακόμα ενεργές συνεργασίες. Πήγαινε στις Ρυθμίσεις και κάνε αίτημα σε μια επιχείρηση.',
    goSettings: 'Πήγαινε στις Ρυθμίσεις',
    commission: 'Προμήθεια',
    fixed: 'Σταθερή',
    percent: 'Ποσοστό',
    perTicket: 'ανά εισιτήριο',
    perReservation: 'ανά κράτηση',
    notSet: 'Δεν έχει οριστεί',
    soonTitle: 'Έρχονται σύντομα',
    soonDesc: 'Προσωπικοί σύνδεσμοι προώθησης, στατιστικά κλικ & μετατροπών, και υπολογισμός κερδών.',
  } : {
    title: 'PR Dashboard',
    subtitle: 'Manage your promoter collaborations',
    back: 'Back',
    activeCollab: 'Active Collaborations',
    noCollab: 'You don\'t have any active collaborations yet. Go to Settings and apply to a business.',
    goSettings: 'Go to Settings',
    commission: 'Commission',
    fixed: 'Fixed',
    percent: 'Percent',
    perTicket: 'per ticket',
    perReservation: 'per reservation',
    notSet: 'Not set',
    soonTitle: 'Coming soon',
    soonDesc: 'Personal promotion links, click & conversion stats, and earnings calculation.',
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard-user?tab=settings')} aria-label={t.back}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {t.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      {/* Active Collaborations */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            {t.activeCollab}
            <Badge variant="secondary" className="ml-2">{accepted.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">{t.noCollab}</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard-user?tab=settings')}>
                {t.goSettings}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accepted.map((a) => {
                const formatCommission = () => {
                  if (!a.commission_type) return t.notSet;
                  if (a.commission_type === 'percent') {
                    return `${a.commission_percent ?? 0}% ${t.percent.toLowerCase()}`;
                  }
                  const parts: string[] = [];
                  if (a.commission_fixed_ticket_cents) {
                    parts.push(`€${(a.commission_fixed_ticket_cents / 100).toFixed(2)} ${t.perTicket}`);
                  }
                  if (a.commission_fixed_reservation_cents) {
                    parts.push(`€${(a.commission_fixed_reservation_cents / 100).toFixed(2)} ${t.perReservation}`);
                  }
                  return parts.length > 0 ? parts.join(' · ') : t.notSet;
                };
                return (
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
                        <span className="font-medium">{t.commission}:</span> {formatCommission()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {t.soonTitle}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t.soonDesc}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default DashboardPromoter;
