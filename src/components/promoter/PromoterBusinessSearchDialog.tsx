/**
 * Dialog for browsing/searching businesses to apply as a PR.
 * Phase 1 — Foundations.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Check, Clock, X } from 'lucide-react';
import { useApplyAsPromoter, type PromoterApplication } from '@/hooks/usePromoter';
import { toast } from '@/hooks/use-toast';

interface PromoterBusinessSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  language: 'el' | 'en';
  existingApplications: PromoterApplication[];
}

interface PublicBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  city: string;
  category: string[];
}

export const PromoterBusinessSearchDialog = ({
  open,
  onOpenChange,
  userId,
  language,
  existingApplications,
}: PromoterBusinessSearchDialogProps) => {
  const [search, setSearch] = useState('');
  const apply = useApplyAsPromoter(userId);

  const t =
    language === 'el'
      ? {
          title: 'Επιλογή Επιχείρησης',
          desc: 'Βρες τις επιχειρήσεις στις οποίες θέλεις να γίνεις PR. Θα ειδοποιηθούν με αίτημα έγκρισης.',
          searchPlaceholder: 'Αναζήτηση επιχείρησης...',
          apply: 'Αίτημα',
          pending: 'Σε Αναμονή',
          accepted: 'Εγκεκριμένο',
          declined: 'Απορριφθέν',
          revoked: 'Ακυρωμένο',
          empty: 'Δεν βρέθηκαν επιχειρήσεις.',
          loading: 'Φόρτωση...',
          appliedTitle: 'Αίτημα στάλθηκε',
          appliedDesc: 'Η επιχείρηση θα ειδοποιηθεί.',
        }
      : {
          title: 'Choose a Business',
          desc: 'Find businesses you want to PR for. They will receive an approval request.',
          searchPlaceholder: 'Search businesses...',
          apply: 'Apply',
          pending: 'Pending',
          accepted: 'Approved',
          declined: 'Declined',
          revoked: 'Revoked',
          empty: 'No businesses found.',
          loading: 'Loading...',
          appliedTitle: 'Request sent',
          appliedDesc: 'The business has been notified.',
        };

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['promoter-business-search', search],
    queryFn: async () => {
      let query = supabase
        .from('public_businesses_safe')
        .select('id, name, logo_url, city, category')
        .order('name', { ascending: true })
        .limit(100);

      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PublicBusiness[];
    },
    enabled: open,
  });

  const applicationsByBusiness = useMemo(() => {
    const map = new Map<string, PromoterApplication>();
    existingApplications.forEach((a) => map.set(a.business_id, a));
    return map;
  }, [existingApplications]);

  const handleApply = async (businessId: string) => {
    try {
      await apply.mutateAsync({ businessId });
      toast({ title: t.appliedTitle, description: t.appliedDesc });
    } catch {
      // toast shown by hook
    }
  };

  const renderStatusBadge = (status: PromoterApplication['status']) => {
    const map = {
      pending: { label: t.pending, icon: Clock, variant: 'secondary' as const },
      accepted: { label: t.accepted, icon: Check, variant: 'default' as const },
      declined: { label: t.declined, icon: X, variant: 'destructive' as const },
      revoked: { label: t.revoked, icon: X, variant: 'outline' as const },
    };
    const cfg = map[status];
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1 whitespace-nowrap px-2 py-1 text-[11px] sm:text-xs shrink-0">
        <Icon className="h-3 w-3" />
        <span className="hidden sm:inline">{cfg.label}</span>
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[76vh] w-[calc(100%-2.5rem)] max-w-[26rem] flex-col overflow-hidden p-4 sm:max-h-[82vh] sm:max-w-xl sm:p-6">
        <DialogHeader className="space-y-1 pr-8 text-center">
          <DialogTitle className="text-base sm:text-lg">{t.title}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed sm:text-sm">{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 !text-sm sm:!text-sm"
            autoFocus
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain">
          {isLoading ? (
            <p className="py-8 text-center text-xs text-muted-foreground sm:text-sm">{t.loading}</p>
          ) : businesses.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground sm:text-sm">{t.empty}</p>
          ) : (
            <div className="space-y-2 py-1">
              {businesses.map((b) => {
                const existing = applicationsByBusiness.get(b.id);
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5 sm:gap-3 sm:p-3"
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0 sm:h-10 sm:w-10">
                      <AvatarImage src={b.logo_url || undefined} alt={b.name} />
                      <AvatarFallback className="text-xs">{b.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium sm:text-base">{b.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                        {b.city}
                        {b.category?.length ? ` • ${b.category.slice(0, 2).join(', ')}` : ''}
                      </p>
                    </div>

                    {existing ? (
                      renderStatusBadge(existing.status)
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleApply(b.id)}
                        disabled={apply.isPending}
                        aria-label={t.apply}
                        className="h-8 shrink-0 gap-1 rounded-full px-2.5 text-xs sm:px-3"
                      >
                        <Send className="h-3 w-3" />
                        <span className="hidden sm:inline">{t.apply}</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};