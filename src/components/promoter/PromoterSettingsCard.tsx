/**
 * "Είμαι PR/Promoter" toggle card — appears in User Account Settings.
 * Phase 1 — Foundations.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Megaphone, Plus, Clock, Check, X, Trash2 } from 'lucide-react';
import {
  usePromoterApplications,
  useRevokePromoterApplication,
  type PromoterApplication,
} from '@/hooks/usePromoter';
import { PromoterBusinessSearchDialog } from './PromoterBusinessSearchDialog';
import { toast } from '@/hooks/use-toast';

interface PromoterSettingsCardProps {
  userId: string;
  language: 'el' | 'en';
}

export const PromoterSettingsCard = ({ userId, language }: PromoterSettingsCardProps) => {
  const { data: applications = [], isLoading } = usePromoterApplications(userId);
  const revoke = useRevokePromoterApplication(userId);
  const [searchOpen, setSearchOpen] = useState(false);

  // The toggle is "on" if the user has any application (any status). It's
  // a soft switch — turning it off without applications simply stays off.
  const hasAnyApplication = applications.length > 0;
  const [enabled, setEnabled] = useState(hasAnyApplication);

  // Keep local toggle in sync with data
  if (hasAnyApplication && !enabled) {
    setEnabled(true);
  }

  const t =
    language === 'el'
      ? {
          title: 'Είμαι PR / Promoter',
          desc: 'Ενεργοποίησε αυτή τη λειτουργία αν προωθείς events για επιχειρήσεις. Θα μπορείς να στέλνεις αιτήματα συνεργασίας και να αποκτάς πρόσβαση σε ξεχωριστό PR Dashboard μετά την έγκριση.',
          choose: 'Επιλογή Επιχείρησης',
          myApplications: 'Τα Αιτήματά μου',
          empty: 'Δεν έχεις στείλει κάποιο αίτημα ακόμα.',
          pending: 'Σε αναμονή',
          accepted: 'Εγκεκριμένο',
          declined: 'Απορριφθέν',
          revoked: 'Ακυρωμένο',
          cancel: 'Ακύρωση',
          revoked_toast: 'Το αίτημα ακυρώθηκε.',
        }
      : {
          title: 'I am a PR / Promoter',
          desc: 'Enable this if you promote events for businesses. You can send collaboration requests and unlock a dedicated PR Dashboard once approved.',
          choose: 'Choose a Business',
          myApplications: 'My Requests',
          empty: 'You haven\'t sent any requests yet.',
          pending: 'Pending',
          accepted: 'Approved',
          declined: 'Declined',
          revoked: 'Revoked',
          cancel: 'Cancel',
          revoked_toast: 'Request cancelled.',
        };

  const handleRevoke = async (applicationId: string) => {
    try {
      await revoke.mutateAsync(applicationId);
      toast({ title: t.revoked_toast });
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
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                {t.title}
              </CardTitle>
              <CardDescription className="mt-2">{t.desc}</CardDescription>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                if (!v && hasAnyApplication) return; // can't turn off while applications exist
                setEnabled(v);
                if (v) setSearchOpen(true);
              }}
              aria-label={t.title}
            />
          </div>
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-4">
            <Button onClick={() => setSearchOpen(true)} variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              {t.choose}
            </Button>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">{t.myApplications}</h4>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">...</p>
              ) : applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.empty}</p>
              ) : (
                <div className="space-y-2">
                  {applications.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={a.business?.logo_url || undefined} alt={a.business?.name} />
                        <AvatarFallback>
                          {a.business?.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{a.business?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.business?.city}
                        </p>
                      </div>
                      {renderStatusBadge(a.status)}
                      {a.status === 'pending' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRevoke(a.id)}
                          disabled={revoke.isPending}
                          aria-label={t.cancel}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <PromoterBusinessSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        userId={userId}
        language={language}
        existingApplications={applications}
      />
    </>
  );
};
