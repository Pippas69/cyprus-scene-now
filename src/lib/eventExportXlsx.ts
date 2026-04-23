import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { translateSeatingType, translateTierName } from '@/lib/seatingTranslations';
import { translateCity } from '@/lib/cityTranslations';

type Language = 'el' | 'en';

export interface ExportReservationRow {
  id: string;
  reservation_name: string;
  party_size: number;
  status: string;
  manual_status?: string | null;
  checked_in_at?: string | null;
  phone_number?: string | null;
  email?: string | null;
  created_at?: string;
  preferred_time?: string | null;
  seating_type_id?: string | null;
  prepaid_min_charge_cents?: number | null;
  ticket_credit_cents?: number | null;
  source?: string | null;
  staff_memo?: string | null;
  business_notes?: string | null;
  special_requests?: string | null;
  guest_ages?: string | null;
  guest_city?: string | null;
  transaction_code?: string | null;
  confirmation_code?: string | null;
  is_manual_entry?: boolean;
  auto_created_from_tickets?: boolean;
}

export interface ExportTicketRow {
  ticket_id: string;
  guest_name: string;
  guest_age: number | null;
  guest_city?: string | null;
  buyer_phone: string | null;
  tier_name: string;
  tier_price_cents: number;
  subtotal_cents: number;
  status: string;
  checked_in: boolean;
  manual_status?: string | null;
  ticket_code?: string | null;
  source?: string | null;
  staff_memo?: string | null;
  created_at?: string;
}

export interface ExportContext {
  language: Language;
  eventTitle: string;
  eventStartAt?: string | null;
  eventType: string | null; // 'ticket' | 'reservation' | 'ticket_and_reservation' | 'ticket_reservation'
  reservations: ExportReservationRow[];
  ticketOnlyOrders: ExportTicketRow[];
  seatingTypeNames: Record<string, string>;
  tableAssignmentLabels: Record<string, string>;
  agesByReservation: Record<string, number[]>;
  cityByReservation: Record<string, string>;
  checkInCounts: Record<string, { used: number; total: number }>;
  compCountByParent: Record<string, number>;
}

const tx = {
  el: {
    sheetName: 'Διαχείριση',
    type: 'Τύπος',
    reservation: 'Κράτηση',
    ticket: 'Εισιτήριο',
    name: 'Όνομα',
    partySize: 'Άτομα',
    seating: 'Θέση',
    table: 'Τραπέζι',
    status: 'Κατάσταση',
    checkedIn: 'Check-in',
    yes: 'Ναι',
    no: 'Όχι',
    phone: 'Τηλέφωνο',
    email: 'Email',
    ages: 'Ηλικίες',
    city: 'Πόλη',
    amount: 'Ποσό (€)',
    minCharge: 'Πίστωση τραπεζιού (€)',
    paid: 'Πληρωμένο (€)',
    tier: 'Κατηγορία',
    source: 'Προέλευση',
    notes: 'Σημειώσεις',
    businessNotes: 'Σημειώσεις επιχείρησης',
    specialRequests: 'Ειδικά αιτήματα',
    transactionCode: 'Κωδ. Συναλλαγής',
    ticketCode: 'Κωδ. Εισιτηρίου',
    confirmationCode: 'Κωδ. Επιβεβαίωσης',
    createdAt: 'Δημιουργία',
    preferredTime: 'Προτιμώμενη ώρα',
    comps: 'Δωρεάν προσκλήσεις',
    accepted: 'Αποδεκτή',
    pending: 'Σε αναμονή',
    cancelled: 'Ακυρωμένη',
    no_show: 'Δεν εμφανίστηκε',
    arrived: 'Έφτασε',
    checkedInLabel: 'Check-in',
    completed: 'Ολοκληρώθηκε',
    walk_in: 'Walk-in',
    invitation: 'Πρόσκληση',
    manual: 'Χειροκίνητη',
    online: 'Online',
    pay_at_door: 'Πληρωμή στην είσοδο',
  },
  en: {
    sheetName: 'Management',
    type: 'Type',
    reservation: 'Reservation',
    ticket: 'Ticket',
    name: 'Name',
    partySize: 'Guests',
    seating: 'Seating',
    table: 'Table',
    status: 'Status',
    checkedIn: 'Check-in',
    yes: 'Yes',
    no: 'No',
    phone: 'Phone',
    email: 'Email',
    ages: 'Ages',
    city: 'City',
    amount: 'Amount (€)',
    minCharge: 'Table credit (€)',
    paid: 'Paid (€)',
    tier: 'Tier',
    source: 'Source',
    notes: 'Notes',
    businessNotes: 'Business notes',
    specialRequests: 'Special requests',
    transactionCode: 'Transaction code',
    ticketCode: 'Ticket code',
    confirmationCode: 'Confirmation code',
    createdAt: 'Created',
    preferredTime: 'Preferred time',
    comps: 'Comp guests',
    accepted: 'Accepted',
    pending: 'Pending',
    cancelled: 'Cancelled',
    no_show: 'No-show',
    arrived: 'Arrived',
    checkedInLabel: 'Checked-in',
    completed: 'Completed',
    walk_in: 'Walk-in',
    invitation: 'Invitation',
    manual: 'Manual',
    online: 'Online',
    pay_at_door: 'Pay at door',
  },
};

