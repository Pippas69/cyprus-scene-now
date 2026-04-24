import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Trash2, Clock, AlertTriangle, CheckCircle2, XCircle, Check, X as XIcon, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { translateSeatingType } from '@/lib/seatingTranslations';
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

interface PendingBookingRow {
  id: string;
  business_id: string;
  event_id: string | null;
  booking_type: 'reservation' | 'ticket' | 'walk_in';
  customer_name: string | null;
  customer_phone: string;
  party_size: number | null;
  seating_preference: string | null;
  care_of: string | null;
  notes: string | null;
  status: 'pending' | 'completed' | 'link_expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  token: string;
}

interface PendingBookingsListProps {
  businessId: string;
  eventId?: string | null;
  language: 'el' | 'en';
  /** Optional search query — filters by customer_name OR customer_phone */
  searchQuery?: string;
  /** Called whenever a booking transitions to confirmed (so parent can refresh main list) */
  onConfirmed?: () => void;
}

const t = {
  el: {
    title: 'Εκκρεμή Links',
    details: 'Στοιχεία',
    type: 'Τύπος',
    party: 'Άτομα',
    careOf: 'Care of',
    status: 'Κατάσταση',
    note: 'Σημείωση',
    expires: 'Λήξη',
    actions: '',
    pending: 'Εκκρεμεί πληρωμή',
    confirmed: 'Επιβεβαιώθηκε',
    expired: 'Έληξε',
    cancelled: 'Ακυρώθηκε',
    none: '',
    resend: 'Επαναποστολή SMS',
    delete: 'Διαγραφή',
    confirmDelete: 'Διαγραφή link;',
    confirmDeleteDesc: 'Ο σύνδεσμος θα ακυρωθεί άμεσα. Δεν μπορεί να αναιρεθεί.',
    cancel: 'Ακύρωση',
    yesDelete: 'Ναι, διαγραφή',
    resendOk: 'Στάλθηκε νέο SMS',
    deleteOk: 'Το link διαγράφηκε',
    typeRes: 'Κράτηση',
    typeTk: 'Εισιτήριο',
    typeWi: 'Walk-in',
    notePlaceholder: 'Προσθήκη σημείωσης...',
    save: 'Αποθήκευση',
    cancelEdit: 'Ακύρωση',
    noteSaved: 'Η σημείωση αποθηκεύτηκε',
    noteSaveError: 'Σφάλμα αποθήκευσης σημείωσης',
  },
  en: {
    title: 'Pending Links',
    details: 'Details',
    type: 'Type',
    party: 'Party',
    careOf: 'Care of',
    status: 'Status',
    note: 'Note',
    expires: 'Expires',
    actions: '',
    pending: 'Awaiting payment',
    confirmed: 'Confirmed',
    expired: 'Expired',
    cancelled: 'Cancelled',
    none: '',
    resend: 'Resend SMS',
    delete: 'Delete',
    confirmDelete: 'Delete link?',
    confirmDeleteDesc: 'The link will be invalidated immediately. Cannot be undone.',
    cancel: 'Cancel',
    yesDelete: 'Yes, delete',
    resendOk: 'New SMS sent',
    deleteOk: 'Link deleted',
    typeRes: 'Reservation',
    typeTk: 'Ticket',
    typeWi: 'Walk-in',
    notePlaceholder: 'Add a note...',
    save: 'Save',
    cancelEdit: 'Cancel',
    noteSaved: 'Note saved',
    noteSaveError: 'Failed to save note',
  },
};

