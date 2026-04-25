import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { translateSeatingType } from '@/lib/seatingTranslations';
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
  care_of?: string | null;
}

export interface ExportTicketRow {
  ticket_id: string;
  guest_name: string;
  guest_age: number | null;
  guest_city?: string | null;
  account_city?: string | null;
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
  care_of?: string | null;
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
  // Pre-resolved minimum charge per reservation, mirroring what the management UI shows.
  // Falls back to the row's stored prepaid_min_charge_cents when missing.
  displayMinChargeByReservation?: Record<string, number>;
}

const tx = {
  el: {
    sheetReservations: 'Κρατήσεις',
    sheetWalkIns: 'Walk-in',
    sheetTickets: 'Εισιτήρια',
    name: 'Όνομα',
    phone: 'Τηλέφωνο',
    city: 'Πόλη',
    age: 'Ηλικία',
    price: 'Τιμή',
    walkInPrice: 'Τιμή Walk-in',
    booking: 'Κράτηση',
    minCharge: 'Ελάχιστη Χρέωση',
    prepaid: 'Προπληρωμή',
    seating: 'Θέση',
    careOf: 'Care of',
    notes: 'Σημειώσεις',
    invitation: 'Πρόσκληση',
    person: 'άτομο',
    persons: 'άτομα',
    dash: '—',
  },
  en: {
    sheetReservations: 'Reservations',
    sheetWalkIns: 'Walk-in',
    sheetTickets: 'Tickets',
    name: 'Name',
    phone: 'Phone',
    city: 'City',
    age: 'Age',
    price: 'Price',
    walkInPrice: 'Walk-in Price',
    booking: 'Booking',
    minCharge: 'Minimum Charge',
    prepaid: 'Prepaid',
    seating: 'Seating',
    careOf: 'Care of',
    notes: 'Notes',
    invitation: 'Invitation',
    person: 'person',
    persons: 'people',
    dash: '—',
  },
};

const cents = (v: number | null | undefined): string => {
  if (v == null || v === 0) return '';
  return `€${(Math.round(v) / 100).toFixed(2)}`;
};

// Normalize a phone for display: ensure international format. If it's a Cyprus 8-digit
// local number, prefix with +357. If it already starts with +, keep as-is.
const formatPhone = (raw: string | null | undefined): string => {
  if (!raw) return '';
  let v = String(raw).trim();
  if (!v) return '';
  // Strip spaces, dashes, parens
  v = v.replace(/[\s\-()]/g, '');
  if (v.startsWith('+')) return v;
  if (v.startsWith('00')) return '+' + v.slice(2);
  // Already starts with country code 357 without +
  if (/^357\d{8}$/.test(v)) return '+' + v;
  // Cyprus 8-digit local number
  if (/^\d{8}$/.test(v)) return '+357' + v;
  // Fallback: return original cleaned value
  return v;
};

// Price for a ticket row: shows €X.XX, or "Πρόσκληση"/"Invitation" when the row is
// an invitation/comp with no price.
const priceOrInvitation = (
  paidCents: number | null | undefined,
  tierCents: number | null | undefined,
  source: string | null | undefined,
  t: typeof tx['el'],
): string => {
  const isInvitation = (source || '').toLowerCase() === 'invitation';
  if (isInvitation) return t.invitation;
  if (paidCents && paidCents > 0) return `€${(Math.round(paidCents) / 100).toFixed(2)}`;
  if (tierCents && tierCents > 0) return `€${(Math.round(tierCents) / 100).toFixed(2)}`;
  return t.invitation;
};

const sanitizeFileName = (name: string): string =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'event';

const formatBooking = (partySize: number, t: typeof tx['el']): string => {
  const n = Math.max(1, partySize || 1);
  return `${n} ${n === 1 ? t.person : t.persons}`;
};

const formatSeating = (
  seatingTypeId: string | null | undefined,
  seatingTypeNames: Record<string, string>,
  tableLabel: string | undefined,
  language: Language,
): string => {
  if (!seatingTypeId) return '';
  const rawName = seatingTypeNames[seatingTypeId] || '';
  const translated = translateSeatingType(rawName, language);
  if (tableLabel && tableLabel.trim()) return `${translated} (${tableLabel.trim()})`;
  return translated;
};

const careOfDisplay = (v: string | null | undefined): string => {
  const trimmed = (v || '').trim();
  return trimmed || 'ΦOMO';
};

