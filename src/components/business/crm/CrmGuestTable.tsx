import { type CrmGuest } from "@/hooks/useCrmGuests";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUpDown, ArrowUp, ArrowDown, Star, MessageSquare, Ghost } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";

type SortField = "guest_name" | "total_visits" | "last_visit" | "total_spend_cents" | "total_no_shows" | "internal_rating";
type SortDir = "asc" | "desc";

interface CrmGuestTableProps {
  guests: CrmGuest[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onSelectGuest: (guest: CrmGuest) => void;
  floorPlanEnabled?: boolean;
}

const translations = {
  el: {
    guest: "Πελάτης",
    visits: "Επισκέψεις",
    lastVisit: "Τελευταία",
    spend: "Έξοδα",
    noShows: "No-shows",
    tags: "Tags",
    loyalty: "Loyalty",
    table: "Τραπέζι",
    never: "Ποτέ",
    ghost: "Ghost",
  },
  en: {
    guest: "Guest",
    visits: "Visits",
    lastVisit: "Last visit",
    spend: "Spend",
    noShows: "No-shows",
    tags: "Tags",
    loyalty: "Loyalty",
    table: "Table",
    never: "Never",
    ghost: "Ghost",
  },
};

function getLoyaltyLevel(visits: number, spendCents: number): { label: string; emoji: string; variant: "platinum" | "gold" | "silver" | "bronze" } | null {
  if (visits >= 20 && spendCents >= 100000) return { label: "Platinum", emoji: "💎", variant: "platinum" };
  if (visits >= 10 && spendCents >= 50000) return { label: "Gold", emoji: "🥇", variant: "gold" };
  if (visits >= 5 && spendCents >= 20000) return { label: "Silver", emoji: "🥈", variant: "silver" };
  if (visits >= 3) return { label: "Bronze", emoji: "🥉", variant: "bronze" };
  return null;
}

const loyaltyStyles = {
  platinum: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  gold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  silver: "bg-slate-400/15 text-slate-300 border-slate-400/30",
  bronze: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

function SortIcon({ field, currentField, dir }: { field: SortField; currentField: SortField; dir: SortDir }) {
  if (field !== currentField) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

function HeaderCell({
  children,
  field,
  sortField,
  sortDir,
  onSort,
  className = "",
}: {
  children: React.ReactNode;
  field?: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  return (
    <TableHead
      className={`${field ? "cursor-pointer select-none" : ""} ${className}`}
      onClick={field ? () => onSort(field) : undefined}
    >
      <div className={`flex items-center gap-1.5 text-[11px] tracking-wide font-medium text-muted-foreground ${className.includes("justify-center") ? "justify-center" : className.includes("justify-end") ? "justify-end" : ""}`}>
        {children}
        {field && <SortIcon field={field} currentField={sortField} dir={sortDir} />}
      </div>
    </TableHead>
  );
}

export function CrmGuestTable({ guests, sortField, sortDir, onSort, onSelectGuest, floorPlanEnabled }: CrmGuestTableProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-border/40">
          <HeaderCell field="guest_name" sortField={sortField} sortDir={sortDir} onSort={onSort} className="min-w-[180px]">
            {t.guest}
          </HeaderCell>
          <HeaderCell field="total_visits" sortField={sortField} sortDir={sortDir} onSort={onSort} className="text-center w-20 justify-center">
            {t.visits}
          </HeaderCell>
          <HeaderCell field="last_visit" sortField={sortField} sortDir={sortDir} onSort={onSort} className="min-w-[100px]">
            {t.lastVisit}
          </HeaderCell>
          <HeaderCell field="total_spend_cents" sortField={sortField} sortDir={sortDir} onSort={onSort} className="text-right w-24 justify-end">
            {t.spend}
          </HeaderCell>
          <HeaderCell field="total_no_shows" sortField={sortField} sortDir={sortDir} onSort={onSort} className="text-center w-20 justify-center">
            {t.noShows}
          </HeaderCell>
          {floorPlanEnabled && (
            <HeaderCell sortField={sortField} sortDir={sortDir} onSort={onSort} className="min-w-[80px]">
              {t.table}
            </HeaderCell>
          )}
          <HeaderCell sortField={sortField} sortDir={sortDir} onSort={onSort} className="min-w-[120px]">
            {t.tags}
          </HeaderCell>
          <HeaderCell sortField={sortField} sortDir={sortDir} onSort={onSort} className="w-24">
            {t.loyalty}
          </HeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {guests.map((guest) => {
          const loyalty = getLoyaltyLevel(guest.total_visits, guest.total_spend_cents);
          const loyaltyVariant = guest.vip_level_override
            ? (guest.vip_level_override as "platinum" | "gold" | "silver" | "bronze")
            : loyalty?.variant;
          const loyaltyLabel = guest.vip_level_override
            ? `${guest.vip_level_override === "platinum" ? "💎" : guest.vip_level_override === "gold" ? "🥇" : guest.vip_level_override === "silver" ? "🥈" : "🥉"} ${guest.vip_level_override}`
            : loyalty ? `${loyalty.emoji} ${loyalty.label}` : null;

          const initials = guest.guest_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          const isGhost = guest.profile_type === "ghost";

          return (
            <TableRow
              key={guest.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors border-border/30"
              onClick={() => onSelectGuest(guest)}
            >
              {/* Guest name */}
              <TableCell className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar className={`h-8 w-8 flex-shrink-0 ring-1 ${isGhost ? "ring-muted-foreground/30" : "ring-primary/30"}`}>
                    <AvatarFallback className={`text-[10px] font-medium ${isGhost ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                      {isGhost ? <Ghost className="h-3.5 w-3.5" /> : initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{guest.guest_name}</span>
                      {loyaltyLabel && loyaltyVariant && (
                        <span className={`hidden sm:inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${loyaltyStyles[loyaltyVariant]}`}>
                          {loyaltyLabel}
                        </span>
                      )}
                      {guest.notes_count > 0 && (
                        <MessageSquare className="h-3 w-3 text-primary/60 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isGhost && (
                        <span className="text-[9px] text-muted-foreground/70 italic">
                          {t.ghost}
                        </span>
                      )}
                      {!isGhost && guest.phone && (
                        <span className="text-[10px] text-muted-foreground truncate">{guest.phone}</span>
                      )}
                      {!isGhost && guest.email && !guest.phone && (
                        <span className="text-[10px] text-muted-foreground truncate">{guest.email}</span>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>

              {/* Visits */}
              <TableCell className="text-center py-2.5">
                <span className="text-sm font-semibold text-foreground">{guest.total_visits}</span>
              </TableCell>

              {/* Last visit */}
              <TableCell className="py-2.5">
                <span className="text-xs text-muted-foreground">
                  {guest.last_visit
                    ? formatDistanceToNow(new Date(guest.last_visit), { addSuffix: true, locale })
                    : t.never}
                </span>
              </TableCell>

              {/* Spend */}
              <TableCell className="text-right py-2.5">
                <span className="text-sm font-medium text-foreground">
                  €{(guest.total_spend_cents / 100).toFixed(0)}
                </span>
              </TableCell>

              {/* No-shows */}
              <TableCell className="text-center py-2.5">
                <span className={`text-sm ${guest.total_no_shows >= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {guest.total_no_shows}
                </span>
              </TableCell>

              {/* Favorite table */}
              {floorPlanEnabled && (
                <TableCell className="py-2.5">
                  {guest.favorite_table ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-foreground font-medium">
                      {guest.favorite_table}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </TableCell>
              )}

              {/* Tags */}
              <TableCell className="py-2.5">
                <div className="flex flex-wrap gap-1">
                  {guest.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full font-medium border"
                      style={{ backgroundColor: tag.color + "15", color: tag.color, borderColor: tag.color + "30" }}
                    >
                      {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                      {tag.name}
                    </span>
                  ))}
                  {guest.tags.length > 3 && (
                    <span className="text-[9px] px-1 py-0.5 rounded-full text-muted-foreground bg-muted">
                      +{guest.tags.length - 3}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Loyalty (mobile-visible duplicate) */}
              <TableCell className="py-2.5 sm:hidden">
                {loyaltyLabel && loyaltyVariant && (
                  <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium border ${loyaltyStyles[loyaltyVariant]}`}>
                    {loyaltyLabel}
                  </span>
                )}
              </TableCell>
              {/* Loyalty (desktop — hidden since it's inline with name) */}
              <TableCell className="py-2.5 hidden sm:table-cell">
                {loyaltyLabel && loyaltyVariant && (
                  <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium border ${loyaltyStyles[loyaltyVariant]}`}>
                    {loyaltyLabel}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