export const PendingBookingsList = ({
  businessId,
  eventId,
  language,
  searchQuery,
  onConfirmed,
}: PendingBookingsListProps) => {
  const tr = t[language];
  const [rows, setRows] = useState<PendingBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Inline note editing state — only one row editable at a time.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Strip the leading "+357" (with optional space) for compact display in the merged details cell.
  const formatPhoneCompact = (phone: string) => phone.replace(/^\+357\s*/, '');

  const startEditNote = (id: string, current: string | null) => {
    setEditingNoteId(id);
    setNoteDraft(current ?? '');
  };
  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNoteDraft('');
  };
  const saveNote = async (id: string) => {
    setSavingNoteId(id);
    try {
      const trimmed = noteDraft.trim();
      const { error } = await supabase
        .from('pending_bookings')
        .update({ notes: trimmed.length > 0 ? trimmed : null })
        .eq('id', id);
      if (error) throw error;
      // Optimistic local update so the UI reflects the change immediately.
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, notes: trimmed.length > 0 ? trimmed : null } : r)));
      toast.success(tr.noteSaved);
      setEditingNoteId(null);
      setNoteDraft('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr.noteSaveError);
    } finally {
      setSavingNoteId(null);
    }
  };

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('pending_bookings')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (eventId) q = q.eq('event_id', eventId);

    const { data, error } = await q;
    if (error) {
      console.error('PendingBookingsList fetch:', error);
      setRows([]);
    } else {
      setRows((data ?? []) as PendingBookingRow[]);
    }
    setLoading(false);
  }, [businessId, eventId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`pending-bookings-${businessId}-${eventId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_bookings', filter: `business_id=eq.${businessId}` },
        (payload) => {
          const newRow = payload.new as PendingBookingRow | undefined;
          const oldRow = payload.old as PendingBookingRow | undefined;
          // event filter on client side (filters compose with AND on PG side per col)
          if (eventId) {
            const matches = (newRow?.event_id ?? oldRow?.event_id) === eventId;
            if (!matches) return;
          }
          // Refresh and notify parent if a row became confirmed
          if (
            payload.eventType === 'UPDATE' &&
            newRow?.status === 'completed' &&
            oldRow?.status !== 'completed'
          ) {
            onConfirmed?.();
          }
          fetchRows();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, eventId, fetchRows, onConfirmed]);

  const handleResend = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke('resend-booking-sms', {
        body: { pending_booking_id: id },
      });
      if (error) throw error;
      const r = data as { success?: boolean; error?: string };
      if (!r?.success) {
        toast.error(r?.error ?? 'Error');
        return;
      }
      toast.success(tr.resendOk);
      fetchRows();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-pending-booking', {
        body: { pending_booking_id: id },
      });
      if (error) throw error;
      const r = data as { success?: boolean; error?: string };
      if (!r?.success) {
        toast.error(r?.error ?? 'Error');
        return;
      }
      toast.success(tr.deleteOk);
      fetchRows();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  const renderStatus = (s: PendingBookingRow['status']) => {
    if (s === 'pending') {
      return (
        <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
          <Clock className="h-3 w-3" /> {tr.pending}
        </Badge>
      );
    }
    if (s === 'completed') {
      return (
        <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" /> {tr.confirmed}
        </Badge>
      );
    }
    if (s === 'link_expired') {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600">
          <AlertTriangle className="h-3 w-3" /> {tr.expired}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> {tr.cancelled}
      </Badge>
    );
  };

  // For reservation bookings, prefer the seating_preference (Table/Sofa/VIP/Bar) the
  // business owner picked when filling the form. Fall back to the booking-type label
  // if no seating preference is stored (older rows / ticket / walk-in flows).
  const renderType = (b: PendingBookingRow) => {
    if (b.booking_type === 'reservation' && b.seating_preference) {
      return translateSeatingType(b.seating_preference, language);
    }
    return b.booking_type === 'reservation'
      ? tr.typeRes
      : b.booking_type === 'walk_in'
        ? tr.typeWi
        : tr.typeTk;
  };

  // Only count actionable rows (pending or expired). Hide section entirely when none.
  const baseVisible = rows.filter(
    (r) => r.status === 'pending' || r.status === 'link_expired',
  );

  // Apply optional search query — match against customer name OR phone.
  const visibleRows = useMemo(() => {
    const q = searchQuery?.trim().toLowerCase();
    if (!q) return baseVisible;
    return baseVisible.filter((r) =>
      (r.customer_name ?? '').toLowerCase().includes(q) ||
      (r.customer_phone ?? '').toLowerCase().includes(q),
    );
  }, [baseVisible, searchQuery]);

  if (loading) return null;
  if (visibleRows.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {tr.title} ({visibleRows.length})
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr.name}</TableHead>
              <TableHead>{tr.phone}</TableHead>
              <TableHead>{tr.type}</TableHead>
              <TableHead>{tr.party}</TableHead>
              <TableHead>{tr.careOf}</TableHead>
              <TableHead>{tr.status}</TableHead>
              <TableHead>{tr.expires}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((r) => {
              const canAct = r.status === 'pending' || r.status === 'link_expired' || r.status === 'cancelled';
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customer_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.customer_phone}</TableCell>
                  <TableCell>{renderType(r)}</TableCell>
                  <TableCell>{r.party_size ?? '—'}</TableCell>
                  <TableCell>{r.care_of ?? '—'}</TableCell>
                  <TableCell>{renderStatus(r.status)}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(r.expires_at), 'dd MMM HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canAct && r.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={busyId === r.id}
                          onClick={() => handleResend(r.id)}
                          title={tr.resend}
                        >
                          <RefreshCw className={busyId === r.id ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        </Button>
                      )}
                      {canAct && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title={tr.delete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{tr.confirmDelete}</AlertDialogTitle>
                              <AlertDialogDescription>{tr.confirmDeleteDesc}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{tr.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(r.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {tr.yesDelete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
