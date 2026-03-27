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
import { MessageSquare, Ghost, AlertTriangle, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface CrmGuestTableProps {
  guests: CrmGuest[];
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
    email: "Email",
    table: "Τραπέζι",
    notes: "Σημειώσεις",
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
    email: "Email",
    table: "Table",
    notes: "Notes",
    never: "Never",
    ghost: "Ghost",
  },
};

function getLoyaltyLevel(visits: number): { label: string; emoji: string; variant: "platinum" | "gold" | "silver" | "bronze" } | null {
  if (visits >= 20) return { label: "Platinum", emoji: "💎", variant: "platinum" };
  if (visits >= 10) return { label: "Gold", emoji: "🥇", variant: "gold" };
  if (visits >= 5) return { label: "Silver", emoji: "🥈", variant: "silver" };
  if (visits >= 3) return { label: "Bronze", emoji: "🥉", variant: "bronze" };
  return null;
}

const loyaltyStyles = {
  platinum: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  gold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  silver: "bg-slate-400/15 text-slate-300 border-slate-400/30",
  bronze: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export function CrmGuestTable({ guests, onSelectGuest, floorPlanEnabled }: CrmGuestTableProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === "el" ? el : enUS;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-border/40">
          <TableHead className="min-w-[220px]">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.guest}</span>
          </TableHead>
          <TableHead className="text-center w-20">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.visits}</span>
          </TableHead>
          <TableHead className="min-w-[100px]">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.lastVisit}</span>
          </TableHead>
          <TableHead className="text-right w-24">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.spend}</span>
          </TableHead>
          <TableHead className="text-center w-20 whitespace-nowrap">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.noShows}</span>
          </TableHead>
          {floorPlanEnabled && (
            <TableHead className="min-w-[80px]">
              <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.table}</span>
            </TableHead>
          )}
          <TableHead className="min-w-[120px]">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.notes}</span>
          </TableHead>
          <TableHead className="min-w-[120px]">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.tags}</span>
          </TableHead>
          <TableHead className="min-w-[140px]">
            <span className="text-[11px] tracking-wide font-medium text-muted-foreground">{t.email}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {guests.map((guest) => {
          const loyalty = getLoyaltyLevel(guest.total_visits);
          const loyaltyVariant = guest.vip_level_override
            ? (guest.vip_level_override as "platinum" | "gold" | "silver" | "bronze")
            : loyalty?.variant;
          const loyaltyEmoji = guest.vip_level_override
            ? guest.vip_level_override === "platinum"
              ? "💎"
              : guest.vip_level_override === "gold"
                ? "🥇"
                : guest.vip_level_override === "silver"
                  ? "🥈"
                  : "🥉"
            : loyalty?.emoji;

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
              <TableCell className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar className={`h-8 w-8 flex-shrink-0 ring-1 ${isGhost ? "ring-muted-foreground/30" : "ring-primary/30"}`}>
                    <AvatarFallback className={`text-[10px] font-medium ${isGhost ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                      {isGhost ? <Ghost className="h-3.5 w-3.5" /> : initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground whitespace-normal break-words">{guest.guest_name}</span>
                      {loyaltyEmoji && loyaltyVariant && (
                        <span
                          className={`hidden sm:inline-flex items-center justify-center text-[11px] px-1.5 py-0.5 rounded-full font-medium border ${loyaltyStyles[loyaltyVariant]}`}
                          title={guest.vip_level_override || loyalty?.label || undefined}
                        >
                          {loyaltyEmoji}
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
                      {guest.phone && (
                        <span className="text-[10px] text-muted-foreground truncate">{guest.phone}</span>
                      )}
                      {guest.email && !guest.phone && (
                        <span className="text-[10px] text-muted-foreground truncate">{guest.email}</span>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-center py-2.5">
                <span className="text-sm font-semibold text-foreground">{guest.total_visits}</span>
              </TableCell>

              <TableCell className="py-2.5">
                <span className="text-xs text-muted-foreground">
                  {guest.last_visit
                    ? formatDistanceToNow(new Date(guest.last_visit), { addSuffix: true, locale })
                    : t.never}
                </span>
              </TableCell>

              <TableCell className="text-right py-2.5">
                <span className="text-sm font-medium text-foreground">
                  €{(guest.total_spend_cents / 100).toFixed(0)}
                </span>
              </TableCell>

              <TableCell className="text-center py-2.5">
                <span className={`text-sm ${guest.total_no_shows >= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {guest.total_no_shows}
                </span>
              </TableCell>

              {floorPlanEnabled && (
                <TableCell className="py-2.5">
                  {guest.total_visits > 0 && guest.favorite_table ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-foreground font-medium">
                      {guest.favorite_table}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </TableCell>
              )}

              <TableCell className="py-2.5">
                {guest.pinned_notes.length > 0 ? (
                  <div className="space-y-1 max-w-[160px]">
                    {guest.pinned_notes.slice(0, 2).map((n) => (
                      <div key={n.id} className="flex items-start gap-1 text-[9px]">
                        {n.is_alert ? (
                          <AlertTriangle className="h-2.5 w-2.5 text-destructive flex-shrink-0 mt-0.5" />
                        ) : (
                          <Pin className="h-2.5 w-2.5 text-primary flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`truncate ${n.is_alert ? "text-destructive font-medium" : "text-foreground"}`}>
                          {n.content}
                        </span>
                      </div>
                    ))}
                    {guest.pinned_notes.length > 2 && (
                      <span className="text-[8px] text-muted-foreground">+{guest.pinned_notes.length - 2}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </TableCell>

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

              <TableCell className="py-2.5">
                {guest.email ? (
                  <span className="text-xs text-muted-foreground block max-w-[180px]">{guest.email}</span>
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