const formatStatus = (
  status: string | null | undefined,
  manualStatus: string | null | undefined,
  checkedInAt: string | null | undefined,
  t: typeof tx['el'],
): string => {
  const ms = manualStatus || status || '';
  const key = ms.toLowerCase();
  if (checkedInAt || key === 'arrived' || key === 'checked_in') return t.checkedInLabel;
  switch (key) {
    case 'accepted': return t.accepted;
    case 'pending': return t.pending;
    case 'cancelled':
    case 'canceled': return t.cancelled;
    case 'no_show': return t.no_show;
    case 'completed': return t.completed;
    default: return ms || '';
  }
};

const formatSource = (src: string | null | undefined, t: typeof tx['el']): string => {
  if (!src) return '';
  const key = src.toLowerCase();
  switch (key) {
    case 'walk_in': return t.walk_in;
    case 'invitation': return t.invitation;
    case 'manual': return t.manual;
    case 'online': return t.online;
    case 'pay_at_door':
    case 'pay_at_store': return t.pay_at_door;
    default: return src;
  }
};

const cents = (v: number | null | undefined): number => {
  if (v == null) return 0;
  return Math.round(v) / 100;
};

const sanitizeFileName = (name: string): string =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'event';

export function exportEventManagementToXlsx(ctx: ExportContext): void {
  const t = tx[ctx.language];
  const isReservationOnly = ctx.eventType === 'reservation';
  const isTicketOnly = ctx.eventType === 'ticket';
  const isHybrid =
    ctx.eventType === 'ticket_reservation' || ctx.eventType === 'ticket_and_reservation';

  const rows: Record<string, string | number>[] = [];

  // Reservation rows (skip pure walk-in synthetic IDs already exposed as ticket-style? — no, they are in reservations array as walkin-* but include them too for completeness)
  if (!isTicketOnly) {
    for (const r of ctx.reservations) {
      const seatingName = r.seating_type_id
        ? translateSeatingType(ctx.seatingTypeNames[r.seating_type_id] || '', ctx.language)
        : '';
      const tableLabel = ctx.tableAssignmentLabels[r.id] || '';
      const ages = (ctx.agesByReservation[r.id] || []).join(', ') || r.guest_ages || '';
      const city = translateCity(ctx.cityByReservation[r.id] || r.guest_city || '', ctx.language);
      const checkInInfo = ctx.checkInCounts[r.id];
      const checkedInDisplay = checkInInfo
        ? `${checkInInfo.used}/${checkInInfo.total}`
        : (r.checked_in_at ? t.yes : t.no);
      const compCount = ctx.compCountByParent[r.id] || 0;

      rows.push({
        [t.type]: t.reservation,
        [t.name]: r.reservation_name || '',
        [t.partySize]: r.party_size || 0,
        [t.comps]: compCount,
        [t.seating]: seatingName,
        [t.table]: tableLabel,
        [t.status]: formatStatus(r.status, r.manual_status, r.checked_in_at, t),
        [t.checkedIn]: checkedInDisplay,
        [t.phone]: r.phone_number || '',
        [t.email]: r.email || '',
        [t.ages]: ages,
        [t.city]: city,
        [t.minCharge]: cents(r.prepaid_min_charge_cents),
        [t.paid]: cents(r.ticket_credit_cents),
        [t.tier]: '',
        [t.source]: formatSource(r.source, t),
        [t.preferredTime]: r.preferred_time || '',
        [t.notes]: r.staff_memo || '',
        [t.businessNotes]: r.business_notes || '',
        [t.specialRequests]: r.special_requests || '',
        [t.transactionCode]: r.transaction_code || '',
        [t.confirmationCode]: r.confirmation_code || '',
        [t.ticketCode]: '',
        [t.createdAt]: r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd HH:mm') : '',
      });
    }
  }

  // Ticket-only rows (for ticket-only events and any ticket orders shown in hybrid via ticketOnlyOrders)
  if (isTicketOnly || isHybrid) {
    for (const o of ctx.ticketOnlyOrders) {
      rows.push({
        [t.type]: t.ticket,
        [t.name]: o.guest_name || '',
        [t.partySize]: 1,
        [t.comps]: 0,
        [t.seating]: '',
        [t.table]: '',
        [t.status]: formatStatus(o.status, o.manual_status, o.checked_in ? new Date().toISOString() : null, t),
        [t.checkedIn]: o.checked_in ? t.yes : t.no,
        [t.phone]: o.buyer_phone || '',
        [t.email]: '',
        [t.ages]: o.guest_age != null ? String(o.guest_age) : '',
        [t.city]: translateCity(o.guest_city || '', ctx.language),
        [t.minCharge]: 0,
        [t.paid]: cents(o.subtotal_cents ?? o.tier_price_cents),
        [t.tier]: translateTierName(o.tier_name, ctx.language),
        [t.source]: formatSource(o.source, t),
        [t.preferredTime]: '',
        [t.notes]: o.staff_memo || '',
        [t.businessNotes]: '',
        [t.specialRequests]: '',
        [t.transactionCode]: '',
        [t.confirmationCode]: '',
        [t.ticketCode]: o.ticket_code || '',
        [t.createdAt]: o.created_at ? format(new Date(o.created_at), 'yyyy-MM-dd HH:mm') : '',
      });
    }
  }

  // Build sheet
  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: rows.length === 0 });

  // Column widths (approximate)
  const headerKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
  ws['!cols'] = headerKeys.map((k) => {
    const maxLen = Math.max(
      k.length,
      ...rows.map((r) => String(r[k] ?? '').length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t.sheetName);

  const eventDate = ctx.eventStartAt
    ? format(new Date(ctx.eventStartAt), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');
  const filename = `${sanitizeFileName(ctx.eventTitle)} - ${eventDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
