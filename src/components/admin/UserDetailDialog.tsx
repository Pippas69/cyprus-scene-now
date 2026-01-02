import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  User,
  Calendar,
  MapPin,
  Building2,
  Heart,
  CalendarCheck,
  Ticket,
  Gift,
  Ban,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { AdminUser, useAdminUsers } from '@/hooks/useAdminUsers';
import { Link } from 'react-router-dom';

interface UserDetailDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDetailDialog = ({ user, open, onOpenChange }: UserDetailDialogProps) => {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const { suspendUser, unsuspendUser, getUserStats } = useAdminUsers();
  
  const [stats, setStats] = useState({ rsvps: 0, favorites: 0, reservations: 0, redemptions: 0 });
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (user && open) {
      setIsLoadingStats(true);
      getUserStats(user.id).then(data => {
        setStats(data);
        setIsLoadingStats(false);
      });
    }
  }, [user, open]);

  if (!user) return null;

  const fullName = user.first_name || user.last_name 
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : user.name || 'Unknown User';

  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSuspend = () => {
    if (user.suspended) {
      unsuspendUser.mutate(user.id);
    } else {
      setSuspendDialogOpen(true);
    }
  };

  const confirmSuspend = () => {
    suspendUser.mutate({ userId: user.id, reason: suspendReason });
    setSuspendDialogOpen(false);
    setSuspendReason('');
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      admin: 'destructive',
      business: 'default',
      user: 'secondary',
    };
    return <Badge variant={variants[role] || 'secondary'}>{t.users.roles[role as keyof typeof t.users.roles] || role}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span>{fullName}</span>
                <span className="text-sm text-muted-foreground font-normal">{user.email}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              {getRoleBadge(user.role)}
              {user.suspended && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Ban className="h-3 w-3" />
                  Suspended
                </Badge>
              )}
              {user.has_business && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {user.business_name}
                </Badge>
              )}
            </div>

            <Separator />

            {/* User Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
              </div>
              {user.city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{user.city}</span>
                </div>
              )}
            </div>

            {/* Suspension Info */}
            {user.suspended && user.suspended_at && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">Suspended on {format(new Date(user.suspended_at), 'MMM d, yyyy')}</p>
                {user.suspension_reason && (
                  <p className="text-muted-foreground mt-1">Reason: {user.suspension_reason}</p>
                )}
              </div>
            )}

            <Separator />

            {/* Activity Stats */}
            <div>
              <h4 className="font-medium mb-3">{t.users.profile.activity}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-lg font-semibold">{isLoadingStats ? '-' : stats.rsvps}</p>
                    <p className="text-xs text-muted-foreground">{t.users.profile.rsvps}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-lg font-semibold">{isLoadingStats ? '-' : stats.favorites}</p>
                    <p className="text-xs text-muted-foreground">{t.users.profile.favorites}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Ticket className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-lg font-semibold">{isLoadingStats ? '-' : stats.reservations}</p>
                    <p className="text-xs text-muted-foreground">{t.users.profile.reservations}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Gift className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-lg font-semibold">{isLoadingStats ? '-' : stats.redemptions}</p>
                    <p className="text-xs text-muted-foreground">{t.users.profile.offers}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {user.has_business && user.business_id && (
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to={`/business/${user.business_id}`} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Business Profile
                  </Link>
                </Button>
              )}
              
              <Button
                variant={user.suspended ? 'default' : 'destructive'}
                onClick={handleSuspend}
                disabled={suspendUser.isPending || unsuspendUser.isPending}
                className="w-full justify-start"
              >
                {user.suspended ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t.users.actions.suspend === 'Suspend' ? 'Unsuspend User' : 'Άρση Αναστολής'}
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    {t.users.actions.suspend}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.users.profile.suspendUser}</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the user from accessing their account. They will see a message that their account has been suspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="suspend-reason">Suspension Reason</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Enter reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSuspend} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.users.actions.suspend}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