// Build a worksheet from rows with consistent styling: bold header, autofilter, frozen header,
// auto column widths.
const buildWorksheet = (rows: Record<string, string>[], headers: string[]): XLSX.WorkSheet => {
  // Ensure every row has every header key (so blank cells exist) and key order matches headers.
  const normalized = rows.map((r) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = r[h] ?? '';
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(normalized, { header: headers });

  // Column widths
  ws['!cols'] = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...normalized.map((r) => String(r[h] ?? '').length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
  });

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }] as any;

  // Autofilter over header row
  if (normalized.length > 0) {
    const lastCol = XLSX.utils.encode_col(headers.length - 1);
    ws['!autofilter'] = { ref: `A1:${lastCol}1` };
  }

  // Row heights — slightly taller header
  ws['!rows'] = [{ hpx: 22 }, ...normalized.map(() => ({ hpx: 18 }))];

  return ws;
};

export function exportEventManagementToXlsx(ctx: ExportContext): void {
  const t = tx[ctx.language];
  const isReservationOnly = ctx.eventType === 'reservation';
  const isTicketOnly = ctx.eventType === 'ticket';
  const isHybrid =
    ctx.eventType === 'ticket_reservation' || ctx.eventType === 'ticket_and_reservation';

  const wb = XLSX.utils.book_new();

  // Helper accessors
  const getCity = (r: ExportReservationRow): string =>
    translateCity(ctx.cityByReservation[r.id] || r.guest_city || '', ctx.language);

  // Split reservations into "real" reservations and walk-in synthetic rows.
  // Walk-ins are identified by either:
  //  - synthetic ID prefix "walkin-" (orphan/legacy ticket orders shown as walk-ins), or
  //  - source === 'walk_in' (manual walk-in entry, with or without a seating assignment), or
  //  - source === 'invitation' with no seating (free invitation rows that show in the list).
  const realReservations: ExportReservationRow[] = [];
  const walkInReservations: ExportReservationRow[] = [];
  for (const r of ctx.reservations) {
    const isWalkInSynthetic =
      r.id?.startsWith('walkin-') ||
      r.source === 'walk_in' ||
      (r.source === 'invitation' && !r.seating_type_id);
    if (isWalkInSynthetic) walkInReservations.push(r);
    else realReservations.push(r);
  }

  const minChargeFor = (r: ExportReservationRow): string => {
    const map = ctx.displayMinChargeByReservation;
    const resolved = map ? map[r.id] : undefined;
    if (resolved != null) return cents(resolved);
    return cents(r.prepaid_min_charge_cents);
  };

  // Walk-in price: synthetic walk-ins (from ticket orders) carry the price in
  // ticket_credit_cents; manual walk-in entries carry it in prepaid_min_charge_cents.
  const walkInPriceFor = (r: ExportReservationRow): string => {
    if (r.ticket_credit_cents && r.ticket_credit_cents > 0) return cents(r.ticket_credit_cents);
    if (r.prepaid_min_charge_cents && r.prepaid_min_charge_cents > 0) return cents(r.prepaid_min_charge_cents);
    return '';
  };

  // ============================================================
  // TICKET-ONLY EVENT
  // Columns: Όνομα, Τηλέφωνο, Πόλη, Ηλικία, Τιμή, Care of, Σημειώσεις
  // ============================================================
  if (isTicketOnly) {
    const headers = [t.name, t.phone, t.city, t.age, t.price, t.careOf, t.notes];
    const rows = ctx.ticketOnlyOrders.map((o) => {
      // City: prefer per-ticket guest_city override, else fall back to buyer/account city
      const rawCity = (o.guest_city && o.guest_city.trim())
        || (o.account_city && o.account_city.trim())
        || '';
      return {
        [t.name]: o.guest_name || '',
        [t.phone]: formatPhone(o.buyer_phone),
        [t.city]: translateCity(rawCity, ctx.language),
        [t.age]: o.guest_age != null ? String(o.guest_age) : '',
        [t.price]: priceOrInvitation(o.subtotal_cents, o.tier_price_cents, o.source, t),
        [t.careOf]: careOfDisplay(o.care_of),
        [t.notes]: o.staff_memo || '',
      };
    });
    const ws = buildWorksheet(rows, headers);
    XLSX.utils.book_append_sheet(wb, ws, t.sheetTickets);
  }

  // ============================================================
  // RESERVATION-ONLY (with or without walk-in)
  // Reservation sheet columns:
  //   Όνομα, Τηλέφωνο, Κράτηση, Πόλη, Ελάχιστη Χρέωση, Θέση, Care of, Σημειώσεις
  // Walk-in sheet (if any walk-ins exist) columns:
  //   Όνομα, Τηλέφωνο, Κράτηση, Πόλη, Τιμή Walk-in, Θέση, Care of, Σημειώσεις
  // ============================================================
  if (isReservationOnly) {
    const resHeaders = [
      t.name,
      t.phone,
      t.booking,
      t.city,
      t.minCharge,
      t.seating,
      t.careOf,
      t.notes,
    ];
    const resRows = realReservations.map((r) => ({
      [t.name]: r.reservation_name || '',
      [t.phone]: formatPhone(r.phone_number),
      [t.booking]: formatBooking(r.party_size, t),
      [t.city]: getCity(r),
      [t.minCharge]: minChargeFor(r),
      [t.seating]: formatSeating(
        r.seating_type_id,
        ctx.seatingTypeNames,
        ctx.tableAssignmentLabels[r.id],
        ctx.language,
      ),
      [t.careOf]: careOfDisplay(r.care_of),
      [t.notes]: r.staff_memo || '',
    }));
    XLSX.utils.book_append_sheet(wb, buildWorksheet(resRows, resHeaders), t.sheetReservations);

    if (walkInReservations.length > 0) {
      const wHeaders = [
        t.name,
        t.phone,
        t.booking,
        t.city,
        t.walkInPrice,
        t.seating,
        t.careOf,
        t.notes,
      ];
      const wRows = walkInReservations.map((r) => ({
        [t.name]: r.reservation_name || '',
        [t.phone]: formatPhone(r.phone_number),
        [t.booking]: formatBooking(1, t),
        [t.city]: getCity(r),
        [t.walkInPrice]: cents(r.ticket_credit_cents),
        [t.seating]: t.dash,
        [t.careOf]: careOfDisplay(r.care_of),
        [t.notes]: r.staff_memo || '',
      }));
      XLSX.utils.book_append_sheet(wb, buildWorksheet(wRows, wHeaders), t.sheetWalkIns);
    }
  }

  // ============================================================
  // HYBRID (ticket + reservation, with optional walk-in)
  // Reservation sheet columns:
  //   Όνομα, Τηλέφωνο, Κράτηση, Πόλη, Ελάχιστη Χρέωση, Προπληρωμή, Θέση, Care of, Σημειώσεις
  // Walk-in sheet columns:
  //   Όνομα, Τηλέφωνο, Κράτηση, Πόλη, Τιμή Walk-in, Θέση, Care of, Σημειώσεις
  // ============================================================
  if (isHybrid) {
    const resHeaders = [
      t.name,
      t.phone,
      t.booking,
      t.city,
      t.minCharge,
      t.prepaid,
      t.seating,
      t.careOf,
      t.notes,
    ];
    const resRows = realReservations.map((r) => ({
      [t.name]: r.reservation_name || '',
      [t.phone]: formatPhone(r.phone_number),
      [t.booking]: formatBooking(r.party_size, t),
      [t.city]: getCity(r),
      [t.minCharge]: minChargeFor(r),
      [t.prepaid]: cents(r.ticket_credit_cents),
      [t.seating]: formatSeating(
        r.seating_type_id,
        ctx.seatingTypeNames,
        ctx.tableAssignmentLabels[r.id],
        ctx.language,
      ),
      [t.careOf]: careOfDisplay(r.care_of),
      [t.notes]: r.staff_memo || '',
    }));
    XLSX.utils.book_append_sheet(wb, buildWorksheet(resRows, resHeaders), t.sheetReservations);

    if (walkInReservations.length > 0) {
      const wHeaders = [
        t.name,
        t.phone,
        t.booking,
        t.city,
        t.walkInPrice,
        t.seating,
        t.careOf,
        t.notes,
      ];
      const wRows = walkInReservations.map((r) => ({
        [t.name]: r.reservation_name || '',
        [t.phone]: formatPhone(r.phone_number),
        [t.booking]: formatBooking(1, t),
        [t.city]: getCity(r),
        [t.walkInPrice]: cents(r.ticket_credit_cents),
        [t.seating]: t.dash,
        [t.careOf]: careOfDisplay(r.care_of),
        [t.notes]: r.staff_memo || '',
      }));
      XLSX.utils.book_append_sheet(wb, buildWorksheet(wRows, wHeaders), t.sheetWalkIns);
    }
  }

  // Apply a consistent header style across all sheets (bold, centered, light fill).
  // Note: SheetJS community build does not persist cell styles, but we set them
  // for any consumer that supports them (and as documentation of intent).
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const ref = ws['!ref'];
    if (!ref) continue;
    const range = XLSX.utils.decode_range(ref);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      cell.s = {
        font: { bold: true, name: 'Calibri', sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'F2F2F2' } },
      };
    }
    // Apply default font to all data cells
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = {
          font: { name: 'Calibri', sz: 11 },
          alignment: { vertical: 'center' },
        };
      }
    }
  }

  const eventDate = ctx.eventStartAt
    ? format(new Date(ctx.eventStartAt), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');
  const filename = `${sanitizeFileName(ctx.eventTitle)} - ${eventDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
