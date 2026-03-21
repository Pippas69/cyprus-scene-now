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

function getLoyaltyLevel(visits: number, spendCents: number): { label: string; emoji: string; color: string } | null {
  if (visits >= 20 && spendCents >= 100000) return { label: "Platinum", emoji: "💎", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" };
  if (visits >= 10 && spendCents >= 50000) return { label: "Gold", emoji: "🥇", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" };
  if (visits >= 5 && spendCents >= 20000) return { label: "Silver", emoji: "🥈", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
  if (visits >= 3) return { label: "Bronze", emoji: "🥉", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" };
  return null;
}

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
        <TableRow className="hover:bg-transparent">
          <TableHead className="cursor-pointer select-none min-w-[160px]" onClick={() => onSort("guest_name")}>
            <div className="flex items-center gap-1">
              {t.guest}
              <SortIcon field="guest_name" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none text-center w-20" onClick={() => onSort("total_visits")}>
            <div className="flex items-center justify-center gap-1">
              {t.visits}
              <SortIcon field="total_visits" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none min-w-[100px]" onClick={() => onSort("last_visit")}>
            <div className="flex items-center gap-1">
              {t.lastVisit}
              <SortIcon field="last_visit" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none text-right w-24" onClick={() => onSort("total_spend_cents")}>
            <div className="flex items-center justify-end gap-1">
              {t.spend}
              <SortIcon field="total_spend_cents" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          <TableHead className="cursor-pointer select-none text-center w-20" onClick={() => onSort("total_no_shows")}>
            <div className="flex items-center justify-center gap-1">
              {t.noShows}
              <SortIcon field="total_no_shows" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
          {floorPlanEnabled && (
            <TableHead className="min-w-[80px]">{t.table}</TableHead>
          )}
          <TableHead className="min-w-[120px]">{t.tags}</TableHead>
          <TableHead className="w-24">{t.loyalty}</TableHead>
          <TableHead className="cursor-pointer select-none text-center w-16" onClick={() => onSort("internal_rating")}>
            <div className="flex items-center justify-center gap-1">
              <Star className="h-3 w-3" />
              <SortIcon field="internal_rating" currentField={sortField} dir={sortDir} />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {guests.map((guest) => {
          const loyalty = getLoyaltyLevel(guest.total_visits, guest.total_spend_cents);
          const initials = guest.guest_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <TableRow
              key={guest.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSelectGuest(guest)}
            >
              {/* Guest name */}
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{guest.guest_name}</span>
                      {guest.profile_type === "ghost" && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
                          {t.ghost}
                        </Badge>
                      )}
                      {guest.notes_count > 0 && (
                        <MessageSquare className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    {guest.phone && (
                      <p className="text-[10px] text-muted-foreground truncate">{guest.phone}</p>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Visits */}
              <TableCell className="text-center">
                <span className="text-sm font-semibold text-foreground">{guest.total_visits}</span>
              </TableCell>

              {/* Last visit */}
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {guest.last_visit
                    ? formatDistanceToNow(new Date(guest.last_visit), { addSuffix: true, locale })
                    : t.never}
                </span>
              </TableCell>

              {/* Spend */}
              <TableCell className="text-right">
                <span className="text-sm font-medium text-foreground">
                  €{(guest.total_spend_cents / 100).toFixed(0)}
                </span>
              </TableCell>

              {/* No-shows */}
              <TableCell className="text-center">
                <span className={`text-sm ${guest.total_no_shows >= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {guest.total_no_shows}
                </span>
              </TableCell>

              {/* Favorite table */}
              {floorPlanEnabled && (
                <TableCell>
                  {guest.favorite_table ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {guest.favorite_table}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </TableCell>
              )}

              {/* Tags */}
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {guest.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag.id}
                      className="text-[9px] px-1.5 py-0 h-4 font-normal"
                      style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color + "40" }}
                      variant="outline"
                    >
                      {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                      {tag.name}
                    </Badge>
                  ))}
                  {guest.tags.length > 3 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
                      +{guest.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>

              {/* Loyalty */}
              <TableCell>
                {(guest.vip_level_override || loyalty) && (
                  <Badge className={`text-[10px] px-1.5 py-0 h-5 font-normal ${loyalty?.color || "bg-primary/10 text-primary"}`} variant="outline">
                    {guest.vip_level_override
                      ? `${guest.vip_level_override === "platinum" ? "💎" : guest.vip_level_override === "gold" ? "🥇" : guest.vip_level_override === "silver" ? "🥈" : "🥉"} ${guest.vip_level_override}`
                      : loyalty
                      ? `${loyalty.emoji} ${loyalty.label}`
                      : ""}
                  </Badge>
                )}
              </TableCell>

              {/* Rating */}
              <TableCell className="text-center">
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
