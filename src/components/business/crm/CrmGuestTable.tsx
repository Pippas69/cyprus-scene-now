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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUpDown, ArrowUp, ArrowDown, Star, MessageSquare } from "lucide-react";
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
    rating: "Βαθμός",
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
    rating: "Rating",
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
  if (field !== currentField) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

export function CrmGuestTable({ guests, sortField, sortDir, onSort, onSelectGuest, floorPlanEnabled }: CrmGuestTableProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-border/50">
          <TableHead className="cursor-pointer select-none min-w-[160px]" onClick={() => onSort("guest_name")}>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {t.guest}
              <SortIcon field="guest_name" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none text-center w-20" onClick={() => onSort("total_visits")}>
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {t.visits}
              <SortIcon field="total_visits" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none min-w-[100px]" onClick={() => onSort("last_visit")}>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {t.lastVisit}
              <SortIcon field="last_visit" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none text-right w-24" onClick={() => onSort("total_spend_cents")}>
            <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {t.spend}
              <SortIcon field="total_spend_cents" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none text-center w-20" onClick={() => onSort("total_no_shows")}>
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {t.noShows}
              <SortIcon field="total_no_shows" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          {floorPlanEnabled && (
            <TableHead className="min-w-[80px] text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t.table}</TableHead>
          )}
          <TableHead className="min-w-[120px] text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t.tags}</TableHead>
          <TableHead className="w-24 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t.loyalty}</TableHead>
          <TableHead className="cursor-pointer select-none text-center w-16" onClick={() => onSort("internal_rating")}>
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <Star className="h-3 w-3" />
              <SortIcon field="internal_rating" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
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

          return (
            <TableRow
              key={guest.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors border-border/30"
              onClick={() => onSelectGuest(guest)}
            >
              {/* Guest name */}
              <TableCell className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 flex-shrink-0 ring-1 ring-border/50">
                    <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{guest.guest_name}</span>
                      {guest.profile_type === "ghost" && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {t.ghost}
                        </span>
                      )}
                      {guest.notes_count > 0 && (
                        <MessageSquare className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>
                    {guest.phone && (
                      <p className="text-[10px] text-muted-foreground truncate">{guest.phone}</p>
                    )}
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

              {/* Loyalty */}
              <TableCell className="py-2.5">
                {loyaltyLabel && loyaltyVariant && (
                  <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium border ${loyaltyStyles[loyaltyVariant]}`}>
                    {loyaltyLabel}
                  </span>
                )}
              </TableCell>

              {/* Rating */}
              <TableCell className="text-center py-2.5">
                {guest.internal_rating ? (
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">{guest.internal_rating}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
