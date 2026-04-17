import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Check,
  X,
  Users,
  Trophy,
  Inbox,
  Settings as SettingsIcon,
  MapPin,
  Trash2,
} from 'lucide-react';
import {
  useBusinessPromoterApplications,
  useUpdatePromoterApplicationStatus,
  useUpdatePromoterCommission,
  type BusinessPromoterApplication,
} from '@/hooks/useBusinessPromoters';
import { CommissionDialog } from './CommissionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  businessId: string;
}

const formatCommission = (a: BusinessPromoterApplication) => {
  if (a.commission_type === 'percent') return `${a.commission_percent ?? 0}%`;
  if (a.commission_type === 'fixed') {
    const t = (a.commission_fixed_ticket_cents ?? 0) / 100;
    const r = (a.commission_fixed_reservation_cents ?? 0) / 100;
    return `€${t.toFixed(2)}/εισ. · €${r.toFixed(2)}/κρ.`;
  }
  return '—';
};

const promoterDisplayName = (p: BusinessPromoterApplication['promoter']) =>
  p?.name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Promoter';

const initials = (name: string) =>
  name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function PromotersDashboard({ businessId }: Props) {
  const { data: applications = [], isLoading } = useBusinessPromoterApplications(businessId);
  const updateStatus = useUpdatePromoterApplicationStatus(businessId);
  const updateCommission = useUpdatePromoterCommission(businessId);

  const [commissionFor, setCommissionFor] = useState<BusinessPromoterApplication | null>(null);
  const [acceptingFor, setAcceptingFor] = useState<BusinessPromoterApplication | null>(null);
  const [removingFor, setRemovingFor] = useState<BusinessPromoterApplication | null>(null);

  const pending = useMemo(() => applications.filter((a) => a.status === 'pending'), [applications]);
  const active = useMemo(() => applications.filter((a) => a.status === 'accepted'), [applications]);

  // Phase 2 leaderboard: αρχικά empty state — γεμίζει στη Φάση 4 με attribution data.
  const leaderboard = active;

  return (
    <div className="px-3 sm:px-0 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Promoters</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Διαχείριση των PRs που συνεργάζονται με την επιχείρησή σου.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="pending" className="text-xs sm:text-sm gap-1.5 py-2">
            <Inbox className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Αιτήματα</span>
            <span className="xs:hidden">Αιτ.</span>
            {pending.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs sm:text-sm gap-1.5 py-2">
            <Users className="h-3.5 w-3.5" />
            <span>Ενεργοί</span>
            {active.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                {active.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs sm:text-sm gap-1.5 py-2">
            <Trophy className="h-3.5 w-3.5" />
            <span>Top</span>
          </TabsTrigger>
        </TabsList>

        {/* Pending */}
        <TabsContent value="pending" className="space-y-2 mt-3">
          {isLoading ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Φόρτωση…</CardContent></Card>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Δεν υπάρχουν εκκρεμή αιτήματα.</p>
              </CardContent>
            </Card>
          ) : (
            pending.map((a) => {
              const name = promoterDisplayName(a.promoter);
              return (
                <Card key={a.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={a.promoter?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {a.promoter?.city && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {a.promoter.city}
                          </p>
                        )}
                        {a.message && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            "{a.message}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setAcceptingFor(a)}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Έγκριση
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() =>
                          updateStatus.mutate({ applicationId: a.id, status: 'declined' })
                        }
                        disabled={updateStatus.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Απόρριψη
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Active */}
        <TabsContent value="active" className="space-y-2 mt-3">
          {isLoading ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Φόρτωση…</CardContent></Card>
          ) : active.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Καμία ενεργή συνεργασία ακόμα.</p>
              </CardContent>
            </Card>
          ) : (
            active.map((a) => {
              const name = promoterDisplayName(a.promoter);
              return (
                <Card key={a.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={a.promoter?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {formatCommission(a)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                          <div className="bg-muted/40 rounded-md py-1.5">
                            <p className="text-[10px] text-muted-foreground">Clicks</p>
                            <p className="text-sm font-semibold">0</p>
                          </div>
                          <div className="bg-muted/40 rounded-md py-1.5">
                            <p className="text-[10px] text-muted-foreground">Πωλήσεις</p>
                            <p className="text-sm font-semibold">0</p>
                          </div>
                          <div className="bg-muted/40 rounded-md py-1.5">
                            <p className="text-[10px] text-muted-foreground">Οφειλή</p>
                            <p className="text-sm font-semibold">€0</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setCommissionFor(a)}
                      >
                        <SettingsIcon className="h-3.5 w-3.5 mr-1" /> Αμοιβή
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => setRemovingFor(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Top Promoters του μήνα
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Δεν υπάρχουν δεδομένα ακόμα.
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((a, idx) => {
                    const name = promoterDisplayName(a.promoter);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40"
                      >
                        <span className="text-xs font-bold w-5 text-center text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={a.promoter?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                        </Avatar>
                        <p className="flex-1 text-sm truncate">{name}</p>
                        <Badge variant="outline" className="text-[10px]">€0</Badge>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-muted-foreground text-center pt-2">
                    📊 Τα στατιστικά πωλήσεων ενεργοποιούνται στη Φάση 4.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Accept dialog (επιλογή αμοιβής) */}
      <CommissionDialog
        open={!!acceptingFor}
        onOpenChange={(o) => !o && setAcceptingFor(null)}
        initial={acceptingFor || undefined}
        promoterName={acceptingFor ? promoterDisplayName(acceptingFor.promoter) : undefined}
        saving={updateStatus.isPending}
        onSave={async (payload) => {
          if (!acceptingFor) return;
          await updateStatus.mutateAsync({
            applicationId: acceptingFor.id,
            status: 'accepted',
            ...payload,
          });
          setAcceptingFor(null);
        }}
      />

      {/* Edit commission dialog */}
      <CommissionDialog
        open={!!commissionFor}
        onOpenChange={(o) => !o && setCommissionFor(null)}
        initial={commissionFor || undefined}
        promoterName={commissionFor ? promoterDisplayName(commissionFor.promoter) : undefined}
        saving={updateCommission.isPending}
        onSave={async (payload) => {
          if (!commissionFor) return;
          await updateCommission.mutateAsync({
            applicationId: commissionFor.id,
            ...payload,
          });
          setCommissionFor(null);
        }}
      />

      {/* Remove confirm */}
      <AlertDialog open={!!removingFor} onOpenChange={(o) => !o && setRemovingFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Τερματισμός συνεργασίας;</AlertDialogTitle>
            <AlertDialogDescription>
              Ο/Η {removingFor ? promoterDisplayName(removingFor.promoter) : ''} δεν θα μπορεί
              πλέον να προωθεί την επιχείρησή σου.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Άκυρο</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!removingFor) return;
                updateStatus.mutate({ applicationId: removingFor.id, status: 'revoked' });
                setRemovingFor(null);
              }}
            >
              Τερματισμός
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
