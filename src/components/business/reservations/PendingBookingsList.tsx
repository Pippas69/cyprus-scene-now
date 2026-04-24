import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
    info: 'Λεπτομέρειες',
    people: 'άτομα',
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
    info: 'Details',
    people: 'people',
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
        <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground whitespace-nowrap">
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
              <TableHead className="whitespace-nowrap min-w-[160px]">{tr.details}</TableHead>
              <TableHead className="whitespace-nowrap min-w-[110px] px-[10px]">{tr.info}</TableHead>
              <TableHead className="whitespace-nowrap min-w-[100px]">{tr.careOf}</TableHead>
              <TableHead className="whitespace-nowrap min-w-[150px] text-center px-0">{tr.status}</TableHead>
              <TableHead className="min-w-[260px]">{tr.note}</TableHead>
              <TableHead className="whitespace-nowrap min-w-[110px] px-0">{tr.expires}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((r) => {
              const canAct = r.status === 'pending' || r.status === 'link_expired' || r.status === 'cancelled';
              const isEditingNote = editingNoteId === r.id;
              return (
                <TableRow key={r.id}>
                  {/* Στοιχεία: name on top, phone below in smaller muted text without +357 */}
                  <TableCell className="align-top whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium leading-tight whitespace-nowrap">{r.customer_name ?? '—'}</span>
                      <span className="text-xs text-muted-foreground font-mono leading-tight whitespace-nowrap">
                        {formatPhoneCompact(r.customer_phone)}
                      </span>
                    </div>
                  </TableCell>
                  {/* Λεπτομέρειες: party size on top, type below */}
                  <TableCell className="align-top whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium leading-tight whitespace-nowrap">
                        {r.party_size ?? '—'} {tr.people}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight whitespace-nowrap">
                        {renderType(r)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.care_of ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-center px-[50px]">{renderStatus(r.status)}</TableCell>
                  {/* Σημείωση — editable inline */}
                  <TableCell className="align-top min-w-[260px]">
                    {isEditingNote ? (
                      <div className="flex items-start gap-1">
                        <Textarea
                          autoFocus
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              saveNote(r.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEditNote();
                            }
                          }}
                          placeholder={tr.notePlaceholder}
                          className="min-h-[60px] text-xs w-full min-w-[200px] resize-y"
                          rows={2}
                          disabled={savingNoteId === r.id}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => saveNote(r.id)}
                          disabled={savingNoteId === r.id}
                          title={tr.save}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={cancelEditNote}
                          disabled={savingNoteId === r.id}
                          title={tr.cancelEdit}
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditNote(r.id, r.notes)}
                        className="group flex items-start gap-1 text-left text-xs w-full hover:bg-muted/40 rounded px-1 py-0.5 transition-colors"
                        title={tr.note}
                      >
                        <span className={`flex-1 break-words ${r.notes ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                          {r.notes && r.notes.length > 0 ? r.notes : tr.notePlaceholder}
                        </span>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-left px-0">
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
